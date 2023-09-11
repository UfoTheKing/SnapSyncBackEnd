import { HttpException } from '@/exceptions/HttpException';
import { RequestWithFile, RequestWithUser } from '@/interfaces/auth.interface';
import UserService from '@/services/users.service';
import { boolean } from 'boolean';
import { NextFunction, Response } from 'express';
import * as yup from 'yup';

class AccountsController {
  public userService = new UserService();

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
        .min(3)
        .max(30)
        .matches(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers and underscores'),
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
      fullname: yup
        .string()
        .required()
        .min(2)
        .max(100)
        .matches(/^[a-zA-Z\s]+$/, 'Fullname must contain only letters and spaces'),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const { fullname } = req.body;

      await this.userService.updateUserFullName(req.user.id, fullname);
      let response = {
        message: 'ok',
        fullname,
      };

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };

  public setBiography = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const validationSchema = yup.object().shape({
      biography: yup.string().max(150).nullable(),
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
