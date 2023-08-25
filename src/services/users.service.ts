import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { Biography, BiographyEntity } from '@/interfaces/user_profile.interface';
import { BlockedUsers } from '@/models/blocked_users.model';
import { GetObjectCommand, GetObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { Users } from '@models/users.model';

const s3 = new S3Client({ 
  credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY
  },
  region: S3_BUCKET_REGION
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

  public async findUserProfilePictureUrlById(userId: number): Promise<string | null> {
    const findOneUserData = await Users.query().whereNotDeleted().findById(userId);
    if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

    if (findOneUserData.profilePicImageKey) {
      let params: GetObjectCommandInput = {
          Bucket: S3_BUCKET_NAME,
          Key: findOneUserData.profilePicImageKey,
      }

      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return url;
    }

    return null;

  }

  public async findUserProfileBiographyById(userId: number, loggedUserId: number): Promise<Biography | null> {
    const findOneUserData = await Users.query().whereNotDeleted().findById(userId);
    if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

    if (findOneUserData.biography) {
      const words = findOneUserData.biography.split(' ');

      let entities: BiographyEntity[] = [];

      await Promise.all(words.map(async (word) => {
        if (word.startsWith('@')) {
          // Username
          let username = word.substring(1);

          try {
            let user = await this.findUserByUsername(username);

            let blockedUser = await BlockedUsers.query().whereNotDeleted().where('userId', findOneUserData.id).andWhere('blockedUserId', user.id).first();
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
      }));

      let biography: Biography = {
        rawText: findOneUserData.biography,
        entities: entities,
      }

      return biography;
    }

    return null;
  }
}

    

export default UserService;
