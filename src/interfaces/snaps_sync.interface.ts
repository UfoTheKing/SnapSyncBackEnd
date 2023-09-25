export interface SnapSync {
  id: number;
  userId: number;
  snapInstanceId: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
