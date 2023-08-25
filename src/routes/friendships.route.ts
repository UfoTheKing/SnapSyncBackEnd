import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import blockedMiddleware from '@/middlewares/blocked.middleware';
import FriendshipsController from '@/controllers/friendships.controller';

class FriendshipsRoute implements Routes {
  public path = '/friendships';
  public router = Router();
  public friendshipsController = new FriendshipsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:userId/friends`, authMiddleware, blockedMiddleware, this.friendshipsController.getUserFriends);

    this.router.get(`${this.path}/incoming_requests`, authMiddleware, this.friendshipsController.getIncomingRequests);
    this.router.get(`${this.path}/outgoing_requests`, authMiddleware, this.friendshipsController.getOutgoingRequests);

    this.router.get(`${this.path}/show/:userId`, authMiddleware, blockedMiddleware, this.friendshipsController.showFriendship);
    this.router.post(`${this.path}/show_many`, authMiddleware, this.friendshipsController.showManyFriendships);

    this.router.post(`${this.path}/create/:userId`, authMiddleware, blockedMiddleware, this.friendshipsController.createFriendship);
    this.router.post(`${this.path}/destroy/:userId`, authMiddleware, this.friendshipsController.destroyFriendship);
    this.router.post(`${this.path}/accept/:userId`, authMiddleware, this.friendshipsController.acceptFriendship);
    this.router.post(`${this.path}/deny/:userId`, authMiddleware, this.friendshipsController.denyFriendship);

    this.router.post(`${this.path}/:userId/block`, authMiddleware, blockedMiddleware, this.friendshipsController.blockUser);
    this.router.post(`${this.path}/:userId/unblock`, authMiddleware, blockedMiddleware, this.friendshipsController.unblockUser);
  }
}

export default FriendshipsRoute;
