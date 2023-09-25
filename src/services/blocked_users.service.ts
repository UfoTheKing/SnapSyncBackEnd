import { CreateBlockedUserDto, DestroyBlockedUserDto } from '@/dtos/blocked_users.dto';
import { HttpException } from '@/exceptions/HttpException';
import { BlockedUser } from '@/interfaces/blocked_users.interface';
import { BlockedUsers } from '@/models/blocked_users.model';
import { Users } from '@/models/users.model';
import { isEmpty } from '@/utils/util';
import Objection from 'objection';
import FriendshipStatusService from './friendship_status.service';
import { Friends } from '@/models/friends.model';
import FriendService from './friends.service';
import { SmallUser } from '@/interfaces/users.interface';
import UserService from './users.service';

class BlockedUserService {
  public findLoggedUserBlockedUsers = async (
    loggedUserId: number,
    page: number = 1,
    count: number = 12,
  ): Promise<{
    users: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> => {
    const findLoggedUser = await Users.query().whereNotDeleted().findById(loggedUserId);
    if (!findLoggedUser) throw new HttpException(404, 'User not found');

    const blockedUsers = await BlockedUsers.query()
      .whereNotDeleted()
      .where('userId', findLoggedUser.id)
      .page(page - 1, count);

    let users: Array<SmallUser> = [];

    for (let i = 0; i < blockedUsers.results.length; i++) {
      try {
        let sUser = await new UserService().findSmallUserById(blockedUsers.results[i].blockedUserId);
        users.push(sUser);
      } catch (error) {
        // Non faccio nulla
      }
    }

    return {
      users: users,
      pagination: {
        page: page,
        size: count,
        total: blockedUsers.total,
        hasMore: page * count < blockedUsers.total,
      },
    };
  };

  public async createBlockedUser(data: CreateBlockedUserDto): Promise<BlockedUser> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, 'User not found');

    const findBlockedUser = await Users.query().whereNotDeleted().findById(data.blockedUserId);
    if (!findBlockedUser) throw new HttpException(404, 'Blocked user not found');

    if (findUser.id === findBlockedUser.id) throw new HttpException(400, "You can't block yourself");

    let friendshipStatus = await new FriendshipStatusService().getFriendshipStatus(findUser.id, findBlockedUser.id);

    // Controllo se il findUser ha già bloccato il findBlockedUser
    let isBlocking = await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).first();
    if (isBlocking) throw new HttpException(409, 'User already blocked');

    // Controllo se il findBlockedUser ha già bloccato il findUser
    let isBlockingTwo = await BlockedUsers.query().whereNotDeleted().where('userId', findBlockedUser.id).where('blockedUserId', findUser.id).first();
    if (isBlockingTwo) throw new HttpException(404, 'User not found');

    const trx = await BlockedUsers.startTransaction();

    try {
      // Creo il record nella tabella blocked_users
      const blockedUser = await BlockedUsers.query(trx).insert({
        userId: findUser.id,
        blockedUserId: findBlockedUser.id,
      });

      // Se sono amici allora li rimuovo dalla lista degli amici
      if (friendshipStatus.isFriend || friendshipStatus.incomingRequest || friendshipStatus.outgoingRequest) {
        // Elimino tutti i record nella tabella dove friendshipHash = LOWEST(USERID, FRIENDID)_HIGHEST(USERID, FRIENDID)
        let friendshipHash = new FriendService().generateFriendshipHash(findUser.id, findBlockedUser.id);

        await Friends.query(trx).whereNotDeleted().where('friendshipHash', friendshipHash).delete();
      }

      // Elimino le snaps_instances dove userId = findUser.id e memberId = findBlockedUser.id
      // await SnapsInstances.query(trx).whereNotDeleted().where('userId', findUser.id).where('memberId', findBlockedUser.id).delete();

      // Elimino le snaps_instances dove userId = findBlockedUser.id e memberId = findUser.id
      // await SnapsInstances.query(trx).whereNotDeleted().where('userId', findBlockedUser.id).where('memberId', findUser.id).delete();

      await trx.commit();

      return blockedUser;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  public async destroyBlockedUser(data: DestroyBlockedUserDto): Promise<void> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, 'User not found');

    const findBlockedUser = await Users.query().whereNotDeleted().findById(data.blockedUserId);
    if (!findBlockedUser) throw new HttpException(404, 'Blocked user not found');

    if (findUser.id === findBlockedUser.id) throw new HttpException(400, "You can't block yourself");

    const blockedUser = await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).first();
    if (!blockedUser) throw new HttpException(404, 'Ops! User is not blocked');

    await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).delete();
  }

  public async isBlocking(userId: number, blockedUserId: number, trx?: Objection.Transaction): Promise<boolean> {
    let isBlocking = await BlockedUsers.query(trx).whereNotDeleted().where('userId', userId).where('blockedUserId', blockedUserId).first();
    if (isBlocking) return true;

    return false;
  }
}

export default BlockedUserService;
