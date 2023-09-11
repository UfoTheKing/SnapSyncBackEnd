import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { SnapSyncCommentLike } from '@/interfaces/snaps_sync_comments_likes.interface';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class SnapsSyncCommentsLikes extends softDelete(Model) implements SnapSyncCommentLike {
  id!: number;
  userId!: number;
  snapSyncCommentId!: number;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'snaps_sync_comments_likes'; // database table name
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

export type SnapsSyncCommentsLikesShape = ModelObject<SnapsSyncCommentsLikes>;
