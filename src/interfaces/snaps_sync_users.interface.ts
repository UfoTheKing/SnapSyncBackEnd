export interface SnapSyncUser {
  id: number;
  userId: number;
  snapSyncId: number;
  snapShapePositionId: number;
  locationId: number | null;

  snappedAtUtc: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
