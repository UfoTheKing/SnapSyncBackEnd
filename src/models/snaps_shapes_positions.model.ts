import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { boolean } from 'boolean';
import { SnapShapePosition } from '@/interfaces/snaps_shapes_positions.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsShapesPositions extends softDelete(Model) implements SnapShapePosition {
  id!: number;
  snapShapeId!: number;
  name!: string;

  ownerPosition!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'snaps_shapes_positions';
  static idColumn = 'id';

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    json.ownerPosition = boolean(json.ownerPosition);

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;
    delete json.unarchived;
    return json;
  }
}

export type SnapsShapesPositionsShape = ModelObject<SnapsShapesPositions>;
