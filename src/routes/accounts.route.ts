import AccountsController from '@/controllers/accounts.controller';
import { HttpException } from '@/exceptions/HttpException';
import { Routes } from '@/interfaces/project/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { Router } from 'express';
import multer from 'multer';

const storage = multer.memoryStorage({
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

class AccountsRoute implements Routes {
  public path = '/accounts';
  public router = Router();
  public accountsController = new AccountsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/edit/web_form_data`, authMiddleware, this.accountsController.getWebFormData);

    this.router.get(`${this.path}/username/rules`, this.accountsController.getUsernameRules);
    this.router.get(`${this.path}/full_name/rules`, this.accountsController.getFullNameRules);
    this.router.get(`${this.path}/bio/rules`, this.accountsController.getBioRules);

    this.router.post(`${this.path}/web_change_profile_pic`, authMiddleware, upload.single('avatar'), this.accountsController.webChangeProfilePicture); // multipart/form-data; boundary=----WebKitFormBoundaryPd3Dn3B16c0lSBzt

    this.router.put(`${this.path}/set_private`, authMiddleware, this.accountsController.setIsPrivate);

    this.router.put(`${this.path}/edit/username`, authMiddleware, this.accountsController.setUsername);
    this.router.put(`${this.path}/edit/full_name`, authMiddleware, this.accountsController.setFullName);
    this.router.put(`${this.path}/edit/bio`, authMiddleware, this.accountsController.setBiography);
  }
}

export default AccountsRoute;
