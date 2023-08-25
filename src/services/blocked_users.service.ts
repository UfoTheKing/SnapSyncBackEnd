import { CreateBlockedUserDto, DestroyBlockedUserDto } from "@/dtos/blocked_users.dto";
import { HttpException } from "@/exceptions/HttpException";
import { BlockedUser } from "@/interfaces/blocked_users.interface";
import { BlockedUsers } from "@/models/blocked_users.model";
import { Users } from "@/models/users.model";
import { isEmpty } from "@/utils/util";
import Objection from "objection";
import FriendshipStatusService from "./friendship_status.service";
import { Friends } from "@/models/friends.model";

class BlockedUserService {
  public async createBlockedUser(data: CreateBlockedUserDto): Promise<BlockedUser> {
    if (isEmpty(data)) throw new HttpException(400, "Ops! Data is empty");

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User not found");

    const findBlockedUser = await Users.query().whereNotDeleted().findById(data.blockedUserId);
    if (!findBlockedUser) throw new HttpException(404, "Blocked user not found");

    if (findUser.id === findBlockedUser.id) throw new HttpException(400, "You can't block yourself");

    let friendshipStatus = await new FriendshipStatusService().getFriendshipStatus(findUser.id, findBlockedUser.id);

    // Controllo se il findUser ha già bloccato il findBlockedUser
    let isBlocking = await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).first();
    if (isBlocking) throw new HttpException(409 , "User already blocked");

    // Controllo se il findBlockedUser ha già bloccato il findUser
    let isBlockingTwo = await BlockedUsers.query().whereNotDeleted().where('userId', findBlockedUser.id).where('blockedUserId', findUser.id).first();
    if (isBlockingTwo) throw new HttpException(404, "User not found");

    const trx = await BlockedUsers.startTransaction();

    try {
      // Creo il record nella tabella blocked_users
      const blockedUser = await BlockedUsers.query(trx).insert({
        userId: findUser.id,
        blockedUserId: findBlockedUser.id
      });

      // TODO: Elimino le stories_reactions fatte dal findUser al findBlockedUser

      // TODO: Elimino le stories_reactions fatte dal findBlockedUser al findUser

      // Se sono amici allora li rimuovo dalla lista degli amici
      if (friendshipStatus.isFriend || friendshipStatus.incomingRequest || friendshipStatus.outgoingRequest) {
        // Elimino tutti i record nella tabella dove friendshipHash = LOWEST(USERID, FRIENDID)_HIGHEST(USERID, FRIENDID)
        let lowestUserId = findUser.id < findBlockedUser.id ? findUser.id : findBlockedUser.id;
        let highestUserId = findUser.id > findBlockedUser.id ? findUser.id : findBlockedUser.id;
        let friendshipHash = `${lowestUserId}_${highestUserId}`;

        await Friends.query(trx).whereNotDeleted().where('friendshipHash', friendshipHash).delete();
      } 

      await trx.commit();
  
      return blockedUser;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  public async destroyBlockedUser(data: DestroyBlockedUserDto): Promise<void> {
    if (isEmpty(data)) throw new HttpException(400, "Ops! Data is empty");

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User not found");

    const findBlockedUser = await Users.query().whereNotDeleted().findById(data.blockedUserId);
    if (!findBlockedUser) throw new HttpException(404, "Blocked user not found");

    if (findUser.id === findBlockedUser.id) throw new HttpException(400, "You can't block yourself");

    const blockedUser = await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).first();
    if (!blockedUser) throw new HttpException(404, "Ops! User is not blocked");

    await BlockedUsers.query().whereNotDeleted().where('userId', findUser.id).where('blockedUserId', findBlockedUser.id).delete();
  }

  public async isBlocking(userId: number, blockedUserId: number, trx?: Objection.Transaction): Promise<boolean> {
    let isBlocking = await BlockedUsers.query(trx).whereNotDeleted().where('userId', userId).where('blockedUserId', blockedUserId).first();
    if (isBlocking) return true;

    return false;
  }
}

export default BlockedUserService;