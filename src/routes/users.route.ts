import { Router } from 'express';
import UsersController from '@controllers/users.controller';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import blockedMiddleware from '@/middlewares/blocked.middleware';

class UsersRoute implements Routes {
  public path = '/users';
  public router = Router();
  public usersController = new UsersController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:userId`, authMiddleware, blockedMiddleware, this.usersController.getUserProfileById);
    this.router.get(`${this.path}/:userId/info`, authMiddleware, blockedMiddleware, this.usersController.getUserInfoById);
  }
}

export default UsersRoute;
