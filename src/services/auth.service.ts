import { sign } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { DataStoredInToken, LogInResponse, TokenData } from '@interfaces/auth.interface';
import { User } from '@interfaces/users.interface';
import { Users } from '@models/users.model';
import { isEmpty } from '@utils/util';
import { phone } from 'phone';
import { MAX_USER_DEVICES, MIN_AGE } from '@/utils/costants';
import { AuthDto, LogInDto, LogInPhoneNumberDto, LogInWithAuthTokenDto, SignUpDto } from '@/dtos/auth.dto';
import { Device } from '@/interfaces/devices.interface';
import { UserDevice } from '@/interfaces/users_devices.interface';
import { Devices } from '@/models/devices.model';
import { v4 as uuidv4 } from 'uuid';
import { UsersDevices } from '@/models/users_devices.model';
import sha256 from 'crypto-js/sha256';
import { AuthTokens } from '@/models/auth_tokens.model';
import { boolean } from 'boolean';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  GetObjectCommandInput,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ExpoPushTokens } from '@/models/expo_push_tokens.model';
import UserService from './users.service';
import { AuthUsers } from '@/models/auth_users.model';
import sizeOf from 'image-size';
import sharp from 'sharp';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

class AuthService {
  public validateDateOfBirth = async (yearOfBirth: number, monthOfBirth: number, dayOfBirth: number): Promise<boolean> => {
    /**
     * YYYY -> 2010
     * MM -> 3 -> L'utente ha messo marzo
     * DD -> 20
     */
    // Convero la data
    const dateOfBirth: Date = new Date(yearOfBirth, monthOfBirth - 1, dayOfBirth, 20, 12, 12, 12); // Metto un orario fisso per evitare problemi con il fuso orario

    // Controllo se la data di nascita è valida: prima di oggi e dopo 1900
    if (dateOfBirth.getTime() > Date.now() || dateOfBirth.getFullYear() < 1900)
      throw new HttpException(400, 'Invalid date of birth. Please enter a date of birth before today and after 1900');

    // Controllo se la data di nascita è valida
    if (dateOfBirth.getFullYear() !== parseInt(yearOfBirth.toString())) {
      throw new HttpException(400, 'Year of birth is invalid');
    }
    if (dateOfBirth.getMonth() !== parseInt(monthOfBirth.toString()) - 1) {
      throw new HttpException(400, 'Month of birth is invalid');
    }
    if (dateOfBirth.getDate() !== parseInt(dayOfBirth.toString())) {
      throw new HttpException(400, 'Day of birth is invalid');
    }

    const today: Date = new Date();
    const age: number = today.getFullYear() - dateOfBirth.getFullYear();
    if (age < MIN_AGE) throw new HttpException(400, `You must be at least ${MIN_AGE} years old to register`);

    // L'utente ha 13 anni o più
    if (age === MIN_AGE) {
      // Devo controllare se il mese di nascita è minore di quello attuale
      if (dateOfBirth.getMonth() > today.getMonth()) throw new HttpException(400, `You must be at least ${MIN_AGE} years old to register`);

      // Se il mese di nascita è uguale a quello attuale, devo controllare se il giorno di nascita è minore di quello attuale
      if (dateOfBirth.getMonth() === today.getMonth() && dateOfBirth.getDate() > today.getDate())
        throw new HttpException(400, `You must be at least ${MIN_AGE} years old to register`);
    }

    return true;
  };

  public validatePhoneNumber = async (phoneNumber: string): Promise<boolean> => {
    if (!phoneNumber) throw new HttpException(422, 'Phone number is required');

    const phoneResults = phone(phoneNumber);
    if (!phoneResults.isValid) throw new HttpException(422, 'Phone number is not valid');

    return true;
  };

  public validateOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
    if (!phoneNumber) throw new HttpException(422, 'Phone number is required');
    if (!otp) throw new HttpException(422, 'OTP is required');

    const phoneResults = phone(phoneNumber);
    if (!phoneResults.isValid) throw new HttpException(422, 'Phone number is not valid');

    // TODO: controllare se l'OTP è valido

