export interface SnapSync {
  id: number;
  userId: number;
  snapShapeId: number;
  snapInstanceId: number;
  imageKey: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
