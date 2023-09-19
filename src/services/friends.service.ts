import { DB_DATABASE } from '@/config';
import { AcceptPendingFriendDto, CreatePendingFriendDto, DenyPendingFriendDto } from '@/dtos/friends.dto';
import { HttpException } from '@/exceptions/HttpException';
import { Friend } from '@/interfaces/friends.interface';
import { Friends } from '@/models/friends.model';
import { FriendshipStatuses } from '@/models/friendship_statuses.model';
import { Users } from '@/models/users.model';
import { FriendshipStatus } from '@/utils/enums';
import { isEmpty } from '@/utils/util';
import knex from '@databases';
import UserService from './users.service';
import { SmallUser, User } from '@/interfaces/users.interface';

class FriendService {
  public findLoggedUserFriends = async (
    loggedUserId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    friends: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetFriendsList`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${loggedUserId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`);

    let responseResults: Array<{
      userId: number;
      acceptedAt: Date | null;
      count: number;
    }> = [];
    let friendsCount = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        friendsCount = results[0][0][0].count;
      }
    }

    let friends: Array<SmallUser> = [];

    if (responseResults.length > 0) {
      for (let i = 0; i < responseResults.length; i++) {
        let us = await new UserService().findSmallUserById(responseResults[i].userId);
        friends.push(us);
      }
    }

    return {
      friends: friends,
      pagination: {
        page: page,
        size: count,
        total: friendsCount,
        hasMore: page * count < friendsCount,
      },
    };
  };

  public findMutualFriends = async (
    loggedUserId: number,
    visitedUserId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    users: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetMutualFriendsList`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(
      `CALL ${StoredProcedureName}(${loggedUserId}, ${visitedUserId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`,
    );

    let responseResults: Array<User> = [];

    let mutualFriendsCount = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        mutualFriendsCount = results[0][0][0].count;
      }
    }

    let users: Array<SmallUser> = [];

    if (responseResults.length > 0) {
      for (let i = 0; i < responseResults.length; i++) {
        let us = await new UserService().findSmallUserById(responseResults[i].id);
        users.push(us);
      }
    }

    return {
      users: users,
      pagination: {
        page: page,
        size: count,
        total: mutualFriendsCount,
        hasMore: page * count < mutualFriendsCount,
      },
    };
  };

  public findIncomingRequestsByUserId = async (
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    requests: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetIncomingPendingFriendRequests`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`);

    let responseResults: Array<{
      userId: number;
      createdAt: Date;
    }> = [];
    let pendingRequestsCount = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        pendingRequestsCount = results[0][0][0].count;
      }
    }

    let pendingRequests: Array<SmallUser> = [];

    if (responseResults.length > 0) {
      for (let i = 0; i < responseResults.length; i++) {
        let us = await new UserService().findSmallUserById(responseResults[i].userId);
        pendingRequests.push(us);
      }
    }

    return {
      requests: pendingRequests,
      pagination: {
        page: page,
        size: count,
        total: pendingRequestsCount,
        hasMore: page * count < pendingRequestsCount,
      },
    };
  };

  public findOutgoingRequestsByUserId = async (
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    requests: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetOutgoingPendingFriendRequests`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`);

    let responseResults: Array<{
      userId: number;
      createdAt: Date;
    }> = [];
    let pendingRequestsCount = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        pendingRequestsCount = results[0][0][0].count;
      }
    }

    let pendingRequests: Array<SmallUser> = [];

    if (responseResults.length > 0) {
      for (let i = 0; i < responseResults.length; i++) {
        let us = await new UserService().findSmallUserById(responseResults[i].userId);
        pendingRequests.push(us);
      }
    }

    return {
      requests: pendingRequests,
      pagination: {
        page: page,
        size: count,
        total: pendingRequestsCount,
        hasMore: page * count < pendingRequestsCount,
      },
    };
  };

  public createPendingFriend = async (data: CreatePendingFriendDto): Promise<Friend> => {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, 'User not found');

    const findFriend = await Users.query().whereNotDeleted().findById(data.friendId);
    if (!findFriend) throw new HttpException(404, 'User not found');

    let friendshipHash = await this.generateFriendshipHash(findUser.id, findFriend.id);

    const findFriendship = await Friends.query()
      .whereNotDeleted()
      .where({
        friendshipHash: friendshipHash,
      })
      .first();

    let acceptedFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Accepted,
      })
      .first();
    if (!acceptedFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    if (findFriendship) {
      if (findFriendship.friendshipStatusId === acceptedFriendshipStatus.id) {
        throw new HttpException(409, 'You are already friends');
      } else {
        if (findFriendship.userId === findUser.id) {
          throw new HttpException(409, 'You have already sent a friend request');
        } else {
          throw new HttpException(409, 'You have already received a friend request');
        }
      }
    }

    const pendingFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Pending,
      })
      .first();
    if (!pendingFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    const newFriendship = await Friends.query().insert({
      userId: findUser.id,
      friendId: findFriend.id,
      friendshipStatusId: pendingFriendshipStatus.id,
    });

    return newFriendship;
  };

  public acceptFriendship = async (data: AcceptPendingFriendDto): Promise<Friend> => {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId); // Colui che ha inviato la richiesta di amicizia
    if (!findUser) throw new HttpException(404, 'User not found');

    const findFriend = await Users.query().whereNotDeleted().findById(data.friendId); // L'utente loggato: colui che ha ricevuto la richiesta di amicizia
    if (!findFriend) throw new HttpException(404, 'User not found');

    let friendshipHash = await this.generateFriendshipHash(findUser.id, findFriend.id);

    const findFriendship = await Friends.query()
      .whereNotDeleted()
      .where({
        friendshipHash: friendshipHash,
        userId: findUser.id,
        friendId: findFriend.id,
      })
      .first();
    if (!findFriendship) throw new HttpException(404, 'Ops! There is no pending friendship');

    let acceptedFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Accepted,
      })
      .first();
    if (!acceptedFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    if (findFriendship.friendshipStatusId === acceptedFriendshipStatus.id) {
      throw new HttpException(409, 'You are already friends');
    }

    let pendingFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Pending,
      })
      .first();
    if (!pendingFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    if (findFriendship.friendshipStatusId !== pendingFriendshipStatus.id) {
      throw new HttpException(409, 'You have not received a friend request');
    }

    if (findFriendship.userId !== findUser.id) {
      throw new HttpException(409, 'You have not received a friend request');
    }

    const updatedFriendship = await Friends.query().patchAndFetchById(findFriendship.id, {
      friendshipStatusId: acceptedFriendshipStatus.id,

      acceptedAt: new Date(),

      updatedAt: new Date(),
    });

    return updatedFriendship;
  };

  public denyFriendship = async (data: DenyPendingFriendDto): Promise<void> => {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId); // Colui che ha inviato la richiesta di amicizia
    if (!findUser) throw new HttpException(404, 'User not found');

    const findFriend = await Users.query().whereNotDeleted().findById(data.friendId); // L'utente loggato: colui che ha ricevuto la richiesta di amicizia
    if (!findFriend) throw new HttpException(404, 'User not found');

    let friendshipHash = await this.generateFriendshipHash(findUser.id, findFriend.id);

    const findFriendship = await Friends.query()
      .whereNotDeleted()
      .where({
        friendshipHash: friendshipHash,
        userId: findUser.id,
        friendId: findFriend.id,
      })
      .first();
    if (!findFriendship) throw new HttpException(404, 'Ops! There is no pending friendship');

    let acceptedFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Accepted,
      })
      .first();
    if (!acceptedFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    if (findFriendship.friendshipStatusId === acceptedFriendshipStatus.id) {
      throw new HttpException(409, 'You are already friends');
    }

    let pendingFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Pending,
      })
      .first();
    if (!pendingFriendshipStatus) throw new HttpException(404, 'Friendship status not found');

    if (findFriendship.friendshipStatusId !== pendingFriendshipStatus.id) {
      throw new HttpException(409, 'You have not received a friend request');
    }

    if (findFriendship.userId !== findUser.id) {
      throw new HttpException(409, 'You have not received a friend request');
    }

    let rejectedFriendshipStatus = await FriendshipStatuses.query()
      .whereNotDeleted()
      .where({
        name: FriendshipStatus.Rejected,
      })
      .first();

    await Friends.query().patchAndFetchById(findFriendship.id, {
      friendshipStatusId: rejectedFriendshipStatus.id,

      rejectedAt: new Date(),

      updatedAt: new Date(),
    });

    // La posso anche cancellare
    await Friends.query().deleteById(findFriendship.id);
  };

  public destroyFriendship = async (userId: number, friendId: number): Promise<void> => {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, 'User not found');

    const findFriend = await Users.query().whereNotDeleted().findById(friendId);
    if (!findFriend) throw new HttpException(404, 'User not found');

    let friendshipHash = await this.generateFriendshipHash(findUser.id, findFriend.id);

    const findFriendship = await Friends.query()
      .whereNotDeleted()
      .where({
        friendshipHash: friendshipHash,
      })
      .first();
    if (!findFriendship) throw new HttpException(404, 'Ops! There is no friendship');

    await Friends.query().deleteById(findFriendship.id);
  };

  public generateFriendshipHash = (userId: number, friendId: number): string => {
    let lowestUserId = userId < friendId ? userId : friendId;
    let highestUserId = userId > friendId ? userId : friendId;
    let friendshipHash = lowestUserId + '_' + highestUserId;

    return friendshipHash;
  };
}

export default FriendService;
