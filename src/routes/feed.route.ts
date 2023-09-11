import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import FeedController from '@/controllers/feed.controller';

class FeedRoute implements Routes {
  public path = '/feed';
  public router = Router();
  public feedController = new FeedController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/timeline`, authMiddleware, this.feedController.getTimeline);
  }
}

export default FeedRoute;
