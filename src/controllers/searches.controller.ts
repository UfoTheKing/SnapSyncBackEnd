import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { SmallUser } from '@/interfaces/users.interface';
import FriendService from '@/services/friends.service';
import UserService from '@/services/users.service';
import UserContactService from '@/services/users_contacts.service';
import { NextFunction, Response } from 'express';

class SearchesController {
  public friendService = new FriendService();
  public userContactService = new UserContactService();
  public userService = new UserService();

  public searchUsers = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.query.query) throw new HttpException(400, 'Missing query parameter');

      const query = req.query.query as string;
      if (query.length < 3) throw new HttpException(400, 'Query parameter too short');

      const excludingUsersIds: number[] = [];
      const responseUsers: SmallUser[] = [];

      var response = {};

      // Prima recupero le richieste di amicizia che mi sono state inviate
      const incomingRequests = await this.friendService.findIncomingRequestsByUserId(req.user.id, 1, 20, query);

      if (incomingRequests.pendingRequests.length > 0) {
        response['requests'] = {
          title: 'Friendship Requests',
          showAcceptButton: true,
          users: incomingRequests.pendingRequests.map(request => request.user),
        };

        incomingRequests.pendingRequests.forEach(request => {
          excludingUsersIds.push(request.user.id);
          responseUsers.push(request.user);
        });
      }

      // Poi recupero le richieste di amicizia che ho inviato
      const outgoingRequests = await this.friendService.findOutgoingRequestsByUserId(req.user.id, 1, 20, query);

      if (outgoingRequests.pendingRequests.length > 0) {
        response['requests_sent'] = {
          title: 'Requests Sent',
          showCancelButton: true,
          users: outgoingRequests.pendingRequests.map(request => request.user),
        };

        outgoingRequests.pendingRequests.forEach(request => {
          excludingUsersIds.push(request.user.id);
          responseUsers.push(request.user);
        });
      }

      // Poi recupero gli utenti da friends
      const friendsFull = await this.friendService.findFriendsByUserId(req.user.id, req.user.id, 1, 20, query);

      if (friendsFull.friends.length > 0) {
        response['friends'] = {
          title: 'Friends',
          showRemoveButton: true,
          users: friendsFull.friends.map(friend => friend.user),
        };

        friendsFull.friends.forEach(friend => {
          excludingUsersIds.push(friend.user.id);
          responseUsers.push(friend.user);
        });
      }

      // Poi recupero gli utenti da users_contacts
      const contactsFull = await this.userContactService.findUserContactsExcludingBlockedUsersByUserId(req.user.id, 1, 20, query, excludingUsersIds);

      if (contactsFull.contacts.length > 0) {
        response['contacts'] = {
          title: 'Contacts',
          showAddButton: true,
          users: contactsFull.contacts,
        };

        contactsFull.contacts.forEach(contact => {
          excludingUsersIds.push(contact.id);
          responseUsers.push(contact);
        });
      }

      // Poi recupero gli utenti da users
      const usersFull = await this.userService.findUsersExcludingBlockedUsersByUserId(req.user.id, 1, 20, query, excludingUsersIds);

      if (usersFull.users.length > 0) {
        response['users'] = {
          title: 'Users',
          showAddButton: true,
          users: usersFull.users,
        };

        usersFull.users.forEach(user => {
          excludingUsersIds.push(user.id);
          responseUsers.push(user);
        });
      }

      res.status(200).json({ ...response });
    } catch (error) {
      next(error);
    }
  };
}

export default SearchesController;
