import { MulterUploadFile } from '@/interfaces/auth.interface';

export class CreateSnapInstaceDto {
  userId: number;
  snapInstanceShapeId: number;

  key: string;

  users: Array<{
    id: number;
    position: string;
  }>;
}

export class TakeSnapDto {
  userId: number;
  snapInstanceId: number;
  file: MulterUploadFile;
}
