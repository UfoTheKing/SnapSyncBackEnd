import { NextFunction, Request, Response } from 'express';
import { User } from '@interfaces/users.interface';
import userService from '@services/users.service';
import { RequestWithBlocked, RequestWithUser } from '@/interfaces/auth.interface';
import { HttpException } from '@/exceptions/HttpException';
import FriendshipStatusService from '@/services/friendship_status.service';
import { RECOMBEE_DB, RECOMBEE_PRIVATE_KEY, RECOMBEE_REGION } from '@/config';
import { boolean } from 'boolean';
import * as recombee from 'recombee-api-client';
import FriendService from '@/services/friends.service';
import { MutualFriends, UserProfile } from '@/interfaces/user_profile.interface';
var rqs = recombee.requests;
const client = new recombee.ApiClient(RECOMBEE_DB, RECOMBEE_PRIVATE_KEY, {
  region: RECOMBEE_REGION,
});

class UsersController {
  public userService = new userService();
  public friendshipStatusService = new FriendshipStatusService();
  public friendService = new FriendService();

  public getUserProfileById = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');

      const userId = Number(req.params.userId);
      const findOneUserData: User = await this.userService.findUserById(userId);
      if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

      let friendsCount = await this.friendService.findFriendsCountByUserId(userId, req.user.id);
      let friendship_status = await this.friendshipStatusService.getFriendshipStatus(req.user.id, userId);
      let lifetimeStoriesCount = 0;
      let lifetimeLocationsCount = 0;

      let userProfileImageUrl = await this.userService.findUserProfilePictureUrlById(userId);

      let biography = await this.userService.findUserProfileBiographyById(userId, req.user.id);

      // let currentDate = new Date();
      // const currentMonth = currentDate.getMonth() + 1;
      // const currentYear = currentDate.getFullYear();

      // const calendar = await this.storyService.findStoryCalendarNodesByUserId(userId, currentMonth, currentYear);

      let mutualFriends: MutualFriends | undefined = undefined;
      if (!friendship_status.isFriend) {
        let commonFriends = await this.friendService.findCommonFriends(req.user.id, userId);

        mutualFriends = {
          count: commonFriends.pagination.total,
          nodes: commonFriends.users.map(friend => {
            return {
              id: friend.id,
              username: friend.username,
              isVerified: boolean(friend.isVerified),
              profilePictureUrl: null,
            };
          }),
        };
      }

      let userProfile: UserProfile = {
        id: findOneUserData.id,
        username: findOneUserData.username,
        isVerified: boolean(findOneUserData.isVerified),
        profilePictureUrl: userProfileImageUrl,

        biography: biography,

        mutualFriends: mutualFriends,

        friendsCount: friendsCount,
        lifetimeStoriesCount: lifetimeStoriesCount,
        lifetimeLocationsCount: lifetimeLocationsCount,

        friendshipStatus: friendship_status,

        // calendar: {
        //   nodes: calendar,
        //   info: {
        //     month: currentMonth,
        //     monthName: currentDate.toLocaleString('en', { month: 'long' }),
        //     year: currentYear,
        //   }
        // },
      };

      res.status(200).json({ ...userProfile, message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public getUserInfoById = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');

      const userId = Number(req.params.userId);
      const findOneUserData: User = await this.userService.findUserById(userId);

      let userProfileImageUrl = await this.userService.findUserProfilePictureUrlById(userId);

      let lifetimeStoriesCount = 0;
      let lifetimeLocationsCount = 0;
      let friendsCount = await this.friendService.findFriendsCountByUserId(userId, req.user.id);

      let response = {
        user: {
          id: findOneUserData.id,
          username: findOneUserData.username,
          isVerified: boolean(findOneUserData.isVerified),
          profilePictureUrl: userProfileImageUrl,

          lifetimeStoriesCount: lifetimeStoriesCount,
          lifetimeLocationsCount: lifetimeLocationsCount,
          friendsCount: friendsCount,
        },
      };

      /**
       * user: {
       *  id: 1,
       *  username: 'john',
       *  isVerified: boolean,
       *  profilePictureUrl: string | null,
       *  friendshipStatus: {},
       *
       * lifetimeStoriesCount: number,
       * locationsCount: number,
       * friendsCount: number,
       * }
       */

      res.status(200).json({ ...response, message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public syncUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.findAllUser();

      let errors: recombee.errors.ResponseError[] = [];

      await Promise.all(
        users.map(async user => {
          await client.send(new rqs.AddUser(user.id.toString()), (error, response) => {
            if (error) errors.push(error);
            else {
              console.log(response);
            }
          });
        }),
      );

      res.status(200).json({ message: 'ok', errors: errors });
    } catch (error) {
      next(error);
    }
  };
}

export default UsersController;
