import { CreateSnapSyncDto } from '@/dtos/snaps_sync.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapSync } from '@/interfaces/snaps_sync.interface';
import { SnapsInstances } from '@/models/snaps_instances.model';
import { SnapsInstancesUsers } from '@/models/snaps_instances_users.model';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';
import { isEmpty } from '@/utils/util';
import { GetObjectCommand, GetObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Users } from '@/models/users.model';
import moment from 'moment';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

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

  public async createSnapSync(data: CreateSnapSyncDto): Promise<SnapSync> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');

    const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(data.snapInstanceId);
    if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");

    if (!findSnapInstance.cdlPublicId || !findSnapInstance.cdlPublicUrl) throw new HttpException(400, "SnapSync doesn't have an image");
    if (!findSnapInstance.collageCreatedAt) throw new HttpException(400, "SnapSync doesn't have a collage");

    // Controllo se l'utente ha aspettato 20 secondi prima di pubblicare il collage
    const collageCreatedAt = new Date(findSnapInstance.collageCreatedAt);
    const now = new Date();
    const diff = now.getTime() - collageCreatedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 20) throw new HttpException(400, 'Ops! You have to wait 20 seconds before publishing the collage');

    const users = await SnapsInstancesUsers.query().whereNotDeleted().where({ snapInstanceId: data.snapInstanceId });

    // Controllo se tutti gli utenti hanno scattato la foto
    const usersWithoutImage = users.filter(user => !user.s3Key);
    if (usersWithoutImage.length > 0) throw new HttpException(400, 'Ops! Some users have not taken the photo');

    const trx = await SnapsSync.startTransaction();

    // TODO: Recuperare l'immagine da Cloudinary e salvarla su S3 e generare il blurhash

    try {
      const createSnapSyncData: SnapSync = await SnapsSync.query(trx).insert({
        userId: findSnapInstance.userId,
        snapShapeId: findSnapInstance.snapShapeId,
        snapInstanceId: findSnapInstance.id,
        s3CollageKey: findSnapInstance.cdlPublicUrl, // TODO: Change this
      });

      await Promise.all(
        users.map(async userData => {
          await SnapsSyncUsers.query(trx).insert({
            userId: userData.userId,
            snapShapePositionId: userData.snapShapePositionId,
            snapSyncId: createSnapSyncData.id,
            locationId: userData.locationId,
            snappedAt: userData.snappedAt,
            s3ImageKey: userData.s3Key,
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

  public async findImageUrlById(snapSyncId: number): Promise<string> {
    const findOneData = await SnapsSync.query().whereNotDeleted().findById(snapSyncId);
    if (!findOneData) throw new HttpException(404, "SnapSync doesn't exist");
    if (!findOneData.s3CollageKey) throw new HttpException(400, "SnapSync doesn't have an image");

    let params: GetObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: findOneData.s3CollageKey,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return url;
  }
}

export default SnapSyncService;
