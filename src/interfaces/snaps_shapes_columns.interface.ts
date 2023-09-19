export interface SnapShapeColumn {
  id: number;
  snapShapeId: number;
  snapShapeRowId: number;
  snapShapePositionId: number;

  column: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
