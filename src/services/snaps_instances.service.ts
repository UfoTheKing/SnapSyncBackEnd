import { CreateSnapInstanceDto } from '@/dtos/snaps_instances.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapInstance } from '@/interfaces/snaps_instances.interface';
import { SnapsInstances } from '@/models/snaps_instances.model';
import { SnapsInstancesUsers } from '@/models/snaps_instances_users.model';
import { Users } from '@/models/users.model';
import { isEmpty } from '@/utils/util';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { ApiCodes } from '@/utils/apiCodes';
import FriendService from './friends.service';
import { CreateSnapInstanceUserDto } from '@/dtos/snaps_instances_users.dto';
import sha256 from 'crypto-js/sha256';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

class SnapInstanceService {
  public async findSnapInstanceById(id: number): Promise<SnapInstance> {
    const findOne: SnapInstance = await SnapsInstances.query().whereNotDeleted().findById(id);
    if (!findOne) throw new HttpException(404, "SnapSync doesn't exist");

    return findOne;
  }

  public async findSnapInstanceByKey(key: string): Promise<SnapInstance> {
    const findOne: SnapInstance = await SnapsInstances.query().whereNotDeleted().findOne({ instanceKey: key });
    if (!findOne) throw new HttpException(404, "SnapSync doesn't exist");

    return findOne;
  }

  public async createSnapInstance(data: CreateSnapInstanceDto, snapSyncUsersData: CreateSnapInstanceUserDto[]): Promise<SnapInstance> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
    if (isEmpty(snapSyncUsersData)) throw new HttpException(400, 'Ops! Data is empty');

    const key = sha256(new Date().getTime().toString()).toString();

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

    const trx = await SnapsInstances.startTransaction();

    try {
      const snapInstance = await SnapsInstances.query(trx).insertAndFetch({
        userId: data.userId,
        instanceKey: key,
      });

      // Sistemo i dati di snapSyncUsersData
      snapSyncUsersData.forEach(snapSyncUser => {
        snapSyncUser.snapInstanceId = snapInstance.id;
      });

      // Creo gli SnapInstanceUsers
      await SnapsInstancesUsers.query(trx).insertGraph(snapSyncUsersData);

      await trx.commit();

      return snapInstance;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  private async uploadSnapBufferToS3(buffer: Buffer, s3BucketKey: string, ContentType: string): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: s3BucketKey,
      Body: buffer,
      ContentType: ContentType,
    };

    const command = new PutObjectCommand(params);
    const dataS3: PutObjectCommandOutput = await s3.send(command);
    if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
  }
}

export default SnapInstanceService;
