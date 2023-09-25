import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import NotificationsController from '@/controllers/notifications.controller';
import authMiddleware from '@/middlewares/auth.middleware';
import deviceMiddleware from '@/middlewares/device.middleware';

class NotificationsRoute implements Routes {
  public path = '/notifications';
  public router = Router();
  public notificationsController = new NotificationsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/badge`, authMiddleware, this.notificationsController.getNotificationsBadge);

    this.router.post(`${this.path}/expo-push-token`, authMiddleware, deviceMiddleware, this.notificationsController.createExpoPushToken);
  }
}

export default NotificationsRoute;
