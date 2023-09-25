import { HttpException } from '@/exceptions/HttpException';
import { SnapSync } from '@/interfaces/snaps_sync.interface';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';
import { Users } from '@/models/users.model';

class SnapSyncService {
  public async findSnapSyncById(snapSyncId: number): Promise<SnapSync> {
    const findOneData = await SnapsSync.query().whereNotDeleted().findById(snapSyncId);
    if (!findOneData) throw new HttpException(404, "SnapSync doesn't exist");

    return findOneData;
  }

  public async findSnapsCountByUserId(userId: number, viewerId: number): Promise<number> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const snapsCount = await SnapsSyncUsers.query().whereNotDeleted().where({ userId }).resultSize();

    return snapsCount;
  }
}

export default SnapSyncService;
