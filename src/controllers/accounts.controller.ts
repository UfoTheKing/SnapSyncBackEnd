import { HttpException } from '@/exceptions/HttpException';
import { RequestWithFile, RequestWithUser } from '@/interfaces/auth.interface';
import BlockedUserService from '@/services/blocked_users.service';
import UserService from '@/services/users.service';
import ValidationService from '@/services/validation.service';
import {
  MAX_BIO_LENGTH,
  MAX_FULL_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_FULL_NAME_LENGTH,
  MIN_USERNAME_LENGTH,
  REGEX_FULL_NAME,
  REGEX_USERNAME,
} from '@/utils/validation';
import { boolean } from 'boolean';
import { NextFunction, Request, Response } from 'express';
import * as yup from 'yup';

class AccountsController {
  public userService = new UserService();
  public validationService = new ValidationService();
  public blockedUserService = new BlockedUserService();

  public getWebFormData = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      let formData = {
        biography: req.user.biography,
        fullName: req.user.fullName,

        phoneNumber: req.user.phoneNumber,

        username: req.user.username,
      };

      res.status(200).json({ formData });
    } catch (error) {
      next(error);
    }
  };

  public getSettingsWebInfo = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      let webInfo = {
        privateAccount: boolean(req.user.isPrivate),
      };

      res.status(200).json({
        webInfo: webInfo,
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public getUsernameRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let response = {
        maxLength: MAX_USERNAME_LENGTH,
        minLength: MIN_USERNAME_LENGTH,
        regex: REGEX_FULL_NAME,
      };

      res.status(200).json({ field: 'username', rules: response });
    } catch (error) {
      next(error);
    }
  };

  public getFullNameRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let response = {
        maxLength: MAX_FULL_NAME_LENGTH,
        minLength: MIN_FULL_NAME_LENGTH,
        regex: REGEX_FULL_NAME,
      };

      res.status(200).json({ field: 'fullName', rules: response });
    } catch (error) {
      next(error);
    }
  };

  public getBioRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let response = {
        maxLength: MAX_BIO_LENGTH,
      };

      res.status(200).json({ field: 'bio', rules: response });
    } catch (error) {
      next(error);
    }
  };

  public checkBio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio } = req.body;
      if (bio === undefined) {
        throw new HttpException(400, 'Missing bio');
      }

      const { isValid, message } = await this.validationService.validateBio(bio);
      if (!isValid) {
        throw new HttpException(422, message);
      }

      res.status(200).json({
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public getPrivacyBlockedAccounts = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) && Number(req.query.page) > 0 ? Number(req.query.page) : 1;
      const count = Number(req.query.count) && Number(req.query.count) > 0 ? Number(req.query.count) : 12;

      const blockedUsers = await this.blockedUserService.findLoggedUserBlockedUsers(req.user.id, page, count);

      res.status(200).json({
        ...blockedUsers,
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public webChangeProfilePicture = async (req: RequestWithUser & RequestWithFile, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new HttpException(400, 'Missing avatar');
      }

      if (!req.file.buffer) {
        throw new HttpException(400, 'Missing avatar');
      }

      const avatar = req.file;

      await this.userService.updateUserAvatar(req.user.id, avatar);
      const profilePictureUrl = await this.userService.findUserProfilePictureUrlById(req.user.id);

      let response = {
        message: 'ok',
        profilePictureUrl,
      };

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };

  public setIsPrivate = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const validationSchema = yup.object().shape({
      isPrivate: yup.boolean().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      if (boolean(req.body.isPrivate) === boolean(req.user.isPrivate)) {
        throw new HttpException(400, 'Bad request');
      }

      await this.userService.updateIsPrivate(req.user.id, boolean(req.body.isPrivate));

      res.status(200).json({
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public setUsername = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const validationSchema = yup.object().shape({
      username: yup
        .string()
        .required()
        .min(MIN_USERNAME_LENGTH)
        .max(MAX_USERNAME_LENGTH)
        .matches(REGEX_USERNAME, 'Username must contain only letters, numbers and underscores'),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const { username } = req.body;

      await this.userService.updateUserUsername(req.user.id, username);

      let response = {
        message: 'ok',
        username,
      };

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };

  public setFullName = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const validationSchema = yup.object().shape({
      fullName: yup
        .string()
        .required()
        .min(MIN_FULL_NAME_LENGTH)
        .max(MAX_FULL_NAME_LENGTH)
        .matches(REGEX_FULL_NAME, 'Fullname must contain only letters and spaces'),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const { fullName } = req.body;

      await this.userService.updateUserFullName(req.user.id, fullName);
      let response = {
        message: 'ok',
        fullName,
      };

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };

  public setBiography = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const validationSchema = yup.object().shape({
      biography: yup.string().max(MAX_BIO_LENGTH).nullable(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const { biography } = req.body;

      await this.userService.updateUserBiography(req.user.id, biography);

      let response = {
        message: 'ok',
        biography,
      };

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };
}

export default AccountsController;
