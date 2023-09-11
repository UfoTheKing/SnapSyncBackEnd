import { NextFunction, Response } from 'express';
import { Users } from '@/models/users.model';
import { boolean } from 'boolean';
import { HttpException } from '@/exceptions/HttpException';
import { FriendshipStatuses } from '@/models/friendship_statuses.model';
import { Friends } from '@/models/friends.model';
import { RequestWithIsPrivate, RequestWithUser } from '@/interfaces/auth.interface';
import FriendService from '@/services/friends.service';
import { FriendshipStatus } from '@/utils/enums';

const privateMiddleware = async (req: RequestWithUser & RequestWithIsPrivate, res: Response, next: NextFunction) => {
  try {
    // Middleare to check if user has private profile

    req.isPrivate = false;
    req.isMyFriend = false;

    let userid: number = req.params.userId ? parseInt(req.params.userId) : 0;
    if (!userid) throw new HttpException(400, 'Invalid user id');
    if (userid === req.user.id) {
      req.isMyFriend = false;
      req.isPrivate = false;
    } else {
      let userId = parseInt(req.params.userId);
      let user = await Users.query().whereNotDeleted().findById(userId);
      if (user) {
        req.isPrivate = boolean(user.isPrivate);
        const FriendshipHash = await new FriendService().generateFriendshipHash(req.user.id, userId);
        const acceptedFriendhipStatus = await FriendshipStatuses.query().whereNotDeleted().findOne({
          name: FriendshipStatus.Accepted,
        });
        if (acceptedFriendhipStatus) {
          const friend = await Friends.query()
            .whereNotDeleted()
            .where('friendshipStatusId', acceptedFriendhipStatus.id)
            .where('friendshipHash', FriendshipHash)
            .first();
          req.isMyFriend = friend ? true : false;
        }
      } else {
        throw new HttpException(400, 'Invalid user id');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default privateMiddleware;
