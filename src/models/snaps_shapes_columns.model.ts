import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { boolean } from 'boolean';
import { SnapShapePosition } from '@/interfaces/snaps_shapes_positions.interface';
import { SnapShapeRow } from '@/interfaces/snaps_shapes_rows.inteface';
import { SnapShapeColumn } from '@/interfaces/snaps_shapes_columns.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsShapesColumns extends softDelete(Model) implements SnapShapeColumn {
  id!: number;
  snapShapeId!: number;
  snapShapeRowId!: number;
  snapShapePositionId!: number;

  column!: number;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'snaps_shapes_columns';
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

export type SnapsShapesColumnsShape = ModelObject<SnapsShapesColumns>;
