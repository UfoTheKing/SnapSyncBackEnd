import { NextFunction, Request, Response } from 'express';
import AuthService from '@services/auth.service';
import * as yup from 'yup';
import UserService from '@/services/users.service';
import { HttpException } from '@/exceptions/HttpException';
import { AuthDto, LogInPhoneNumberDto, LogInWithAuthTokenDto, SignUpDto } from '@/dtos/auth.dto';
import { RequestWithCountry, RequestWithDevice, RequestWithFile, RequestWithUser } from '@/interfaces/auth.interface';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
import { v4 as uuidv4 } from 'uuid';
import AuthUserService from '@/services/auth_users.service';
import { CreateAuthUserDto, UpdateAuthUserDto } from '@/dtos/auth_users.dto';
import moment from 'moment';

class AuthController {
  public authService = new AuthService();
  public userService = new UserService();
  public authUsersService = new AuthUserService();

  public getSessionId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = uuidv4();

      const data: CreateAuthUserDto = { sessionId: sessionId };

      await this.authUsersService.createAuthUser(data);

      res.status(200).json({ sessionId: sessionId, message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public validateFullname = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      fullname: yup
        .string()
        .required()
        .min(2)
        .max(100)
        .matches(/^[a-zA-Z\s]+$/, 'Fullname must contain only letters and spaces'),
      sessionId: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const findSession = await this.authUsersService.findAuthUserBySessionId(req.body.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      const data: UpdateAuthUserDto = {
        fullName: req.body.fullname,
        dateOfBirth: null,
        phoneNumber: null,
        isPhoneNumberVerified: false,
        username: null,
      };

      await this.authUsersService.updateAuthUser(findSession.id, data);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public validateDateOfBirth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      yearOfBirth: yup.number().required().min(1900).max(new Date().getFullYear()),
      monthOfBirth: yup.number().required().min(1).max(12),
      dayOfBirth: yup.number().required().min(1).max(31),
      sessionId: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const findSession = await this.authUsersService.findAuthUserBySessionId(req.body.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      const { yearOfBirth, monthOfBirth, dayOfBirth } = req.body;
      if (isNaN(yearOfBirth) || isNaN(monthOfBirth) || isNaN(dayOfBirth)) throw new HttpException(400, 'Invalid date of birth');

      await this.authService.validateDateOfBirth(yearOfBirth, monthOfBirth, dayOfBirth);

      const data: UpdateAuthUserDto = {
        fullName: findSession.fullName,
        dateOfBirth: `${yearOfBirth}-${monthOfBirth}-${dayOfBirth}`,
        phoneNumber: null,
        isPhoneNumberVerified: false,
        username: null,
      };

      await this.authUsersService.updateAuthUser(findSession.id, data);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public validatePhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      phoneNumber: yup.string().required(),
      sessionId: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const findSession = await this.authUsersService.findAuthUserBySessionId(req.body.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      const { phoneNumber } = req.body;

      await this.authService.validatePhoneNumber(phoneNumber);

      const data: UpdateAuthUserDto = {
        fullName: findSession.fullName,
        dateOfBirth: moment(findSession.dateOfBirth).format('YYYY-MM-DD'),
        phoneNumber: phoneNumber,
        isPhoneNumberVerified: false,
        username: null,
      };

      await this.authUsersService.updateAuthUser(findSession.id, data, true);

      // TODO: Invio OTP

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public validateOtp = async (req: RequestWithDevice, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      otp: yup.string().required(),
      sessionId: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const findSession = await this.authUsersService.findAuthUserBySessionId(req.body.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      const { otp } = req.body;

      const isValid = await this.authService.validateOtp(findSession.phoneNumber, otp);
      if (!isValid) throw new HttpException(400, 'Ops the code is not valid');

      const data: UpdateAuthUserDto = {
        fullName: findSession.fullName,
        dateOfBirth: moment(findSession.dateOfBirth).format('YYYY-MM-DD'),
        phoneNumber: findSession.phoneNumber,
        isPhoneNumberVerified: true,
        username: null,
      };

      await this.authUsersService.updateAuthUser(findSession.id, data, true);

      // Dal PhoneNumber controllo se esiste già un utente con lo stesso numero di telefono, se si allora faccio il login
      // altrimenti lo mando allo step successivo per la registrazione
      let userExists: boolean = false;
      try {
        await this.userService.findUserByPhoneNumber(findSession.phoneNumber);
        userExists = true;
      } catch (error) {
        if (error instanceof HttpException && error.status === 404) {
          userExists = false;
        } else {
          throw error;
        }
      }

      let response = {};

      if (userExists) {
        response['goNext'] = false;
        const data: LogInPhoneNumberDto = { phoneNumber: findSession.phoneNumber };

        const loginResponse = await this.authService.loginWithPhoneNumber(data, req.device);
        response['data'] = loginResponse;
      } else {
        response['goNext'] = true;
      }

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };

  public validateUsername = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      username: yup
        .string()
        .required()
        .min(3)
        .max(30)
        .matches(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers and underscores'),
      sessionId: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const findSession = await this.authUsersService.findAuthUserBySessionId(req.body.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      await this.authService.validateUsername(req.body.username);

      const data: UpdateAuthUserDto = {
        fullName: findSession.fullName,
        dateOfBirth: moment(findSession.dateOfBirth).format('YYYY-MM-DD'),
        phoneNumber: findSession.phoneNumber,
        isPhoneNumberVerified: true,
        username: req.body.username,
      };

      await this.authUsersService.updateAuthUser(findSession.id, data);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public signUp = async (req: RequestWithDevice & RequestWithFile, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      sessionId: yup.string().required(),
    });

    try {
      const data: SignUpDto = req.body;

      await validationSchema.validate(data, { abortEarly: false });

      if (!req.file) throw new HttpException(400, 'Missing avatar');

      data.file = req.file;

      const findSession = await this.authUsersService.findAuthUserBySessionId(data.sessionId);
      if (!findSession) throw new HttpException(404, 'Session not found');

      const r = await this.authService.signup(data, req.device);

      res.status(200).json(r);
    } catch (error) {
      next(error);
    }
  };

  public getCountryByIp = async (req: RequestWithCountry, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.country) throw new HttpException(500, 'It is not possible to get the country from the IP address. Please try again later.');

      res.status(200).json({ country: req.country });
    } catch (error) {
      next(error);
    }
  };

  public signUpOrLogIn = async (req: RequestWithDevice, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      username: yup.string().required(),
      phoneNumberVerificationCode: yup.string().required(),

      phoneNumber: yup.string(),
      yearOfBirth: yup.number(),
      monthOfBirth: yup.number(),
      dayOfBirth: yup.number(),
    });
    try {
      const data: AuthDto = req.body;
      await validationSchema.validate(data, { abortEarly: false });

      const r = await this.authService.signUpOrLogIn(data, req.device);

      res.status(200).json(r);

      /**
       * Il flusso di autenticazione prevede:
       * 1. L'utente inserisce lo username.
       * 2. Se lo username viene trovato nel DB, allora invio un OTP al numero di telefono associato.
       * 2.1. Se lo username non viene trovato nel DB, allora faccio proseguire lo user con la registrazione.
       * --------------------------------- SIGN UP ---------------------------------
       * 3. L'utente inserisce la propria data di nascita.
       * 4. L'utente inserisce il proprio numero di telefono.
       * 5. Mando un OTP al numero di telefono inserito.
       *
       * --------------------------------- Si riusa il flusso di autenticazione per il login ---------------------------------
       * 6. L'utente inserisce l'otp ricevuto.
       * 7. Se l'otp è corretto, controllo se esiste già un utente con lo stesso numero di telefono.
       * 8.1. Se esiste, allora faccio il login.
       * 8.2. Se non esiste, allora faccio la registrazione e poi faccio il login.
       */
    } catch (error) {
      next(error);
    }
  };

  public sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      phoneNumber: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const m = await this.authService.sendOtp(req.body.phoneNumber);

      res.status(200).json({ message: m });
    } catch (error) {
      next(error);
    }
  };

  public logInWithAuthToken = async (req: RequestWithDevice, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      authToken: yup.string().required(),
    });

    try {
      const userData: LogInWithAuthTokenDto = req.body;
      await validationSchema.validate(userData, { abortEarly: false });

      if (!req.device) throw new HttpException(400, 'Invalid device');

      const r = await this.authService.loginWithAuthToken(userData, req.device);

      res.status(200).json(r);
    } catch (error) {
      next(error);
    }
  };

  public logOut = async (req: RequestWithUser & RequestWithDevice, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.user, req.device);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
