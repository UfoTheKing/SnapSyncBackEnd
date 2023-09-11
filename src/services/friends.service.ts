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
import { boolean } from 'boolean';
import UserService from './users.service';
import { SmallUser, User } from '@/interfaces/users.interface';
import { MutualFriends } from '@/interfaces/user_profile.interface';

class FriendService {
  private StoredProcedureNameNumberOfFriends = `${DB_DATABASE}.GetNumberOfFriendsExcludingBlockedUsers`;

  public findFriendsCountByUserId = async (userId: number, loggedUserId: number, query: string | null = null): Promise<number> => {
    const StoredProcedureNameNumberOfFriends = this.StoredProcedureNameNumberOfFriends;

    const resultsNumberOfFriends = await knex.raw(
      `CALL ${StoredProcedureNameNumberOfFriends}(${userId}, ${loggedUserId}, ${query ? "'" + query + "'" : null})`,
    );

    let responseResultsNumberOfFriends: {
      numberOfFriends: number;
    } = {
      numberOfFriends: 0,
    };

    if (resultsNumberOfFriends.length > 0 && resultsNumberOfFriends[0].length > 0 && resultsNumberOfFriends[0][0].length > 0) {
      responseResultsNumberOfFriends = resultsNumberOfFriends[0][0][0].numFriends
        ? {
            numberOfFriends: resultsNumberOfFriends[0][0][0].numFriends,
          }
        : { numberOfFriends: 0 };
    }

    return responseResultsNumberOfFriends.numberOfFriends;
  };

