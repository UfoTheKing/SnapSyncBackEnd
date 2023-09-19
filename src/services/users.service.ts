import { DB_DATABASE, S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { MulterUploadFile } from '@/interfaces/auth.interface';
import { Biography, BiographyEntity } from '@/interfaces/user_profile.interface';
import { BlockedUsers } from '@/models/blocked_users.model';
import { AVATAR_SIZE } from '@/utils/costants';
import { generateRandomKey } from '@/utils/util';
import {
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException } from '@exceptions/HttpException';
import { SmallUser, User } from '@interfaces/users.interface';
import { Users } from '@models/users.model';
import sizeOf from 'image-size';
import sharp from 'sharp';
import { boolean } from 'boolean';
import knex from '@/databases';
import { UsersContacts } from '@/models/users_contacts.model';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

class UserService {
  public async findAllUser(): Promise<User[]> {
    const users: User[] = await Users.query().whereNotDeleted();
    return users;
  }

  public async findUserById(userId: number): Promise<User> {
    const findUser: User = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    return findUser;
  }

  public async findUserByUsername(username: string): Promise<User> {
    const findUser: User = await Users.query().whereNotDeleted().findOne({ username });
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    return findUser;
  }

  public async findUserByPhoneNumber(phoneNumber: string): Promise<User> {
    const findUser: User = await Users.query().whereNotDeleted().findOne({ phoneNumber });
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    return findUser;
  }

  public async findSmallUserById(userId: number, includeSocialContext: boolean = false): Promise<SmallUser> {
    let findUser: User = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    let profilePictureUrl: string = await this.findUserProfilePictureUrlById(userId);
    let socialContext: string | undefined = undefined;

    if (includeSocialContext) {
      // Mi faccio tornare il SocialContext
    }

    let user: SmallUser = {
      id: findUser.id,
      username: findUser.username,
      fullName: findUser.fullName,
      isVerified: boolean(findUser.isVerified),
      profilePictureUrl: profilePictureUrl,

      socialContext: socialContext,
    };

    return user;
  }

  public async findUserProfilePictureUrlById(userId: number): Promise<string> {
    const findOneUserData = await Users.query().whereNotDeleted().findById(userId);
    if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

    let params: GetObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: findOneUserData.profilePicImageKey,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return url;
  }

  public async findUserProfileBiographyById(userId: number, loggedUserId: number): Promise<Biography | null> {
    const findOneUserData = await Users.query().whereNotDeleted().findById(userId);
    if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

    if (findOneUserData.biography) {
      const words = findOneUserData.biography.split(' ');

      let entities: BiographyEntity[] = [];

      await Promise.all(
        words.map(async word => {
          if (word.startsWith('@')) {
            // Username
            let username = word.substring(1);

            try {
              let user = await this.findUserByUsername(username);

              let blockedUser = await BlockedUsers.query().whereNotDeleted().where('userId', user.id).andWhere('blockedUserId', loggedUserId).first();
              if (blockedUser) return;

              entities.push({
                type: 'user',
                id: user.id,
                text: user.username,
              });
            } catch (error) {
              // Non esiste l'utente, non faccio nulla
              return;
            }
          }
        }),
      );

      let biography: Biography = {
        rawText: findOneUserData.biography,
        entities: entities,
      };

      return biography;
    }

    return null;
  }

  public async findUsersExcludingBlockedUsersByUserId(
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
    excludeUsersIds: Array<number> = [],
  ): Promise<{
    users: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const StoredProcedureName = `${DB_DATABASE}.GetUsersList`;

    // Converto l'array in una stringa con gli id separati da virgola
    let excludeUsersIdsString = excludeUsersIds.join(',');

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(
      `CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null}, '${excludeUsersIdsString}')`,
    );

    let responseResults: Array<User> = [];
    let usersCount = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        usersCount = results[0][0][0].count;
      }
    }

    let users: Array<SmallUser> = [];

    if (responseResults.length > 0) {
      for (let i = 0; i < responseResults.length; i++) {
        let us = await new UserService().findSmallUserById(responseResults[i].id);
        users.push(us);
      }
    }

    return {
      users,
      pagination: {
        page: page,
        size: count,
        total: usersCount,
        hasMore: page * count < usersCount,
      },
    };
  }

  public async updateUserAvatar(userId: number, data: MulterUploadFile): Promise<User> {
    if (!data.buffer) throw new HttpException(400, 'Missing avatar');
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    // Faccio l'upload dell'immagine del profilo
    const originalHeight = sizeOf(data.path).height;
    const originalWidth = sizeOf(data.path).width;
    if (!originalHeight || !originalWidth) throw new HttpException(400, 'Invalid image');

    // Salvo l'immagine nella cartella uploads/avatars
    const key = `avatars/${generateRandomKey()}`;
    if (originalHeight !== AVATAR_SIZE || originalWidth !== AVATAR_SIZE) {
      const resizedImageWithoutAlpha = await sharp(data.buffer).resize(AVATAR_SIZE, AVATAR_SIZE).withMetadata().toBuffer();

      const params: PutObjectCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: resizedImageWithoutAlpha,
        ContentType: data.mimetype,
      };

      const command = new PutObjectCommand(params);
      const dataS3: PutObjectCommandOutput = await s3.send(command);
      if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
        throw new HttpException(500, 'Ops! Something went wrong. Please try again later.');
    } else {
      const params: PutObjectCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: data.buffer,
        ContentType: data.mimetype,
      };

      const command = new PutObjectCommand(params);
      const dataS3: PutObjectCommandOutput = await s3.send(command);
      if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
        throw new HttpException(500, 'Ops! Something went wrong. Please try again later.');
    }

    // Aggiorno il campo profilePicImageKey
    const updatedUser = await Users.query().whereNotDeleted().patchAndFetchById(userId, {
      profilePicImageKey: key,

      updatedAt: new Date(),
    });

    return updatedUser;
  }

  public async updateIsPrivate(id: number, isPrivate: boolean): Promise<User> {
    const findUser = await Users.query().whereNotDeleted().findById(id);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const updateUser: User = await Users.query().updateAndFetchById(findUser.id, {
      isPrivate: isPrivate,

      updatedAt: new Date(),
    });

    return updateUser;
  }

  public async updateUserUsername(userId: number, username: string): Promise<User> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const usernameLowerCase = username.toLowerCase().trim();
    if (usernameLowerCase === findUser.username) throw new HttpException(400, 'You cannot use your current username');

    const findUserWithSameUsername = await Users.query().whereNotDeleted().findOne({ username: usernameLowerCase });
    if (findUserWithSameUsername) throw new HttpException(409, `Username ${usernameLowerCase} already exists`);

    const updatedUser = await Users.query().whereNotDeleted().patchAndFetchById(userId, {
      username,

      updatedAt: new Date(),
    });

    return updatedUser;
  }

  public async updateUserFullName(userId: number, fullName: string): Promise<User> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const updatedUser = await Users.query().whereNotDeleted().patchAndFetchById(userId, {
      fullName,

      updatedAt: new Date(),
    });

    return updatedUser;
  }

  public async updateUserBiography(userId: number, biography: string | null): Promise<User> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const updatedUser = await Users.query()
      .whereNotDeleted()
      .patchAndFetchById(userId, {
        biography: biography ? (biography.length > 0 ? biography : null) : null,

        updatedAt: new Date(),
      });

    return updatedUser;
  }
}

export default UserService;
