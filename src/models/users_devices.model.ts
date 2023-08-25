import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { UserDevice } from '@/interfaces/users_devices.interface';
import { Devices } from './devices.model';
import { Users } from './users.model';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class UsersDevices extends softDelete(Model) implements UserDevice {
  id!: number;
    userId!: number;
    deviceId!: number;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'users_devices'; // database table name
  static idColumn = 'id'; // id column name

  static relationMappings = {
    device: {
        relation: Model.BelongsToOneRelation,
        modelClass: Devices,
        join: {
            from: 'users_devices.deviceId',
            to: 'devices.id',
        },
        filter: (f) => f.whereNotDeleted(),
    },
    user: {
        relation: Model.BelongsToOneRelation,
        modelClass: Users,
        join: {
            from: 'users_devices.userId',
            to: 'users.id',
        },
        filter: (f) => f.whereNotDeleted(),
    },
  };

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type UsersDevicesShape = ModelObject<UsersDevices>;
