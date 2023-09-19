export interface SnapSyncComment {
  id: number;
  userId: number;
  snapSyncId: number;
  snapSyncParentCommentId: number | null;
  text: string | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
