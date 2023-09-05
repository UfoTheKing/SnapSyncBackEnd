import { S3_ACCESS_KEY_ID, S3_BUCKET_NAME, S3_BUCKET_REGION, S3_SECRET_ACCESS_KEY } from '@/config';
import { GetObjectCommand, GetObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException } from '@/exceptions/HttpException';
import { SnapShape } from '@/interfaces/snaps_shapes.interface';
import { SnapsShapes } from '@/models/snaps_shapes.model';

const s3 = new S3Client({
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  region: S3_BUCKET_REGION,
});

class SnapShapeService {
  public async findAllSnapsShapes(): Promise<SnapShape[]> {
    const data = await SnapsShapes.query().whereNotDeleted();

    return data;
  }

  public async findSnapShapeById(id: number): Promise<SnapShape> {
    const findOne = await SnapsShapes.query().whereNotDeleted().findById(id);
    if (!findOne) throw new HttpException(404, "Shape doesn't exist");

    return findOne;
  }

  public async findIconUrlById(id: number): Promise<string> {
    const findOne = await SnapsShapes.query().whereNotDeleted().findById(id);
    if (!findOne) throw new HttpException(404, "Shape doesn't exist");

    let params: GetObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: findOne.iconKey,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return url;
  }

  public async findFocusedIconUrlById(id: number): Promise<string> {
    const findOne = await SnapsShapes.query().whereNotDeleted().findById(id);
    if (!findOne) throw new HttpException(404, "Shape doesn't exist");

    let params: GetObjectCommandInput = {
      Bucket: S3_BUCKET_NAME,
      Key: findOne.focusedIconKey,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return url;
  }
}

export default SnapShapeService;
