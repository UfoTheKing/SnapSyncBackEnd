import { MulterUploadFile } from '@/interfaces/auth.interface';

export class TakeSnapDto {
  userId: number;
  snapInstanceId: number;
  file: MulterUploadFile;
}
