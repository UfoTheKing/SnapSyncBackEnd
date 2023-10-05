import { MulterUploadFile } from '@/interfaces/auth.interface';

export class CreateSnaSyncDto {
  userId: number;
}

export class TakeSnapDto {
  userId: number;
  snapSyncId: number;
  file: MulterUploadFile;
}
