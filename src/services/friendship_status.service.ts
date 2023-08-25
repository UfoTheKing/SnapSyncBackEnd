import { HttpException } from "@/exceptions/HttpException";
import { FriendshipStatus } from "@/interfaces/friendship_status.interface";
import { BlockedUsers } from "@/models/blocked_users.model";
import { Friends } from "@/models/friends.model";
import { FriendshipStatuses } from "@/models/friendship_statuses.model";
import { Users } from "@/models/users.model";
import { FriendshipStatus as EnumFriendshipStatus } from "@/utils/enums";

class FriendshipStatusService {
    public async getFriendshipStatus(loggedUserId: number, friendId: number): Promise<FriendshipStatus> {
        let loggedUser = await Users.query().whereNotDeleted().findById(loggedUserId);
        if (!loggedUser) throw new HttpException(404, "User not found");

        let findFriend = await Users.query().whereNotDeleted().findById(friendId);
        if (!findFriend) throw new HttpException(404, "Friend not found");

        let isBlocking = await BlockedUsers.query().whereNotDeleted().where({
            userId: loggedUserId,
            blockedUserId: friendId
        }).first();

        let acceptedFriendshipStatus = await FriendshipStatuses.query().whereNotDeleted().where({
            name: EnumFriendshipStatus.Accepted
        }).first();
        if (!acceptedFriendshipStatus) throw new HttpException(404, "Friendship status not found");

        let lowestUserId = loggedUserId < friendId ? loggedUserId : friendId;
        let highestUserId = loggedUserId > friendId ? loggedUserId : friendId;
        let friendshipHash = lowestUserId + "_" + highestUserId;
        let isFriend = await Friends.query().whereNotDeleted().where({
            friendshipHash: friendshipHash,
            friendshipStatusId: acceptedFriendshipStatus.id
        }).first();

        let incomingRequest = false;
        let outgoingRequest = false;

        if (!isFriend) {
            let pendingFriendshipStatus = await FriendshipStatuses.query().whereNotDeleted().where({
                name: EnumFriendshipStatus.Pending
            }).first();
            if (!pendingFriendshipStatus) throw new HttpException(404, "Friendship status not found");

            let iRequest = await Friends.query().whereNotDeleted().where({
                friendshipHash: friendshipHash,
                friendshipStatusId: pendingFriendshipStatus.id,
                userId: friendId,
                friendId: loggedUserId
            }).first();
            if (iRequest) incomingRequest = true;

            if (!incomingRequest) {
                let oRequest = await Friends.query().whereNotDeleted().where({
                    friendshipHash: friendshipHash,
                    friendshipStatusId: pendingFriendshipStatus.id,
                    userId: loggedUserId,
                    friendId: friendId
                }).first();
                if (oRequest) outgoingRequest = true;
            }
        }

        return {
            isFriend: isFriend ? true : false,
            incomingRequest: incomingRequest,
            outgoingRequest: outgoingRequest,

            isBlocking: isBlocking ? true : false
        };
    }
}   

export default FriendshipStatusService;