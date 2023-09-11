import { Model, ModelObject } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { SnapSyncUser } from '@/interfaces/snaps_sync_users.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsSyncUsers extends softDelete(Model) implements SnapSyncUser {
  id!: number;
  snapSyncId!: number;
  userId!: number;
  snapShapePositionId!: number;
  locationId!: number | null;

  snappedAtUtc!: Date;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'snaps_sync_users';
  static idColumn = 'id';
}

export type SnapsSyncUsersShape = ModelObject<SnapsSyncUsers>;