  public findFriendsByUserId = async (
    userId: number,
    loggedUserId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    friends: Array<{
      user: SmallUser;

      acceptedAt: Date | null;
    }>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetFriendsListExcludingBlockedUsers`;
    const StoredProcedureNameNumberOfFriends = this.StoredProcedureNameNumberOfFriends;

    let offsetRows = (page - 1) * count;
    let limitRows = count;
    const results = await knex.raw(
      `CALL ${StoredProcedureName}(${userId}, ${loggedUserId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`,
    );
    const resultsNumberOfFriends = await knex.raw(
      `CALL ${StoredProcedureNameNumberOfFriends}(${userId}, ${loggedUserId}, ${query ? "'" + query + "'" : null})`,
    );

    let responseResults: Array<{
      id: number;
      userId: number;
      friendId: number;
      acceptedAt: Date | null;
      user_userId: number;
      user_username: string;
      user_fullName: string;
      user_isVerified: boolean;
      user_profilePicImageKey: string | null;
      friend_userId: number;
      friend_username: string;
      friend_fullName: string;
      friend_isVerified: boolean;
      friend_profilePicImageKey: string | null;
    }> = [];
    let responseResultsNumberOfFriends: {
      numberOfFriends: number;
    } = {
      numberOfFriends: 0,
    };

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];
    }

    if (resultsNumberOfFriends.length > 0 && resultsNumberOfFriends[0].length > 0 && resultsNumberOfFriends[0][0].length > 0) {
      responseResultsNumberOfFriends = resultsNumberOfFriends[0][0][0].numFriends
        ? {
            numberOfFriends: resultsNumberOfFriends[0][0][0].numFriends,
          }
        : { numberOfFriends: 0 };
    }

    let friends: Array<{
      user: {
        id: number;
        username: string;
        fullName: string;
        isVerified: boolean;
        profilePictureUrl: string;
      };

      acceptedAt: Date | null;
    }> = [];

    if (responseResultsNumberOfFriends.numberOfFriends > 0) {
      await Promise.all(
        responseResults.map(async r => {
          let profilePictureUrl: string = await new UserService().findUserProfilePictureUrlById(
            r.user_userId === userId ? r.friend_userId : r.user_userId,
          );
          let user: {
            id: number;
            username: string;
            fullName: string;
            isVerified: boolean;
            profilePictureUrl: string;
          } = {
            id: r.user_userId === userId ? r.friend_userId : r.user_userId,
            username: r.user_userId === userId ? r.friend_username : r.user_username,
            fullName: r.user_userId === userId ? r.friend_fullName : r.user_fullName,
            isVerified: r.user_userId === userId ? boolean(r.friend_isVerified) : boolean(r.user_isVerified),
            profilePictureUrl: profilePictureUrl,
          };

          friends.push({
            user: user,
            acceptedAt: r.acceptedAt,
          });
        }),
      );
    }

    return {
      friends,
      pagination: {
        page: page,
        size: count,
        total: responseResultsNumberOfFriends.numberOfFriends,
        hasMore: page * count < responseResultsNumberOfFriends.numberOfFriends,
      },
    };
  };

  public findIncomingRequestsByUserId = async (
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    pendingRequests: Array<{
      user: SmallUser;

      pendingAt: Date | null;
    }>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetIncomingPendingFriendRequests`;
    const StoredProcedureNameNumberOfPendingRequests = `${DB_DATABASE}.GetNumberOfIncomingPendingFriendRequests`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`);
    const resultsNumberOfPendingRequests = await knex.raw(
      `CALL ${StoredProcedureNameNumberOfPendingRequests}(${userId}, ${query ? "'" + query + "'" : null})`,
    );

    let responseResults: Array<{
      id: number;
      userId: number;
      friendId: number;
      createdAt: Date | null;
      user_userId: number;
      user_username: string;
      user_fullName: string;
      user_isVerified: boolean;
      user_profilePicImageKey: string | null;
      friend_userId: number;
      friend_username: string;
      friend_fullName: string;
      friend_isVerified: boolean;
      friend_profilePicImageKey: string | null;
      isContact: boolean;
    }> = [];
    let responseResultsNumberOfPendingRequests: {
      numberOfPendingRequests: number;
    } = {
      numberOfPendingRequests: 0,
    };

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];
    }

    if (
      resultsNumberOfPendingRequests.length > 0 &&
      resultsNumberOfPendingRequests[0].length > 0 &&
      resultsNumberOfPendingRequests[0][0].length > 0
    ) {
      responseResultsNumberOfPendingRequests = resultsNumberOfPendingRequests[0][0][0].numIncomingPendingFriendRequests
        ? {
            numberOfPendingRequests: resultsNumberOfPendingRequests[0][0][0].numIncomingPendingFriendRequests,
          }
        : { numberOfPendingRequests: 0 };
    }

    let pending_requests: Array<{
      user: SmallUser;

      pendingAt: Date | null;
    }> = [];

    if (responseResultsNumberOfPendingRequests.numberOfPendingRequests > 0) {
      await Promise.all(
        responseResults.map(async r => {
          let profilePictureUrl: string = await new UserService().findUserProfilePictureUrlById(
            r.user_userId === userId ? r.friend_userId : r.user_userId,
          );
          let user: SmallUser = {
            id: r.user_userId === userId ? r.friend_userId : r.user_userId,
            username: r.user_userId === userId ? r.friend_username : r.user_username,
            fullName: r.user_userId === userId ? r.friend_fullName : r.user_fullName,
            isVerified: r.user_userId === userId ? boolean(r.friend_isVerified) : boolean(r.user_isVerified),
            profilePictureUrl: profilePictureUrl,

            isContact: boolean(r.isContact),
          };

          pending_requests.push({
            user: user,
            pendingAt: r.createdAt,
          });
        }),
      );
    }

    return {
      pendingRequests: pending_requests,
      pagination: {
        page: page,
        size: count,
        total: responseResultsNumberOfPendingRequests.numberOfPendingRequests,
        hasMore: page * count < responseResultsNumberOfPendingRequests.numberOfPendingRequests,
      },
    };
  };

  public findOutgoingRequestsByUserId = async (
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
  ): Promise<{
    pendingRequests: Array<{
      user: SmallUser;

      pendingAt: Date | null;
    }>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.GetOutgoingPendingFriendRequests`;
    const StoredProcedureNameNumberOfPendingRequests = `${DB_DATABASE}.GetNumberOfOutgoingPendingFriendRequests`;

    let offsetRows = (page - 1) * count;
    let limitRows = count;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null})`);
    const resultsNumberOfPendingRequests = await knex.raw(
      `CALL ${StoredProcedureNameNumberOfPendingRequests}(${userId}, ${query ? "'" + query + "'" : null})`,
    );

    let responseResults: Array<{
      id: number;
      userId: number;
      friendId: number;
      createdAt: Date | null;
      user_userId: number;
      user_username: string;
      user_fullName: string;
      user_isVerified: boolean;
      user_profilePicImageKey: string | null;
      friend_userId: number;
      friend_username: string;
      friend_fullName: string;
      friend_isVerified: boolean;
      friend_profilePicImageKey: string | null;
      isContact: boolean;
    }> = [];
    let responseResultsNumberOfPendingRequests: {
      numberOfPendingRequests: number;
    } = {
      numberOfPendingRequests: 0,
    };

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];
    }

    if (
      resultsNumberOfPendingRequests.length > 0 &&
      resultsNumberOfPendingRequests[0].length > 0 &&
      resultsNumberOfPendingRequests[0][0].length > 0
    ) {
      responseResultsNumberOfPendingRequests = resultsNumberOfPendingRequests[0][0][0].numOutgoingPendingFriendRequests
        ? {
            numberOfPendingRequests: resultsNumberOfPendingRequests[0][0][0].numOutgoingPendingFriendRequests,
          }
        : { numberOfPendingRequests: 0 };
    }

    let pending_requests: Array<{
      user: SmallUser;

      pendingAt: Date | null;
    }> = [];

    if (responseResultsNumberOfPendingRequests.numberOfPendingRequests > 0) {
      await Promise.all(
        responseResults.map(async r => {
          let profilePictureUrl: string = await new UserService().findUserProfilePictureUrlById(
            r.user_userId === userId ? r.friend_userId : r.user_userId,
          );
          let user: SmallUser = {
            id: r.user_userId === userId ? r.friend_userId : r.user_userId,
            username: r.user_userId === userId ? r.friend_username : r.user_username,
            fullName: r.user_userId === userId ? r.friend_fullName : r.user_fullName,
            isVerified: r.user_userId === userId ? boolean(r.friend_isVerified) : boolean(r.user_isVerified),
            profilePictureUrl: profilePictureUrl,

            isContact: boolean(r.isContact),
          };

          pending_requests.push({
            user: user,
            pendingAt: r.createdAt,
          });
        }),
      );
    }

    return {
      pendingRequests: pending_requests,
      pagination: {
        page: page,
        size: count,
        total: responseResultsNumberOfPendingRequests.numberOfPendingRequests,
        hasMore: page * count < responseResultsNumberOfPendingRequests.numberOfPendingRequests,
      },
    };
  };

  public findCommonFriends = async (
    loggedUserId: number,
    visitedUserId: number,
    limitVal: number = 10,
  ): Promise<{
    users: Array<{
      id: number;
      username: string;
      fullName: string;
      isVerified: boolean;
      profilePictureUrl: string;
    }>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const StoredProcedureName = `${DB_DATABASE}.FindCommonFriends`;

    const results = await knex.raw(`CALL ${StoredProcedureName}(${loggedUserId}, ${visitedUserId}, ${limitVal})`);

    let responseResults: Array<{
      commonFriendId: number;
      username: string;
      fullName: string;
      isVerified: boolean;
      profilePicImageKey: string;
      numCommonFriends: number;
    }> = [];
    let total = 0;

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];

      if (results[0][0].length > 0) {
        total = results[0][0][0].numCommonFriends;
      }
    }

    let users: Array<{
      id: number;
      username: string;
      fullName: string;
      isVerified: boolean;
      profilePictureUrl: string;
    }> = [];

    if (total && total > 0) {
      await Promise.all(
        responseResults.map(async r => {
          let profilePictureUrl: string = await new UserService().findUserProfilePictureUrlById(r.commonFriendId);

          users.push({
            id: r.commonFriendId,
            username: r.username,
            fullName: r.fullName,
            isVerified: boolean(r.isVerified),
            profilePictureUrl: profilePictureUrl,
          });
        }),
      );
    }

    return {
      users: users,
      pagination: {
        page: 1,
        size: limitVal,
        total: total,
        hasMore: false,
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
