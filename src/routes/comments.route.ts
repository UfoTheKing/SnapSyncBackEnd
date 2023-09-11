import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import CommentsController from '@/controllers/comments.controller';
import authMiddleware from '@/middlewares/auth.middleware';

class CommentsRoute implements Routes {
  public path = '/comments';
  public router = Router();
  public commentsController = new CommentsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/like/:commentId`, authMiddleware, this.commentsController.likeComment);
    this.router.post(`${this.path}/unlike/:commentId`, authMiddleware, this.commentsController.unlikeComment);
    this.router.post(`${this.path}/:snapSyncId/delete/:commentId`, authMiddleware, this.commentsController.deleteComment);
  }
}

export default CommentsRoute;
