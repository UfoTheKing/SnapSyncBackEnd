import { CreateSnapSyncDto } from '@/dtos/snaps_sync.dto';
import { CreateSnapSyncUserDto } from '@/dtos/snaps_sync_users.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapSync } from '@/interfaces/snaps_sync.interface';
import { SnapsInstances } from '@/models/snaps_instances.model';
import { SnapsInstancesUsers } from '@/models/snaps_instances_users.model';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';
import { isEmpty } from '@/utils/util';

class SnapSyncService {
  public async createSnapSync(data: CreateSnapSyncDto): Promise<SnapSync> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(data.snapInstanceId);
    if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");

    if (!findSnapInstance.imageKey) throw new HttpException(400, "SnapSync doesn't have an image");
    if (!findSnapInstance.collageCreatedAt) throw new HttpException(400, "SnapSync doesn't have a collage");

    // Controllo se l'utente ha aspettato 20 secondi prima di pubblicare il collage
    const collageCreatedAt = new Date(findSnapInstance.collageCreatedAt);
    const now = new Date();
    const diff = now.getTime() - collageCreatedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 20) throw new HttpException(400, 'Ops! You have to wait 20 seconds before publishing the collage');

    const users = await SnapsInstancesUsers.query().whereNotDeleted().where({ snapInstanceId: data.snapInstanceId });

    const trx = await SnapsSync.startTransaction();

    try {
      const createSnapSyncData: SnapSync = await SnapsSync.query(trx).insert({
        userId: findSnapInstance.userId,
        snapShapeId: findSnapInstance.snapShapeId,
        snapInstanceId: findSnapInstance.id,
        imageKey: findSnapInstance.imageKey,
      });

      await Promise.all(
        users.map(async userData => {
          await SnapsSyncUsers.query(trx).insert({
            userId: userData.userId,
            snapShapePositionId: userData.snapShapePositionId,
            snapSyncId: createSnapSyncData.id,
          });
        }),
      );

      await trx.commit();

      return createSnapSyncData;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

export default SnapSyncService;
