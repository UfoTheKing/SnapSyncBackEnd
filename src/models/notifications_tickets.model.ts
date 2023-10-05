import { Model, ModelObject, Pojo } from 'objection';
import { NotificationTicket } from '@/interfaces/notifications_tickets.interface';

export class NotificationsTickets extends Model implements NotificationTicket {
  id!: number;
  notificationId!: number;
  expoTicketId!: string;
  expoPushToken!: string;

  createdAt!: Date;
  updatedAt!: Date;

  unarchived!: boolean;

  static tableName = 'notifications_tickets'; // database table name
  static idColumn = 'id'; // id column name

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    delete json.createdAt;
    delete json.updatedAt;

    return json;
  }
}

export type NotificationsTicketsShape = ModelObject<NotificationsTickets>;
