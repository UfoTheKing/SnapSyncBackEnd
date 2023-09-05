import { Model, ModelObject } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { SnapInstance } from '@/interfaces/snaps_instances.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsInstances extends softDelete(Model) implements SnapInstance {
  id!: number;
  userId!: number;
  snapShapeId!: number;
  instanceKey!: string;

  timerStarted!: boolean;
  timerDurationMinutes!: number;
  timerDurationSeconds!: number;
  timerStartAt: Date | null;

  imageKey!: string | null;
  collageCreatedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'snaps_instances';
  static idColumn = 'id';
}

export type SnapsInstancesShape = ModelObject<SnapsInstances>;