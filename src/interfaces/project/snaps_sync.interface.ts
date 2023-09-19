import { SnapShapePosition } from '../snaps_shapes_positions.interface';

export interface SnapSyncShape {
  id: number;
  grid: string[][];
  name: string;
  numberOfUsers: number;
  iconUrl: string;
  rows: number;
  columns: number;
  spacing: number;
  width: number;
  height: number;
  focusedIconUrl: string;
  positions: Array<SnapShapePosition>;
}
