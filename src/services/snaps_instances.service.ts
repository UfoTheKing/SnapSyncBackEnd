import { PublishSnapDto, TakeSnapDto } from '@/dtos/snaps_instances.dto';
import { HttpException } from '@/exceptions/HttpException';
import { Users } from '@/models/users.model';
import { generateRandomKey, isEmpty } from '@/utils/util';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { ApiCodes } from '@/utils/apiCodes';
import FriendService from './friends.service';
import { boolean } from 'boolean';
import sizeOf from 'image-size';
import sharp from 'sharp';
import { SNAP_SYNC_SIZE } from '@/utils/costants';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

class SnapInstanceService {
  // public async takeSnap(data: TakeSnapDto): Promise<{
  //   allUsersSnapped: boolean;
  // }> {
  //   if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
  //   if (!data.file) throw new HttpException(400, 'Ops! Data is empty');
  //   if (!data.file.buffer) throw new HttpException(400, 'Ops! Data is empty');
  //   const findUser = await Users.query().whereNotDeleted().findById(data.userId);
  //   if (!findUser) throw new HttpException(404, "User doesn't exist");
  //   const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(data.snapInstanceId);
  //   if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");
  //   const findSnapInstanceUser = await SnapsInstancesUsers.query().whereNotDeleted().findOne({
  //     snapInstanceId: data.snapInstanceId,
  //     userId: data.userId,
  //   });
  //   if (!findSnapInstanceUser) throw new HttpException(403, "User doesn't have access to this SnapSync");
  //   if (!boolean(findSnapInstanceUser.isJoined)) throw new HttpException(400, "User isn't joined to this SnapSync");
  //   // Controllo se il timer è iniziato
  //   if (!boolean(findSnapInstance.timerStarted)) throw new HttpException(400, "SnapSync timer isn't started");
  //   // Controllo se l'utente ha effettivamente aspettato il tempo necessario (findSnapInstance.timerSeconds)
  //   const timerStartAt = new Date(findSnapInstance.timerStartAt);
  //   const timerEndAt = new Date(timerStartAt.getTime() + findSnapInstance.timerSeconds * 1000);
  //   const now = new Date();
  //   if (now < timerEndAt) throw new HttpException(400, "SnapSync timer isn't ended");
  //   // Controllo se l'utente ha già caricato uno snap
  //   if (findSnapInstanceUser.snappedAt) throw new HttpException(400, 'Ops! You have already snapped');
  //   const originalHeight = sizeOf(data.file.buffer).height;
  //   const originalWidth = sizeOf(data.file.buffer).width;
  //   if (!originalHeight || !originalWidth) throw new HttpException(400, 'Invalid image');
  //   const key = `snaps/${findSnapInstance.id}/${findUser.id.toString() + '_' + generateRandomKey()}`;
  //   let buffer: Buffer = data.file.buffer;
  //   if (originalHeight !== SNAP_SYNC_SIZE || originalWidth !== SNAP_SYNC_SIZE) {
  //     buffer = await sharp(data.file.buffer).resize(SNAP_SYNC_SIZE, SNAP_SYNC_SIZE).withMetadata().toBuffer();
  //   }
  //   const params: PutObjectCommandInput = {
  //     Bucket: S3_BUCKET_NAME,
  //     Key: key,
  //     Body: buffer,
  //     ContentType: data.file.mimetype,
  //   };
  //   const command = new PutObjectCommand(params);
  //   const dataS3: PutObjectCommandOutput = await s3.send(command);
  //   if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200) throw new HttpException(500, 'Ops! Something went wrong.', null);
  //   const trx = await SnapsInstances.startTransaction();
  //   try {
  //     await SnapsInstancesUsers.query(trx).patchAndFetchById(findSnapInstanceUser.id, {
  //       snappedAt: new Date(),
  //       s3Key: key,
  //     });
  //     await trx.commit();
  //     // Controllo se tutti gli utenti hanno caricato uno snap
  //     const cSIU = await SnapsInstancesUsers.query()
  //       .whereNotDeleted()
  //       .where('snapInstanceId', findSnapInstance.id)
  //       .whereNotNull('snappedAt')
  //       .resultSize();
  //     let allUsersSnapped = false;
  //     if (cSIU !== undefined && cSIU === 2) {
  //       allUsersSnapped = true;
  //     }
  //     return {
  //       allUsersSnapped,
  //     };
  //   } catch (error) {
  //     await trx.rollback();
  //     throw error;
  //   }
  // }
  // public async publishSnap(data: PublishSnapDto): Promise<void> {
  //   if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
  //   const findUser = await Users.query().whereNotDeleted().findById(data.userId);
  //   if (!findUser) throw new HttpException(404, "User doesn't exist");
  //   const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(data.snapInstanceId);
  //   if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");
  //   if (findSnapInstance.userId !== findUser.id) throw new HttpException(403, 'Ops! You are not the owner of this SnapSync');
  //   // Controllo se tutti gli utenti hanno caricato uno snap
  //   const snapSyncUsers = await SnapsInstancesUsers.query().whereNotDeleted().where('snapInstanceId', findSnapInstance.id).whereNotNull('snappedAt');
  //   if (snapSyncUsers.length !== 2) throw new HttpException(400, 'Ops! Not all users have snapped');
  //   // Controllo se i due utenti sono ancora amici
  //   const userIds = snapSyncUsers.map(snapSyncUser => snapSyncUser.userId);
  //   const { areFriends } = await new FriendService().areFriends(userIds[0], userIds[1]);
  //   // console.log('areFriends', areFriends);
  //   if (!areFriends) throw new HttpException(400, 'Ops! Something went wrong', null, ApiCodes.DeleteSnap); // Se non sono amici elimino l'instanza
  //   // Recupero l'ultimo utente che ha caricato uno snap
  //   const snapSyncUser = await SnapsInstancesUsers.query()
  //     .whereNotDeleted()
  //     .where('snapInstanceId', findSnapInstance.id)
  //     .whereNotNull('snappedAt')
  //     .orderBy('snappedAt', 'desc')
  //     .first();
  //   if (!snapSyncUser) throw new HttpException(500, 'Ops! Something went wrong');
  //   // Controllo se l'owner ha aspettato findSnapInstance.timerPublishSeconds da quando l'ultimo utente ha caricato uno snap
  //   const snappedAt = new Date(snapSyncUser.snappedAt);
  //   const timerPublishEndAt = new Date(snappedAt.getTime() + findSnapInstance.timerPublishSeconds * 1000);
  //   const now = new Date();
  //   if (now < timerPublishEndAt) throw new HttpException(400, "Ops! You haven't waited enough time");
  //   // Controllo se esiste già uno SnapSync con SnapInstanceId = findSnapInstance.id
  //   const findSnapSync = await SnapsSync.query().whereNotDeleted().findOne({ snapInstanceId: findSnapInstance.id });
  //   if (findSnapSync) throw new HttpException(400, 'Ops! You have already published this SnapSync');
  //   const trx = await SnapsSync.startTransaction();
  //   try {
  //     // Creo lo SnapSync
  //     const createdSnapSync = await SnapsSync.query(trx).insertAndFetch({
  //       userId: findSnapInstance.userId,
  //       snapInstanceId: findSnapInstance.id,
  //     });
  //     await Promise.all(
  //       snapSyncUsers.map(async snapSyncUser => {
  //         await SnapsSyncUsers.query(trx).insert({
  //           userId: snapSyncUser.userId,
  //           snapSyncId: createdSnapSync.id,
  //           locationId: snapSyncUser.locationId,
  //           s3ImageKey: snapSyncUser.s3Key,
  //           snappedAt: snapSyncUser.snappedAt,
  //         });
  //       }),
  //     );
  //     // Nel record dei friends aggiorno i campi snapSyncStreak e lastSnapSync
  //     // Elimino la SnapInstance
  //     await SnapsInstances.query(trx).deleteById(findSnapInstance.id);
  //     // Elimino gli SnapInstanceUsers
  //     await SnapsInstancesUsers.query(trx).delete().where('snapInstanceId', findSnapInstance.id);
  //     await trx.commit();
  //   } catch (error) {
  //     await trx.rollback();
  //     throw new HttpException(500, 'Ops! Something went wrong', null, ApiCodes.DeleteSnap);
  //   }
  // }
}

export default SnapInstanceService;
