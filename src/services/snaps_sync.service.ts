import { CreateSnaSyncDto, TakeSnapDto } from '@/dtos/snaps_sync.dto';
import { CreateSnapSyncUserDto } from '@/dtos/snaps_sync_users.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapSync } from '@/interfaces/snaps_sync.interface';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';
import { Users } from '@/models/users.model';
import { generateRandomKey, isEmpty } from '@/utils/util';
import sha256 from 'crypto-js/sha256';
import FriendService from './friends.service';
import { Notification } from '@/interfaces/notifications.interface';
import { NotificationsTypes } from '@/models/notifications_types.model';
import { NotificationType } from '@/utils/enums';
import { Notifications } from '@/models/notifications.model';
import { boolean } from 'boolean';
import sizeOf from 'image-size';
import sharp from 'sharp';
import { SNAP_SYNC_SIZE } from '@/utils/costants';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';

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

  public async findSnapSyncByKey(key: string): Promise<SnapSync> {
    const findOneData = await SnapsSync.query().whereNotDeleted().where('instanceKey', key).first();
    if (!findOneData) throw new HttpException(404, "SnapSync doesn't exist");

    return findOneData;
  }

  public async findSnapsCountByUserId(userId: number, viewerId: number): Promise<number> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const snapsCount = await SnapsSyncUsers.query().whereNotDeleted().where({ userId }).resultSize();

    return snapsCount;
  }

  public async createSnapSync(
    data: CreateSnaSyncDto,
    snapSyncUsersData: CreateSnapSyncUserDto[],
  ): Promise<{
    snap: SnapSync;
    notification: Notification;
  }> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
    if (isEmpty(snapSyncUsersData)) throw new HttpException(400, 'Ops! Data is empty');

    const key = sha256(new Date().getTime().toString()).toString();

    const nType = await NotificationsTypes.query().whereNotDeleted().where('name', NotificationType.SnapSyncRequestReceived).first();
    if (!nType) throw new HttpException(404, "Notification type doesn't exist");

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const ownerSnapSyncUser = snapSyncUsersData.find(snapSyncUser => snapSyncUser.isOwner);
    if (!ownerSnapSyncUser) throw new HttpException(400, 'Ops! Data is empty');
    if (ownerSnapSyncUser.userId !== data.userId) throw new HttpException(400, 'Ops! Owner must be the same of userId');

    // Controllo se snapSyncUsersData ha 2 elementi
    if (snapSyncUsersData.length < 2) throw new HttpException(400, 'Ops! You must provide at least 2 users');

    // Controllo che i due utenti non siano uguali
    const userIds = snapSyncUsersData.map(snapSyncUser => snapSyncUser.userId);
    const uniqueUserIds = [...new Set(userIds)];
    if (userIds.length !== uniqueUserIds.length) throw new HttpException(400, 'Ops! You must provide at least 2 different users');

    // Controllo che i due utenti esistano
    const findUsers = await Users.query().whereNotDeleted().findByIds(userIds);
    if (findUsers.length !== userIds.length) throw new HttpException(404, "One or more users don't exist");

    // Controllo che i due utenti siano amici
    const { areFriends } = await new FriendService().areFriends(userIds[0], userIds[1]);
    if (!areFriends) throw new HttpException(400, 'Ops! You must provide 2 friends');

    // TODO: Controllo che i due utenti non abbiano già uno SnapInstance in corso

    const trx = await SnapsSync.startTransaction();

    try {
      const snapInstance = await SnapsSync.query(trx).insertAndFetch({
        userId: data.userId,
        instanceKey: key,
      });

      // Sistemo i dati di snapSyncUsersData
      snapSyncUsersData.forEach(snapSyncUser => {
        snapSyncUser.snapSyncId = snapInstance.id;
      });

      // Creo gli SnapInstanceUsers
      await SnapsSyncUsers.query(trx).insertGraph(snapSyncUsersData);

      // Creo la notifica
      let otherUserId = userIds.filter(userId => userId !== data.userId)[0];
      const notification = await Notifications.query(trx).insertAndFetch({
        userId: otherUserId,
        notificationTypeId: nType.id,
        snapSyncId: snapInstance.id,
      });

      await trx.commit();

      return {
        snap: snapInstance,
        notification: notification,
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  public async takeSnap(data: TakeSnapDto): Promise<{
    allUsersSnapped: boolean;
  }> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
    if (!data.file) throw new HttpException(400, 'Ops! Data is empty');
    if (!data.file.buffer) throw new HttpException(400, 'Ops! Data is empty');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const findSnapInstance = await SnapsSync.query().whereNotDeleted().findById(data.snapSyncId);
    if (!findSnapInstance) throw new HttpException(404, "Snap doesn't exist");

    if (boolean(findSnapInstance.isPublished)) throw new HttpException(400, 'Ops! Snap is already published');

    // Controllo se il timer è iniziato
    if (!boolean(findSnapInstance.timerStarted)) throw new HttpException(400, "Snap timer isn't started");

    const findSnapInstanceUser = await SnapsSyncUsers.query().whereNotDeleted().findOne({
      snapSyncId: findSnapInstance.id,
      userId: data.userId,
    });
    if (!findSnapInstanceUser) throw new HttpException(403, "User doesn't have access to this snap");
    if (!boolean(findSnapInstanceUser.isJoined)) throw new HttpException(400, "User isn't joined to this snap");

    // Controllo se l'utente ha effettivamente aspettato il tempo necessario (findSnapInstance.timerSeconds)
    const timerStartAt = new Date(findSnapInstance.timerStartAt);
    const timerEndAt = new Date(timerStartAt.getTime() + findSnapInstance.timerSeconds * 1000);
    const now = new Date();
    if (now < timerEndAt) throw new HttpException(400, "Snap timer isn't ended");

    // Controllo se l'utente ha già caricato uno snap
    if (findSnapInstanceUser.snappedAt) throw new HttpException(400, 'Ops! You have already snapped');
    const originalHeight = sizeOf(data.file.buffer).height;
    const originalWidth = sizeOf(data.file.buffer).width;
    if (!originalHeight || !originalWidth) throw new HttpException(400, 'Invalid image');
    const key = `snaps/${findSnapInstance.id}/${findUser.id.toString() + '_' + generateRandomKey()}`;
    let buffer: Buffer = data.file.buffer;
    if (originalHeight !== SNAP_SYNC_SIZE || originalWidth !== SNAP_SYNC_SIZE) {
      buffer = await sharp(data.file.buffer).resize(SNAP_SYNC_SIZE, SNAP_SYNC_SIZE).withMetadata().toBuffer();
    }
    const params: PutObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: data.file.mimetype,
    };
    const command = new PutObjectCommand(params);
    const dataS3: PutObjectCommandOutput = await s3.send(command);
    if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200) throw new HttpException(500, 'Ops! Something went wrong.', null);

    const trx = await SnapsSync.startTransaction();
    try {
      await SnapsSyncUsers.query(trx).patchAndFetchById(findSnapInstanceUser.id, {
        snappedAt: new Date(),
        s3ImageKey: key,
      });

      await trx.commit();

      // Controllo se tutti gli utenti hanno caricato uno snap
      const cSIU = await SnapsSyncUsers.query().whereNotDeleted().where('snapSyncId', findSnapInstance.id).whereNotNull('snappedAt').resultSize();
      let allUsersSnapped = false;
      if (cSIU !== undefined && cSIU === 2) allUsersSnapped = true;

      if (allUsersSnapped) {
        // Aggiorno la SnapInstance con
      }

      return {
        allUsersSnapped,
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

export default SnapSyncService;