    return true;
  };

  public loginWithPhoneNumber = async (data: LogInPhoneNumberDto, device: Device | null): Promise<LogInResponse> => {
    if (isEmpty(data)) throw new HttpException(400, 'Missing data');

    // Controllo se l'utente esiste
    const findUserByPhoneNumber = await Users.query().whereNotDeleted().where('phoneNumber', data.phoneNumber).first();
    if (!findUserByPhoneNumber) throw new HttpException(404, 'User not found');

    const trx = await AuthTokens.startTransaction();

    var createdUserDevice: UserDevice;
    var createDevice: Device;

    var tokenData: TokenData = this.createToken(findUserByPhoneNumber);

    const selector = uuidv4();
    const plainTextValidator = uuidv4();
    const hashedValidator = await sha256(plainTextValidator).toString();
    var accessToken: string = `${selector}:${plainTextValidator}`;

    try {
      if (device) createDevice = await Devices.query(trx).whereNotDeleted().findById(device.id);
      else {
        createDevice = await Devices.query(trx).insert({
          uuid: uuidv4(),
        });
      }

      const findUserDevice = await UsersDevices.query(trx)
        .whereNotDeleted()
        .where('userId', findUserByPhoneNumber.id)
        .where('deviceId', createDevice.id)
        .first();
      if (findUserDevice) createdUserDevice = findUserDevice;
      else {
        createdUserDevice = await UsersDevices.query(trx).insert({
          userId: findUserByPhoneNumber.id,
          deviceId: createDevice.id,
        });
      }

      await AuthTokens.query(trx).insert({
        selector: selector,
        hashedValidator: hashedValidator,

        userId: findUserByPhoneNumber.id,
        deviceId: createDevice.id,
        userDeviceId: createdUserDevice.id,

        lastUsedAt: new Date(),
      });

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    let profilePictureUrl: string | null = await new UserService().findUserProfilePictureUrlById(findUserByPhoneNumber.id);

    let r: LogInResponse = {
      user: {
        id: findUserByPhoneNumber.id,
        username: findUserByPhoneNumber.username,
        biography: findUserByPhoneNumber.biography,
        profilePictureUrl: profilePictureUrl,
        isVerified: boolean(findUserByPhoneNumber.isVerified),
      },
      device: createDevice,
      accessToken: accessToken,
      tokenData: tokenData,
    };

    return r;
  };

  public validateUsername = async (username: string): Promise<boolean> => {
    const findUser = await Users.query().whereNotDeleted().where('username', username.toLocaleLowerCase().trim()).first();
    if (findUser) throw new HttpException(409, `${username} already exists`);

    return true;
  };

  public signup = async (data: SignUpDto, device: Device | null): Promise<LogInResponse> => {
    if (isEmpty(data)) throw new HttpException(400, 'Missing data');

    const authUser = await AuthUsers.query().whereNotDeleted().where('sessionId', data.sessionId).first();
    if (!authUser) throw new HttpException(404, 'Ops! Something went wrong');

    // Controllo se l'utente esiste già con lo stesso username
    const findUserByUsername = await Users.query().whereNotDeleted().where('username', authUser.username.toLocaleLowerCase().trim()).first();
    if (findUserByUsername) throw new HttpException(409, 'Username already exists');

    // Controllo se l'utente esiste già con lo stesso numero di telefono
    const findUserByPhoneNumber = await Users.query().whereNotDeleted().where('phoneNumber', authUser.phoneNumber).first();
    if (findUserByPhoneNumber) throw new HttpException(409, 'Phone number already exists');

    // Faccio l'upload dell'immagine del profilo
    const originalHeight = sizeOf(data.file.path).height;
    const originalWidth = sizeOf(data.file.path).width;
    if (!originalHeight || !originalWidth) throw new HttpException(400, 'Invalid image');

    // L'immagine deve essere quadrata 360x360
    const AVATAR_SIZE = 360;
    // Salvo l'immagine nella cartella uploads/avatars
    const key = `avatars/${this.generateRandomKey()}`;

    if (originalHeight !== AVATAR_SIZE || originalWidth !== AVATAR_SIZE) {
      const resizedImageWithoutAlpha = await sharp(data.file.path).resize(AVATAR_SIZE, AVATAR_SIZE).toBuffer();

      const params: PutObjectCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: resizedImageWithoutAlpha,
        ContentType: data.file.mimetype,
      };

      const command = new PutObjectCommand(params);
      const dataS3: PutObjectCommandOutput = await s3.send(command);
      if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
        throw new HttpException(500, 'Ops! Something went wrong. Please try again later.');
    } else {
      const params: PutObjectCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: data.file.buffer,
        ContentType: data.file.mimetype,
      };

      const command = new PutObjectCommand(params);
      const dataS3: PutObjectCommandOutput = await s3.send(command);
      if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
        throw new HttpException(500, 'Ops! Something went wrong. Please try again later.');
    }

    var createdUser: User;
    var createdUserDevice: UserDevice;
    var createDevice: Device;

    // Creo l'utente
    const trx = await Users.startTransaction();

    try {
      createdUser = await Users.query(trx).insert({
        username: authUser.username.toLocaleLowerCase().trim(),
        phoneNumber: authUser.phoneNumber,
        dateOfBirth: authUser.dateOfBirth,
        fullName: authUser.fullName,
        profilePicImageKey: key,
      });

      if (device) createDevice = await Devices.query(trx).whereNotDeleted().findById(device.id);
      else {
        createDevice = await Devices.query(trx).insert({
          uuid: uuidv4(),
        });
      }

      const findUserDevice = await UsersDevices.query(trx)
        .whereNotDeleted()
        .where('userId', createdUser.id)
        .where('deviceId', createDevice.id)
        .first();
      if (findUserDevice) createdUserDevice = findUserDevice;
      else {
        createdUserDevice = await UsersDevices.query(trx).insert({
          userId: createdUser.id,
          deviceId: createDevice.id,
        });
      }

      // Creo il token di autenticazione
      var tokenData: TokenData = this.createToken(createdUser);

      const selector = uuidv4();
      const plainTextValidator = uuidv4();
      const hashedValidator = await sha256(plainTextValidator).toString();
      var accessToken: string = `${selector}:${plainTextValidator}`;

      await AuthTokens.query(trx).insert({
        selector: selector,
        hashedValidator: hashedValidator,

        userId: createdUser.id,
        deviceId: createDevice.id,
        userDeviceId: createdUserDevice.id,

        lastUsedAt: new Date(),
      });

      await AuthUsers.query(trx).delete().where('sessionId', '=', data.sessionId);

      await trx.commit();

      let profilePictureUrl: string | null = await new UserService().findUserProfilePictureUrlById(createdUser.id);

      let r: LogInResponse = {
        user: {
          id: createdUser.id,
          username: createdUser.username,
          biography: createdUser.biography,
          profilePictureUrl: profilePictureUrl,
          isVerified: boolean(createdUser.isVerified),
        },
        device: createDevice,
        accessToken: accessToken,
        tokenData: tokenData,
      };

      return r;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  };

  public signUpOrLogIn = async (data: AuthDto, device: Device | null): Promise<LogInResponse> => {
    if (isEmpty(data)) throw new HttpException(400, 'Missing data');

    // Controllo se l'utente esiste
    const findUserByUsername = await Users.query().whereNotDeleted().where('username', data.username.toLocaleLowerCase().trim()).first();
    if (!findUserByUsername) {
      // L'utente deve aver inserito yearOfBirth, monthOfBirth, dayOfBirth ed il phoneNumber
      if (!data.yearOfBirth) throw new HttpException(422, 'Year of birth is required');
      if (!data.monthOfBirth) throw new HttpException(422, 'Month of birth is required');
      if (!data.dayOfBirth) throw new HttpException(422, 'Day of birth is required');

      if (isNaN(data.yearOfBirth) || isNaN(data.monthOfBirth) || isNaN(data.dayOfBirth)) throw new HttpException(400, 'Invalid date of birth');

      const isValidDateOfBirth = await this.validateDateOfBirth(data.yearOfBirth, data.monthOfBirth, data.dayOfBirth);
      if (!isValidDateOfBirth) throw new HttpException(400, 'Date of birth is not valid');
      const dateOfBirth: Date = new Date(data.yearOfBirth, data.monthOfBirth - 1, data.dayOfBirth, 20, 12, 12, 12); // Metto un orario fisso per evitare problemi con il fuso orario

      // Controllo se il numero di telefono è valido
      if (!data.phoneNumber) throw new HttpException(422, 'Phone number is required');
      const phoneResults = phone(data.phoneNumber);
      if (!phoneResults.isValid) throw new HttpException(400, 'Invalid phone number');

      // Controllo se questo numero di telefono è già stato usato
      const findUserByPhoneNumber = await Users.query().whereNotDeleted().where('phoneNumber', phoneResults.phoneNumber).first();

      // Controllo se l'utente ha inserito il codice di verifica del numero di telefono
      if (!data.phoneNumberVerificationCode) throw new HttpException(422, 'Phone number verification code is required');

      // TODO: controllare se il codice di verifica del numero di telefono è valido

      // Creo l'utente
      const trx = await Users.startTransaction();

      var createdUser: User;
      var createdUserDevice: UserDevice;
      var createDevice: Device;
      var tokenData: TokenData;
      var accessToken: string;

      try {
        if (findUserByPhoneNumber) {
          createdUser = findUserByPhoneNumber;
        } else {
          createdUser = await Users.query(trx).insert({
            username: data.username.toLocaleLowerCase().trim(),
            phoneNumber: phoneResults.phoneNumber,
            dateOfBirth: dateOfBirth,
          });
        }

        if (device) createDevice = await Devices.query(trx).whereNotDeleted().findById(device.id);
        else {
          createDevice = await Devices.query(trx).insert({
            uuid: uuidv4(),
          });
        }

        const findUserDevice = await UsersDevices.query(trx)
          .whereNotDeleted()
          .where('userId', createdUser.id)
          .where('deviceId', createDevice.id)
          .first();
        if (findUserDevice) createdUserDevice = findUserDevice;
        else {
          createdUserDevice = await UsersDevices.query(trx).insert({
            userId: createdUser.id,
            deviceId: createDevice.id,
          });
        }

        // Creo il token di autenticazione
        tokenData = this.createToken(createdUser);

        const selector = uuidv4();
        const plainTextValidator = uuidv4();
        const hashedValidator = await sha256(plainTextValidator).toString();
        accessToken = `${selector}:${plainTextValidator}`;

        await AuthTokens.query(trx).insert({
          selector: selector,
          hashedValidator: hashedValidator,

          userId: createdUser.id,
          deviceId: createDevice.id,
          userDeviceId: createdUserDevice.id,

          lastUsedAt: new Date(),
        });

        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }

      let r: LogInResponse = {
        user: {
          id: createdUser.id,
          username: createdUser.username,
          biography: createdUser.biography,
          profilePictureUrl: null,
          isVerified: boolean(createdUser.isVerified),
        },
        device: createDevice,
        accessToken: accessToken,
        tokenData: tokenData,
      };

      return r;
    } else {
      // L'utente esiste: devo solo controllare se ha inserito il codice di verifica del numero di telefono
      if (!data.phoneNumberVerificationCode) throw new HttpException(422, 'Phone number verification code is required');

      // TODO: controllare se il codice di verifica del numero di telefono è valido

      const trx = await AuthTokens.startTransaction();

      var createdUser: User;
      var createdUserDevice: UserDevice;
      var createDevice: Device;

      var tokenData: TokenData = this.createToken(findUserByUsername);

      const selector = uuidv4();
      const plainTextValidator = uuidv4();
      const hashedValidator = await sha256(plainTextValidator).toString();
      var accessToken: string = `${selector}:${plainTextValidator}`;

      try {
        if (device) createDevice = await Devices.query(trx).whereNotDeleted().findById(device.id);
        else {
          createDevice = await Devices.query(trx).insert({
            uuid: uuidv4(),
          });
        }

        const findUserDevice = await UsersDevices.query(trx)
          .whereNotDeleted()
          .where('userId', findUserByUsername.id)
          .where('deviceId', createDevice.id)
          .first();
        if (findUserDevice) createdUserDevice = findUserDevice;
        else {
          createdUserDevice = await UsersDevices.query(trx).insert({
            userId: findUserByUsername.id,
            deviceId: createDevice.id,
          });
        }

        await AuthTokens.query(trx).insert({
          selector: selector,
          hashedValidator: hashedValidator,

          userId: findUserByUsername.id,
          deviceId: createDevice.id,
          userDeviceId: createdUserDevice.id,

          lastUsedAt: new Date(),
        });

        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }

      let profilePictureUrl: string | null = null;
      if (findUserByUsername.profilePicImageKey) {
        let params: GetObjectCommandInput = {
          Bucket: S3_BUCKET_NAME,
          Key: findUserByUsername.profilePicImageKey,
        };

        const command = new GetObjectCommand(params);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        profilePictureUrl = url;
      }

      let r: LogInResponse = {
        user: {
          id: findUserByUsername.id,
          username: findUserByUsername.username,
          biography: findUserByUsername.biography,
          profilePictureUrl: profilePictureUrl,
          isVerified: boolean(findUserByUsername.isVerified),
        },
        device: createDevice,
        accessToken: accessToken,
        tokenData: tokenData,
      };

      return r;
    }
  };

  public sendOtp = async (phoneNumber: string): Promise<string> => {
    if (!phoneNumber) throw new HttpException(422, 'Phone number is required');

    const phoneResults = phone(phoneNumber);
    if (!phoneResults.isValid) throw new HttpException(422, 'Phone number is not valid');

    // TODO: send OTP con twilio

    let message = `Enter the code we sent to ${phoneNumber}`;

    return message;
  };

  public async loginWithAuthToken(userData: LogInWithAuthTokenDto, device: Device): Promise<LogInResponse> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const selector = userData.authToken.split(':')[0];
    const plainTextValidator = userData.authToken.split(':')[1];

    const findAuthToken = await AuthTokens.query().findOne({ selector: selector });
    if (!findAuthToken) throw new HttpException(401, 'Invalid credentials');

    const hashedValidator = await sha256(plainTextValidator).toString();
    if (findAuthToken.hashedValidator !== hashedValidator) {
      // il validator non corrisponde: elimino tutti gli authToken associati a questo utente
      await AuthTokens.query().delete().where('userId', '=', findAuthToken.userId);

      // Elimino l'ExpoPushToken associato a questo utente con questo device
      await ExpoPushTokens.query().delete().where('userId', '=', findAuthToken.userId).where('deviceId', '=', device.id);

      throw new HttpException(401, 'Invalid credentials');
    }

    // Controllo se l'authToken è associato a questo device
    if (findAuthToken.deviceId !== device.id) throw new HttpException(401, 'Invalid credentials');

    const findUserDevice = await UsersDevices.query().whereNotDeleted().findById(findAuthToken.userDeviceId);
    if (!findUserDevice) throw new HttpException(401, 'Invalid credentials');
    if (findUserDevice.userId !== findAuthToken.userId) throw new HttpException(401, 'Invalid credentials');
    if (findUserDevice.deviceId !== device.id) throw new HttpException(401, 'Invalid credentials');

    const findUser = await Users.query().whereNotDeleted().findById(findAuthToken.userId);
    if (!findUser) throw new HttpException(401, 'Invalid credentials');

    const findDevice = await Devices.query().whereNotDeleted().findById(findAuthToken.deviceId);
    if (!findDevice) throw new HttpException(401, 'Invalid credentials');

    const tokenData = this.createToken(findUser);

    // Aggiorno l'authToken con un nuovo validator
    const oldSelector = findAuthToken.selector;
    const newPlainTextValidator = uuidv4();
    const newHashedValidator = await sha256(newPlainTextValidator).toString();

    await AuthTokens.query().patchAndFetchById(findAuthToken.id, {
      hashedValidator: newHashedValidator,

      lastUsedAt: new Date(),
    });

    const accessToken = `${oldSelector}:${newPlainTextValidator}`;

    let profilePictureUrl: string | null = null;
    if (findUser.profilePicImageKey) {
      let params: GetObjectCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: findUser.profilePicImageKey,
      };

      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      profilePictureUrl = url;
    }

    let LogInResponse: LogInResponse = {
      user: {
        id: findUser.id,
        username: findUser.username,
        biography: findUser.biography,
        profilePictureUrl: profilePictureUrl,
        isVerified: boolean(findUser.isVerified),
      },
      accessToken: accessToken,
      tokenData: tokenData,
      device: findDevice,
    };

    return LogInResponse;
  }

  public async logout(userData: User, device?: Device | null): Promise<void> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    let userDevice: UserDevice | null = null;
    if (device) {
      userDevice = await UsersDevices.query().whereNotDeleted().where('userId', userData.id).where('deviceId', device.id).first();
    }

    if (userDevice) {
      // Elimino l'authToken associato a questo userDevice
      // Elimino l'expoPushToken associato a questo userDevice
      await ExpoPushTokens.query().delete().where('userId', '=', userData.id).where('deviceId', '=', device.id);
    } else {
      // Devo eliminare tutti gli ExpoPushToken associati a questo utente
      await ExpoPushTokens.query().delete().where('userId', '=', userData.id);
    }
  }

  public createToken(user: User): TokenData {
    const dataStoredInToken: DataStoredInToken = { id: user.id };
    const secretKey: string = SECRET_KEY;
    const expiresIn: number = 60 * 60 * 24 * 7; // 7 days

    return { expiresIn, token: sign(dataStoredInToken, secretKey, { expiresIn }) };
  }

  public createCookie(tokenData: TokenData): string {
    return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn};`;
  }

  private generateRandomKey() {
    return Date.now() + '-' + Math.random().toString(36).substring(2, 15);
  }
}

export default AuthService;
