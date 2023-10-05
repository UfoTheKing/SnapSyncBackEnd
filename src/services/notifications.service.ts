import { HttpException } from '@/exceptions/HttpException';
import { Notifications } from '@/models/notifications.model';
import { NotificationsTypes } from '@/models/notifications_types.model';
import { Users } from '@/models/users.model';
import { NotificationType } from '@/utils/enums';

class NotificationService {
  public async findActivityBadgeCountsByUserId(userId: number): Promise<{
    comments: number | null;
    reactions: number | null;
    relationships: number | null;
  }> {
    const findUser = await Users.query().whereNotDeleted().findById(userId).first();
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    // Recupero le notifiche legate all'utente dove read = false

    // Notifiche di Amicizia
    const friendRequestAccepted = await NotificationsTypes.query()
      .whereNotDeleted()
      .where({
        name: NotificationType.FriendRequestAccepted,
      })
      .first();

    const friendRequestReceived = await NotificationsTypes.query()
      .whereNotDeleted()
      .where({
        name: NotificationType.FriendRequestReceived,
      })
      .first();

    let relationshipsIds: number[] = [];
    if (friendRequestAccepted) {
      relationshipsIds.push(friendRequestAccepted.id);
    }
    if (friendRequestReceived) {
      relationshipsIds.push(friendRequestReceived.id);
    }

    let relationships: number | null = null;

    if (relationshipsIds.length > 0) {
      const countNotReadRelationships = await Notifications.query()
        .whereNotDeleted()
        .where({
          userId: findUser.id,
          read: false,
        })
        .whereIn('notificationTypeId', relationshipsIds)
        .resultSize();

      if (countNotReadRelationships > 0) {
        relationships = countNotReadRelationships;
      }
    }

    return {
      comments: null,
      reactions: null,
      relationships: relationships,
    };
  }

  public async findUnreadNotificationsCountByUserId(userId: number): Promise<number> {
    const findUser = await Users.query().whereNotDeleted().findById(userId).first();
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const countNotReadNotifications = await Notifications.query()
      .whereNotDeleted()
      .where({
        userId: findUser.id,
        read: false,
      })
      .resultSize();

    return countNotReadNotifications;
  }
}

export default NotificationService;
