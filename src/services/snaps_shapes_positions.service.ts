import { SnapShapePosition } from '@/interfaces/snaps_shapes_positions.interface';
import { SnapsShapesPositions } from '@/models/snaps_shapes_positions.model';

class SnapShapePositionService {
  public async findAllSnapsShapesPositionsBySnapShapeId(snapShapeId: number): Promise<SnapShapePosition[]> {
    const data = await SnapsShapesPositions.query().whereNotDeleted().where('snapShapeId', snapShapeId).orderBy('id', 'asc');

    return data;
  }
}

export default SnapShapePositionService;
