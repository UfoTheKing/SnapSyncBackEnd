export interface SnapSyncUser {
  id: number;
  userId: number;
  snapSyncId: number;
  locationId: number | null;

  s3ImageKey: string;
  snappedAt: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
