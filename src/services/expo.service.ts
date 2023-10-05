import { EXPO_ACCESS_TOKEN } from '@/config';
import { CreateNotificationTicketDto } from '@/dtos/notifications_tickets.dto';
import { Notification } from '@/interfaces/notifications.interface';
import { User } from '@/interfaces/users.interface';
import { ExpoPushTokens } from '@/models/expo_push_tokens.model';
import { NotificationsTickets } from '@/models/notifications_tickets.model';
import { Users } from '@/models/users.model';
import { isExpoPushSuccessTicket } from '@/utils/notifications';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
let expo = new Expo({ accessToken: EXPO_ACCESS_TOKEN });

class ExpoService {
  public async sendSnapSyncNotification(notification: Notification, owner: User, key: string): Promise<void> {
    const user = await Users.query().findById(notification.userId);

    let expoPushTokens: string[] = [];

    if (user) {
      // Recupero gli expoPushTokens degli utenti
      let dbExpoPushTokens = await ExpoPushTokens.query().where('userId', user.id);

      // Estraggo gli expoPushTokens
      expoPushTokens = dbExpoPushTokens.map(expoPushToken => expoPushToken.token);
    }

    if (expoPushTokens.length === 0) return;

    // Create the messages that you want to send to clients
    let messages: ExpoPushMessage[] = [];

    for (let pushToken of expoPushTokens) {
      // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(pushToken)) {
        // console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
      messages.push({
        to: pushToken,
        sound: 'default',
        title: 'SnapSync',
        body: `Join ${owner.username} and sync!`,
        data: { key: key, type: 'JOIN_SNAP' },
      });
    }

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (let chunk of chunks) {
        try {
          let ticketChunk: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
          const ntDtos: CreateNotificationTicketDto[] = [];

          for (let i = 0; i < ticketChunk.length; i++) {
            let ticket = ticketChunk[i];
            let token = chunk[i].to;

            if (ticket) {
              if (isExpoPushSuccessTicket(ticket)) {
                if (token) {
                  ntDtos.push({
                    notificationId: notification.id,
                    expoTicketId: ticket.id,
                    expoPushToken: token,
                  } as CreateNotificationTicketDto);
                }
              } else {
                // NOTE: If a ticket contains an error code in ticket.details.error, you
                // must handle it appropriately. The error codes are listed in the Expo
                // documentation:
                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors

                let error: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded' | null = ticket.details.error;

                if (error === 'DeviceNotRegistered' && token) {
                  // The device cannot receive push notifications anymore and you should stop sending messages to the corresponding Expo push token
                  await ExpoPushTokens.query().where('token', token).delete();
                }
              }
            }
          }

          await NotificationsTickets.query().insertGraph(ntDtos);

          tickets.push(...ticketChunk);
        } catch (error) {
          // TODO: Creare un log
          // console.error(error);
        }
      }
    })();

    return;
  }

  public async chunkPushNotificationReceiptIds(receiptIds: string[]): Promise<void> {
    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    (async () => {
      // Like sending notifications, there are different strategies you could use
      // to retrieve batches of receipts from the Expo service.
      for (let chunk of receiptIdChunks) {
        try {
          let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
          // console.log(receipts);

          // The receipts specify whether Apple or Google successfully received the
          // notification and information about an error, if one occurred.
          for (let receiptId in receipts) {
            let r = receipts[receiptId];
            if (r.status === 'ok') {
              continue;
            } else if (r.status === 'error') {
              let { details } = r;

              if (details && details.error) {
                // The error codes are listed in the Expo documentation:
                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                // You must handle the errors appropriately.

                if (details.error === 'DeviceNotRegistered') {
                  // The device is not longer registered with Expo. You should stop sending
                  // notifications to this device.

                  // Recupero il ticket
                  const nt = await NotificationsTickets.query().findOne({ expoTicketId: receiptId });
                  if (nt) {
                    await ExpoPushTokens.query().where('token', nt.expoPushToken).delete();
                    await NotificationsTickets.query().deleteById(nt.id);
                  }
                }
              }
            } else {
              // console.log('Receipt status: unknown', r);
              continue;
            }
          }
        } catch (error) {
          // TODO: Creare un log
          // console.error(error);
        }
      }
    })();

    return;
  }
}

export default ExpoService;
