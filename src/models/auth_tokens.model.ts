import { Model, ModelObject } from 'objection';
import { AuthToken } from '@/interfaces/auth_tokens.interface';
import { UsersDevices } from './users_devices.model';
import { Users } from './users.model';
import { Devices } from './devices.model';

export class AuthTokens extends Model implements AuthToken {
  id!: number;
  userId!: number;
  deviceId!: number;
  userDeviceId!: number;
  selector!: string;
  hashedValidator!: string;
  lastUsedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;

  static tableName = 'auth_tokens';
  static idColumn = 'id';

  static relationMappings = {
    userDevice: {
      relation: Model.BelongsToOneRelation,
      modelClass: UsersDevices,
      join: {
        from: 'auth_tokens.userDeviceId',
        to: `${UsersDevices.tableName}.id`,
      },
      filter: f => f.whereNotDeleted(),
    },
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: Users,
      join: {
        from: 'auth_tokens.userId',
        to: `${Users.tableName}.id`,
      },
      filter: f => f.whereNotDeleted(),
    },
    device: {
      relation: Model.BelongsToOneRelation,
      modelClass: Devices,
      join: {
        from: 'auth_tokens.deviceId',
        to: `${Devices.tableName}.id`,
      },
      filter: f => f.whereNotDeleted(),
    },
  };
}

export type AuthTokensShape = ModelObject<AuthTokens>;
