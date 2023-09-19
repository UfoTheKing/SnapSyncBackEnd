import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';

class DiscoverRoute implements Routes {
  public path = '/discover';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {}
}

export default DiscoverRoute;
