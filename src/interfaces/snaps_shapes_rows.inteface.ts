export interface SnapShapeRow {
  id: number;
  snapShapeId: number;
  row: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
