export interface SnapSyncComment {
  id: number;
  userId: number;
  snapSyncId: number;
  snapSyncParentCommentId: number | null;
  text: string | null;

  createdAtUtc: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
