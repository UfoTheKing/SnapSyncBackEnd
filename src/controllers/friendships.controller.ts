import { CreateBlockedUserDto, DestroyBlockedUserDto } from '@/dtos/blocked_users.dto';
import { AcceptPendingFriendDto, CreatePendingFriendDto, DenyPendingFriendDto } from '@/dtos/friends.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithBlocked, RequestWithUser } from '@/interfaces/auth.interface';
import { FriendshipStatus } from '@/interfaces/friendship_status.interface';
import BlockedUserService from '@/services/blocked_users.service';
import FriendService from '@/services/friends.service';
import FriendshipStatusService from '@/services/friendship_status.service';
import UserService from '@/services/users.service';
import { NextFunction, Response } from 'express';
import * as yup from 'yup';
import { WebServiceClient } from '@maxmind/geoip2-node';
import { MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY } from '@/config';
import * as ip from 'ip';

class FriendshipsController {
  public userService = new UserService();
  public friendshipStatusService = new FriendshipStatusService();
  public blockedUserService = new BlockedUserService();
  public friendService = new FriendService();

  public getUserFriends = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');

      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);
      if (!findUser) throw new HttpException(404, 'User not found');

      const page = Number(req.query.page) && Number(req.query.page) > 0 ? Number(req.query.page) : 1;
      const count = Number(req.query.count) && Number(req.query.count) > 0 ? Number(req.query.count) : 12;
      const query = (req.query.query && String(req.query.query).trim()) || null;

      const friends = await this.friendService.findFriendsByUserId(findUser.id, req.user.id, page, count, query);

      res.status(200).json({
        ...friends,
      });
    } catch (error) {
      next(error);
    }
  };

  public getIncomingRequests = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) && Number(req.query.page) > 0 ? Number(req.query.page) : 1;
      const count = Number(req.query.count) && Number(req.query.count) > 0 ? Number(req.query.count) : 12;
      const query = (req.query.query && String(req.query.query).trim()) || null;

      const incomingRequests = await this.friendService.findIncomingRequestsByUserId(req.user.id, page, count, query);

      res.status(200).json({
        ...incomingRequests,
      });
    } catch (error) {
      next(error);
    }
  };

  public getOutgoingRequests = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) && Number(req.query.page) > 0 ? Number(req.query.page) : 1;
      const count = Number(req.query.count) && Number(req.query.count) > 0 ? Number(req.query.count) : 12;
      const query = (req.query.query && String(req.query.query).trim()) || null;

      const outgoingRequests = await this.friendService.findOutgoingRequestsByUserId(req.user.id, page, count, query);

      res.status(200).json({
        ...outgoingRequests,
      });
    } catch (error) {
      next(error);
    }
  };

  public suggestFriends = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      phoneNumbers: yup.string().nullable(),
    });
    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      let lt: number | null = null;
      let lg: number | null = null;

      if (ip.isPrivate(req.ip)) {
        // IP PRIVATO -> Prendo le coordinate del paese di Casalmaggiore
        lt = 44.983333;
        lg = 10.433333;
      } else {
        const client = new WebServiceClient(MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY);
        // Recupero la longitudine e la latitudine
        const city = await client.city(req.ip);

        lt = city && city.location ? city.location.latitude : null;
        lg = city && city.location ? city.location.longitude : null;
      }

      const suggestedFriends = await this.friendService.findSuggestedFriendsByUserId(req.user.id, req.body.phoneNumbers, lt, lg);

      res.status(200).json({
        users: suggestedFriends,
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public showFriendship = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');

      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      const friendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      res.status(200).json({
        ...friendshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public showManyFriendships = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      userIds: yup.string().required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const slippedUserIds = req.body.userIds.split(',');
      const validUserIds = [];

      for (let i = 0; i < slippedUserIds.length; i++) {
        // Controllo se la stringa è un numero
        if (!isNaN(Number(slippedUserIds[i]))) {
          validUserIds.push(Number(slippedUserIds[i]));
        }
      }

      const friendshipStatuses: { [key: string]: FriendshipStatus } = {};

      await Promise.all(
        validUserIds.map(async userId => {
          try {
            let findUser = await this.userService.findUserById(userId);
            // Controllo se l'utente userId non abbia bloccato l'utente loggato
            let isBlocking = await this.blockedUserService.isBlocking(findUser.id, req.user.id);
            if (!isBlocking) {
              let friendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);
              friendshipStatuses[findUser.id] = friendshipStatus;
            }
          } catch (error) {
            // Non faccio nulla, il friendshipStatus sarà undefined
          }
        }),
      );

      /**
       * {
       *  friendshipStatuses: {
       *    "1234": FriendshipStatus,
       *  }
       *  message: string
       * }
       */

      res.status(200).json({
        friendshipStatuses,
        message: 'ok',
      });
    } catch (error) {
      next(error);
    }
  };

  public createFriendship = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, "User doesn't exist");
      if (req.isViewerBlocked) throw new HttpException(400, "You have blocked this user. You can't send a friend request");

      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't send a friend request to yourself");

      const oldFriendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      if (oldFriendshipStatus.isFriend) throw new HttpException(400, 'You are already friends');
      if (oldFriendshipStatus.outgoingRequest) throw new HttpException(400, 'You have already sent a friend request');
      if (oldFriendshipStatus.incomingRequest) throw new HttpException(400, 'You have already received a friend request');

      const data: CreatePendingFriendDto = {
        userId: req.user.id,
        friendId: findUser.id,
      };

      await this.friendService.createPendingFriend(data);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      //TODO: Mando la push notification all'utente che ha ricevuto la richiesta di amicizia

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public destroyFriendship = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't delete a friend request from yourself");

      const oldFriendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);
      if (!oldFriendshipStatus.isFriend && !oldFriendshipStatus.outgoingRequest && !oldFriendshipStatus.incomingRequest)
        throw new HttpException(400, 'Ops! Is not possible to delete this friendship');

      await this.friendService.destroyFriendship(req.user.id, findUser.id);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public acceptFriendship = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't accept a friend request from yourself");

      const oldFriendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);
      if (oldFriendshipStatus.isFriend) throw new HttpException(409, 'You are already friends');

      if (!oldFriendshipStatus.incomingRequest) throw new HttpException(400, 'You have not received a friend request');

      const data: AcceptPendingFriendDto = {
        userId: findUser.id,
        friendId: req.user.id,
      };

      await this.friendService.acceptFriendship(data);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      // TODO: Mando la push notification all'utente che ha inviato la richiesta di amicizia

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public denyFriendship = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't deny a friend request from yourself");

      const oldFriendshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);
      if (oldFriendshipStatus.isFriend) throw new HttpException(409, 'You are already friends');
      if (!oldFriendshipStatus.incomingRequest) throw new HttpException(400, 'You have not received a friend request');

      const data: DenyPendingFriendDto = {
        userId: findUser.id,
        friendId: req.user.id,
      };

      await this.friendService.denyFriendship(data);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public blockUser = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, "User doesn't exist");
      if (req.isViewerBlocked) throw new HttpException(400, 'User already blocked');

      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't block yourself");

      const data: CreateBlockedUserDto = {
        userId: req.user.id,
        blockedUserId: findUser.id,
      };

      await this.blockedUserService.createBlockedUser(data);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  public unblockUser = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, "User doesn't exist");
      if (!req.isViewerBlocked) throw new HttpException(400, 'User is not blocked');

      const userId = Number(req.params.userId);
      const findUser = await this.userService.findUserById(userId);

      if (findUser.id === req.user.id) throw new HttpException(400, "You can't unblock yourself");

      const data: DestroyBlockedUserDto = {
        userId: req.user.id,
        blockedUserId: findUser.id,
      };

      await this.blockedUserService.destroyBlockedUser(data);

      const newFriedshipStatus = await this.friendshipStatusService.getFriendshipStatus(req.user.id, findUser.id);

      res.status(200).json({
        ...newFriedshipStatus,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default FriendshipsController;
