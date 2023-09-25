import { Model, ModelObject } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { SnapSync } from '@/interfaces/snaps_sync.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsSync extends softDelete(Model) implements SnapSync {
  id!: number;
  userId!: number;
  snapInstanceId!: number;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'snaps_sync';
  static idColumn = 'id';
}

export type SnapsSyncShape = ModelObject<SnapsSync>;
