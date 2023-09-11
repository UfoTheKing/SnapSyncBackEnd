import { NextFunction, Response } from 'express';
import { User } from '@interfaces/users.interface';
import userService from '@services/users.service';
import { RequestWithBlocked, RequestWithUser } from '@/interfaces/auth.interface';
import { HttpException } from '@/exceptions/HttpException';
import FriendshipStatusService from '@/services/friendship_status.service';
import { boolean } from 'boolean';
import FriendService from '@/services/friends.service';
import { MutualFriends, UserProfile } from '@/interfaces/user_profile.interface';
import * as yup from 'yup';
import { CreateUserContactDto } from '@/dtos/users_contacts.dto';
import UserContactService from '@/services/users_contacts.service';
import SnapSyncService from '@/services/snaps_sync.service';

class UsersController {
  public userService = new userService();
  public friendshipStatusService = new FriendshipStatusService();
  public friendService = new FriendService();
  public userContactService = new UserContactService();
  public snapSyncService = new SnapSyncService();

  public getUserProfileById = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');

      const userId = Number(req.params.userId);
      const findOneUserData: User = await this.userService.findUserById(userId);
      if (!findOneUserData) throw new HttpException(404, "User doesn't exist");

      const isMyProfile = req.user.id === userId;

      let friendsCount = await this.friendService.findFriendsCountByUserId(userId, req.user.id);
      let friendship_status = await this.friendshipStatusService.getFriendshipStatus(req.user.id, userId);

      let snapsCount = await this.snapSyncService.findSnapsCountByUserId(userId, req.user.id);

      let userProfileImageUrl = await this.userService.findUserProfilePictureUrlById(userId);

      let biography = await this.userService.findUserProfileBiographyById(userId, req.user.id);

      // let currentDate = new Date();
      // const currentMonth = currentDate.getMonth() + 1;
      // const currentYear = currentDate.getFullYear();

      // const calendar = await this.storyService.findStoryCalendarNodesByUserId(userId, currentMonth, currentYear);

      let mutualFriends: MutualFriends | undefined = undefined;
      if (!friendship_status.isFriend && !isMyProfile) {
        let commonFriends = await this.friendService.findCommonFriends(req.user.id, userId);

        mutualFriends = {
          count: commonFriends.pagination.total,
          nodes: commonFriends.users.map(friend => {
            return {
              id: friend.id,
              username: friend.username,
              fullName: friend.fullName,
              isVerified: boolean(friend.isVerified),
              profilePictureUrl: friend.profilePictureUrl,
            };
          }),
        };
      }

      let userProfile: UserProfile = {
        id: findOneUserData.id,
        username: findOneUserData.username,
        fullName: findOneUserData.fullName,
        isVerified: boolean(findOneUserData.isVerified),
        profilePictureUrl: userProfileImageUrl,

        biography: biography,

        mutualFriends: mutualFriends,

        friendsCount: friendsCount,
        snapsCount: snapsCount,

        isMyProfile: isMyProfile,
        isPrivate: boolean(findOneUserData.isPrivate),
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
      let friendsCount = await this.friendService.findFriendsCountByUserId(userId, req.user.id);
      let snapsCount = await this.snapSyncService.findSnapsCountByUserId(userId, req.user.id);

      let response = {
        user: {
          id: findOneUserData.id,
          username: findOneUserData.username,
          fullName: findOneUserData.fullName,
          isVerified: boolean(findOneUserData.isVerified),
          profilePictureUrl: userProfileImageUrl,
          friendsCount: friendsCount,
          snapsCount: snapsCount,
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

  public createUserContacts = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const validationSchema = yup.object().shape({
      phoneNumbers: yup.array().of(yup.string().required()).required(),
    });

    try {
      await validationSchema.validate(req.body, { abortEarly: false });

      const createdUserContactsIds: number[] = [];

      await Promise.all(
        req.body.phoneNumbers.map(async (phoneNumber: string) => {
          phoneNumber = phoneNumber.trim();
          var findUser: User | undefined = undefined;
          try {
            findUser = await this.userService.findUserByPhoneNumber(phoneNumber);
          } catch (error) {
            // Non ho trovato nessun utente con questo phoneNumber
          }

          if (findUser && findUser.id !== req.user.id) {
            let alreadyExists = true;
            try {
              // Controllo se esiste già un contatto con questo userId e contactId
              let c = await this.userContactService.findUserContactByUserIdAndContactId(req.user.id, findUser.id);
              createdUserContactsIds.push(c.id);
              alreadyExists = true;
            } catch (error) {
              if (error instanceof HttpException && error.status === 404) alreadyExists = false;

              // Non faccio nulla
            }

            if (!alreadyExists) {
              // Lo creo
              const data: CreateUserContactDto = {
                userId: req.user.id,
                contactId: findUser.id,
              };

              try {
                let c = await this.userContactService.createUserContact(data);
                createdUserContactsIds.push(c.id);
              } catch (error) {
                // Non faccio nulla
              }
            }
          }
        }),
      );

      // Elimino tutti i contatti che non sono più presenti
      await this.userContactService.deleteUserContactsByUserIdAndNotInContactIds(req.user.id, createdUserContactsIds);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}

export default UsersController;
