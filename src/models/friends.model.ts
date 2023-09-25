import { Model, ModelObject } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { Friend } from '@/interfaces/friends.interface';
import { Users } from './users.model';
import { FriendshipStatuses } from './friendship_statuses.model';
import { User } from '@/interfaces/users.interface';
import { FriendshipStatus } from '@/interfaces/friendship_statuses.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class Friends extends softDelete(Model) implements Friend {
  id!: number;
  userId!: number;
  friendId!: number;
  friendshipStatusId!: number;
  acceptedAt!: Date | null;
  rejectedAt!: Date | null;
  snapSyncStreak!: number;
  lastSnapSync!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;
  friendshipHash!: string;

  user?: User;
  friend?: User;
  friendshipStatus?: FriendshipStatus;

  static tableName = 'friends';
  static idColumn = 'id';

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: Users,
      join: {
        from: `${Friends.tableName}.userId`,
        to: `${Users.tableName}.${Users.idColumn}`,
      },
      filter: f => f.whereNotDeleted(),
    },
    friend: {
      relation: Model.BelongsToOneRelation,
      modelClass: Users,
      join: {
        from: `${Friends.tableName}.friendId`,
        to: `${Users.tableName}.${Users.idColumn}`,
      },
      filter: f => f.whereNotDeleted(),
    },
    friendshipStatus: {
      relation: Model.BelongsToOneRelation,
      modelClass: FriendshipStatuses,
      join: {
        from: `${Friends.tableName}.friendshipStatusId`,
        to: `${FriendshipStatuses.tableName}.${FriendshipStatuses.idColumn}`,
      },
      filter: f => f.whereNotDeleted(),
    },
  };
}

export type FriendsShape = ModelObject<Friends>;
