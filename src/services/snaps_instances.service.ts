import { TakeSnapDto } from '@/dtos/snaps_instances.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapInstance } from '@/interfaces/snaps_instances.interface';
import { SnapsInstances } from '@/models/snaps_instances.model';
import { SnapsInstancesUsers } from '@/models/snaps_instances_users.model';
import { Users } from '@/models/users.model';
import { isEmpty } from '@/utils/util';
import { boolean } from 'boolean';
import sha256 from 'crypto-js/sha256';
import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { ApiCodes } from '@/utils/apiCodes';
import { SnapsShapes } from '@/models/snaps_shapes.model';
import { SnapsShapesPositions } from '@/models/snaps_shapes_positions.model';
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

  public async takeSnap(data: TakeSnapDto): Promise<{
    allUsersHaveTakenSnap: boolean;
    image: string | null;
  }> {
    if (isEmpty(data)) throw new HttpException(400, 'Ops! Data is empty');
    if (!data.file) throw new HttpException(400, 'No snap file provided!');
    if (!data.file.buffer) throw new HttpException(400, 'No snap file provided!');

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(data.snapInstanceId);
    if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");

    // Controllo se esiste uno SnapInstanceUser con questo userId e questo snapInstanceId
    const findSnapInstanceUser = await SnapsInstancesUsers.query()
      .whereNotDeleted()
      .findOne({ userId: data.userId, snapInstanceId: data.snapInstanceId });
    if (!findSnapInstanceUser) throw new HttpException(403, "You can't take a snap of this SnapSync");

    // Controllo se l'utente ha già fatto uno snap di questo SnapInstance
    if (findSnapInstanceUser.imageKey) {
      throw new HttpException(403, 'You have already taken a snap of this SnapSync');
    }

    // Controllo se effettivamente snapInstance.timerStarted è true
    if (!boolean(findSnapInstance.timerStarted)) {
      throw new HttpException(403, "Timer of this SnapSync hasn't started yet");
    }

    // Controllo se findSnapInstance.timerStartAt non è null e se è passato il tempo dei snapInstance.timerDurationSeconds, se si allora posso fare lo snap
    if (findSnapInstance.timerStartAt) {
      const now = new Date();
      const timerStartAt = new Date(findSnapInstance.timerStartAt);
      const timerDurationSeconds = findSnapInstance.timerDurationSeconds;
      const timerEndAt = new Date(timerStartAt.getTime() + timerDurationSeconds * 1000);

      if (now.getTime() < timerEndAt.getTime()) {
        throw new HttpException(400, 'Ops! You can take a snap only after the timer has expired');
      }
    } else {
      throw new HttpException(403, "Timer of this SnapSync hasn't started yet");
    }

    const shape = await SnapsShapes.query().whereNotDeleted().findById(findSnapInstance.snapShapeId);
    if (!shape) throw new HttpException(404, "SnapSync shape doesn't exist", null, ApiCodes.DeleteSnap);

    // Controllo se tutti gli utenti hanno joinato lo SnapInstance, se no allora non posso fare lo snap
    const countJoinedUsers = await SnapsInstancesUsers.query().whereNotDeleted().where({ snapInstanceId: findSnapInstance.id }).resultSize();
    if (countJoinedUsers !== shape.numberOfUsers) throw new HttpException(403, "You can't take a snap of this SnapSync");

    // Recupero la posizione dell'utente
    const findSnapInstanceUserPosition = await SnapsShapesPositions.query().whereNotDeleted().findById(findSnapInstanceUser.snapShapePositionId);
    if (!findSnapInstanceUserPosition) throw new HttpException(404, "SnapSync position doesn't exist", null, ApiCodes.DeleteSnap);

    // TODO: fare il resize dell'immagine in base alla shapePosition

    // Salvo lo snap su s3
    const s3BucketKey = `snaps/${findSnapInstance.id}/${findSnapInstanceUserPosition.name}_${findUser.id}_${Date.now()}`;

    const params: PutObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: s3BucketKey,
      Body: data.file.buffer,
      ContentType: data.file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const dataS3: PutObjectCommandOutput = await s3.send(command);
    if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);

    const trx = await SnapsInstances.startTransaction();
    let allUsersHaveTakenSnap = false;
    let image = 'https://i.pinimg.com/736x/1f/7a/a6/1f7aa6639a2cfe9909f845cdf0bb5ab0--puff-girl-eye-candy.jpg';

    // Aggiorno lo SnapInstanceUser con l'imageKey ed eventualmente controllo se tutti gli utenti hanno fatto uno snap
    // Se questo blocco di codice fallisce, allora faccio il rollback della transazione e tramite il WebSocket mando a tutti gli utenti
    // che lo snap non è andato a buon fine
    try {
      await SnapsInstancesUsers.query(trx).whereNotDeleted().patch({ imageKey: s3BucketKey }).findById(findSnapInstanceUser.id);

      const snapInstanceUsers = await SnapsInstancesUsers.query(trx)
        .whereNotDeleted()
        .where({ snapInstanceId: findSnapInstance.id })
        .whereNotNull('imageKey')
        .resultSize();

      if (snapInstanceUsers === shape.numberOfUsers) {
        allUsersHaveTakenSnap = true;

        // TODO: Se tutti gli utenti hanno fatto uno snap, genero il collage e lo salvo su s3

        // Salvo il colage generato nella SnapInstance
        await SnapsInstances.query(trx).whereNotDeleted().patch({ imageKey: image, collageCreatedAt: new Date() }).findById(findSnapInstance.id);
      }

      await trx.commit();
    } catch (error) {
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    }

    return { allUsersHaveTakenSnap, image: allUsersHaveTakenSnap ? image : null };
  }

  public hashSnapInstanceKey(key: string): string {
    return sha256(key).toString();
  }
}

export default SnapInstanceService;
