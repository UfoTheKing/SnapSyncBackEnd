import { Router } from 'express';
import AuthController from '@controllers/auth.controller';
import { Routes } from '@interfaces/routes.interface';
import countryMiddleware from '@/middlewares/country.middleware';
import deviceMiddleware from '@/middlewares/device.middleware';
import authMiddleware from '@/middlewares/auth.middleware';
import multer from 'multer';
import { HttpException } from '@/exceptions/HttpException';

const storage = multer.diskStorage({
  destination: './uploads/avatars/',
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 8, // 8 MB
  },
  fileFilter: function (req, file, cb) {
    // jpg, jpeg, png, bmp, gif
    const allowedMimes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpException(400, 'Only .png, .jpeg, .bmp and .gif format allowed!'), false);
    }
  },
});

class AuthRoute implements Routes {
  public path = '/auth';
  public router = Router();
  public authController = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/get_session_id`, this.authController.getSessionId);

    this.router.post(`${this.path}/fullname`, this.authController.validateFullname);
    this.router.post(`${this.path}/date_of_birth`, this.authController.validateDateOfBirth);
    this.router.post(`${this.path}/phone_number`, this.authController.validatePhoneNumber);
    this.router.post(`${this.path}/otp`, deviceMiddleware, this.authController.validateOtp);
    this.router.post(`${this.path}/username`, this.authController.validateUsername);

    this.router.post(`${this.path}/signup`, deviceMiddleware, upload.single('avatar'), this.authController.signUp);

    // this.router.get(`${this.path}/validate_username`, this.authController.validateUsername);

    // this.router.get(`${this.path}/get_country_by_ip`, countryMiddleware, this.authController.getCountryByIp);

    // this.router.post(`${this.path}/send_otp`, this.authController.sendOtp);

    // this.router.post(`${this.path}/signup_login`, deviceMiddleware, this.authController.signUpOrLogIn);

    this.router.post(`${this.path}/login_auth_token`, deviceMiddleware, this.authController.logInWithAuthToken);

    this.router.post(`${this.path}/logout`, authMiddleware, deviceMiddleware, this.authController.logOut);
  }
}

export default AuthRoute;
