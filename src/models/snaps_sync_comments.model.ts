import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { SnapSyncComment } from '@/interfaces/snaps_sync_comments.interface';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsSyncComments extends softDelete(Model) implements SnapSyncComment {
  id!: number;
  userId!: number;
  snapSyncId!: number;
  snapSyncParentCommentId!: number | null;

  text!: string | null;

  createdAtUtc!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'snaps_sync_comments'; // database table name
  static idColumn = 'id'; // id column name

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type SnapsSyncCommentsShape = ModelObject<SnapsSyncComments>;
