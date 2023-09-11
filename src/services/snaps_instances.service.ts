import { TakeSnapDto } from '@/dtos/snaps_instances.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapInstance } from '@/interfaces/snaps_instances.interface';
import { SnapsInstances } from '@/models/snaps_instances.model';
import { SnapsInstancesUsers } from '@/models/snaps_instances_users.model';
import { Users } from '@/models/users.model';
import { isEmpty, nowUtc } from '@/utils/util';
import { boolean } from 'boolean';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  S3_ACCESS_KEY_ID,
  S3_BUCKET_NAME,
  S3_BUCKET_REGION,
  S3_SECRET_ACCESS_KEY,
} from '@/config';
import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { ApiCodes } from '@/utils/apiCodes';
import { SnapsShapes } from '@/models/snaps_shapes.model';
import { SnapsShapesPositions } from '@/models/snaps_shapes_positions.model';
import { v2 as cloudinary } from 'cloudinary';
import { MulterUploadFile } from '@/interfaces/auth.interface';
import streamifier from 'streamifier';
import sizeOf from 'image-size';
import fetch from 'cross-fetch';
import moment from 'moment';
import sharp from 'sharp';
import { SnapShape } from '@/interfaces/snaps_shapes.interface';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
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

  public async checkSnapInstance(snapInstanceId: number, userId: number): Promise<void> {
    const findSnapInstance = await SnapsInstances.query().whereNotDeleted().findById(snapInstanceId);
    if (!findSnapInstance) throw new HttpException(404, "SnapSync doesn't exist");

    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    // Controllo se esiste uno SnapInstanceUser con questo userId e questo snapInstanceId
    const findSnapInstanceUser = await SnapsInstancesUsers.query().whereNotDeleted().findOne({ userId: userId, snapInstanceId: snapInstanceId });
    if (!findSnapInstanceUser) throw new HttpException(403, "You can't join this SnapSync");

    if (boolean(findSnapInstanceUser.isJoined)) throw new HttpException(403, 'You have already joined this SnapSync');
    if (findSnapInstanceUser.snappedAtUtc) throw new HttpException(403, 'You have already taken a snap of this SnapSync');
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
    if (findSnapInstanceUser.snappedAtUtc) {
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
    const countJoinedUsers = await SnapsInstancesUsers.query()
      .whereNotDeleted()
      .where({ snapInstanceId: findSnapInstance.id, isJoined: true })
      .resultSize();
    if (countJoinedUsers !== shape.numberOfUsers) throw new HttpException(400, 'Ops! You can take a snap only after all users have joined');

    // Recupero la posizione dell'utente
    const findSnapInstanceUserPosition = await SnapsShapesPositions.query().whereNotDeleted().findById(findSnapInstanceUser.snapShapePositionId);
    if (!findSnapInstanceUserPosition) throw new HttpException(404, "SnapSync position doesn't exist", null, ApiCodes.DeleteSnap);

    const originalWidth = sizeOf(data.file.buffer).width;
    const originalHeight = sizeOf(data.file.buffer).height;
    if (!originalWidth || !originalHeight) throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    let buffer: Buffer = data.file.buffer;
    if (originalHeight !== findSnapInstanceUserPosition.height || originalWidth !== findSnapInstanceUserPosition.width) {
      // Faccio il resize dell'immagine in base alla shapePosition
      buffer = await sharp(data.file.buffer)
        .resize(findSnapInstanceUserPosition.width, findSnapInstanceUserPosition.height)
        .withMetadata()
        .toBuffer();
    }

    // Salvo lo snap su S3 + Cloudinary
    const s3BucketKey = `snaps/${findSnapInstance.id}/${findSnapInstanceUserPosition.name}_${findUser.id}_${Date.now()}`;
    const cdlFolder = `snaps/${findSnapInstance.id}`;
    const cdlPublicId = `${findSnapInstanceUserPosition.name}_${findUser.id}_${Date.now()}`;
    const publicId = `${cdlFolder}/${cdlPublicId}`;
    try {
      // await this.uploadSnapBufferToS3(data.file, s3BucketKey);
      await this.uploadSnapBufferToCloudinary(buffer, cdlFolder, cdlPublicId);

      await SnapsInstancesUsers.query().whereNotDeleted().patch({ cdlPublicId: publicId, snappedAtUtc: nowUtc() }).findById(findSnapInstanceUser.id);
    } catch (error) {
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    }

    const trx = await SnapsInstances.startTransaction();
    let allUsersHaveTakenSnap = false;
    let image: string | null = null;

    // Aggiorno lo SnapInstanceUser con l'imageKey ed eventualmente controllo se tutti gli utenti hanno fatto uno snap
    // Se questo blocco di codice fallisce, allora faccio il rollback della transazione e tramite il WebSocket mando a tutti gli utenti
    // che lo snap non è andato a buon fine
    try {
      const snapInstanceUsers = await SnapsInstancesUsers.query()
        .whereNotDeleted()
        .where({ snapInstanceId: findSnapInstance.id })
        .whereNotNull('snappedAtUtc');

      if (snapInstanceUsers.length === shape.numberOfUsers) {
        allUsersHaveTakenSnap = true;

        // Se tutti gli utenti hanno fatto uno snap, genero il collage e lo salvo su s3
        let media: string[] = snapInstanceUsers.map(snapInstanceUser => snapInstanceUser.cdlPublicId);
        const collagePublicId = `COLLAGE_${findSnapInstance.id}_${Date.now()}`;
        await this.generateCollage(media, collagePublicId, shape);

        image = `https://res.cloudinary.com/dmwabqjto/image/upload/snaps_collage/${collagePublicId}`;

        // TODO: Salvo il colage generato nella SnapInstance -> questo sarebbe da fare nel Webhook di Cloudinary
        let nowUtc = new Date(moment.utc().format('YYYY-MM-DD HH:mm:ss'));
        await SnapsInstances.query(trx)
          .whereNotDeleted()
          .patch({ cdlPublicId: collagePublicId, cdlPublicUrl: image, collageCreatedAt: nowUtc })
          .findById(findSnapInstance.id);
      }

      await trx.commit();
    } catch (error) {
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    }

    return { allUsersHaveTakenSnap, image: allUsersHaveTakenSnap ? image : null };
  }

  private async uploadSnapBufferToS3(file: MulterUploadFile, s3BucketKey: string): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: s3BucketKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const dataS3: PutObjectCommandOutput = await s3.send(command);
    if (!dataS3.$metadata.httpStatusCode || dataS3.$metadata.httpStatusCode !== 200)
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
  }

  private async uploadSnapBufferToCloudinary(buffer: Buffer, folder: string, publicId: string): Promise<void> {
    // Salvo il file anche su Cloudinary, per poterlo usare per il collage
    let cld_upload_stream = await cloudinary.uploader.upload_stream({ folder: folder, public_id: publicId }, function (error, result) {
      if (error) throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    });

    await streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  }

  private async generateCollage(media: string[], publicId: string, shape: SnapShape): Promise<void> {
    let assest: Array<{ media: string }> = media.map(media => {
      return {
        media: media,
      };
    });
    var manifest_json = {
      template: 'grid',
      width: shape.width,
      height: shape.height,
      columns: shape.columns,
      rows: shape.rows,
      spacing: shape.spacing,
      color: '#fff',
      assetDefaults: { kind: 'upload', crop: 'fill', gravity: 'center' },
      assets: assest,
    };
    let body = {
      api_key: CLOUDINARY_API_KEY,
      public_id: publicId,
      resource_type: 'image',
      upload_preset: 'snapsync',
      manifest_json: JSON.stringify(manifest_json),
    };

    const cdlEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/create_collage`;
    try {
      const response = await fetch(cdlEndpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.log(JSON.stringify(response));
        throw new HttpException(response.status, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
      }

      const data = await response.json();
      console.log(JSON.stringify(data));
    } catch (error) {
      console.log(JSON.stringify(error));
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    }
  }

  private async generateCollageTwo(media: string[], publicId: string): Promise<void> {
    let assest: Array<{ media: string }> = media.map(media => {
      return {
        media: media,
      };
    });
    var manifest_json = {
      template: 'grid',
      width: 384,
      height: 384,
      columns: 2,
      rows: 2,
      spacing: 2,
      color: '#f7f7f7',
      assetDefaults: { kind: 'upload', crop: 'fill', gravity: 'center' },
      assets: assest,
    };
    let body = {
      api_key: CLOUDINARY_API_KEY,
      public_id: publicId,
      resource_type: 'image',
      upload_preset: 'snapsync',
      manifest_json: JSON.stringify(manifest_json),
    };

    const cdlEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/create_collage`;
    try {
      const response = await fetch(cdlEndpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.log(JSON.stringify(response));
        throw new HttpException(response.status, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
      }

      const data = await response.json();
      console.log(JSON.stringify(data));
    } catch (error) {
      console.log(JSON.stringify(error));
      throw new HttpException(500, 'Ops! Something went wrong.', null, ApiCodes.DeleteSnap);
    }
  }
}

export default SnapInstanceService;
