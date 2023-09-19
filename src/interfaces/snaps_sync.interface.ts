export interface SnapSync {
  id: number;
  userId: number;
  snapShapeId: number;
  snapInstanceId: number;

  s3CollageKey: string;
  blurHash: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
