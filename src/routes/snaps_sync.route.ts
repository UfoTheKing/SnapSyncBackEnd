import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import SnapsSyncController from '@/controllers/snaps_sync.controller';
import multer from 'multer';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import privateMiddleware from '@/middlewares/private.middleware';
import blockedMiddleware from '@/middlewares/blocked.middleware';

const storage = multer.memoryStorage({
  destination: './uploads/snaps_sync/',
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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpException(400, 'Only .png, .jpeg, .bmp and format allowed!'), false);
    }
  },
});

class SnapsSyncRoute implements Routes {
  public path = '/snaps_sync';
  public router = Router();
  public snapsSyncController = new SnapsSyncController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // this.router.get(`${this.path}/:id/comments`, authMiddleware, this.snapsSyncController.getComments);
    // this.router.get(`${this.path}/:id/comments/:commentId/child_comments`, authMiddleware, this.snapsSyncController.getChildComments);

    this.router.post(`${this.path}/create/:userId`, authMiddleware, blockedMiddleware, this.snapsSyncController.createSnapInstance);

    // this.router.post(`${this.path}/:key/take_snap`, authMiddleware, upload.single('snap'), this.snapsSyncController.takeSnap);
    // this.router.post(`${this.path}/:key/publish`, authMiddleware, this.snapsSyncController.publishSnap);
  }
}

export default SnapsSyncRoute;
