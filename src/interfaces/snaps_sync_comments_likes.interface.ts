export interface SnapSyncCommentLike {
  id: number;
  userId: number;
  snapSyncCommentId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
