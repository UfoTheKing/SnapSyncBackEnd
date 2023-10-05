import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { Notification } from '@/interfaces/notifications.interface';
import { boolean } from 'boolean';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class Notifications extends softDelete(Model) implements Notification {
  id!: number;
  userId!: number;
  notificationTypeId!: number;
  friendId!: number | null;
  snapSyncId!: number | null;

  data!: any | null;
  title!: string | null;
  subtitle!: string | null;
  body!: string | null;
  sound!: string | null;
  ttl!: number | null;
  expiration!: number | null;
  priority!: string | null;
  badge!: number | null;
  channelId!: string | null;
  categoryId!: string | null;
  mutableContent!: boolean | null;

  read!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'notifications'; // database table name
  static idColumn = 'id'; // id column name

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    json.read = boolean(json.read);

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type NotificationsShape = ModelObject<Notifications>;
