export interface SnapSyncUser {
  id: number;
  userId: number;
  snapSyncId: number;
  snapShapePositionId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
