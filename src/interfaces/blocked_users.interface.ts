import { User } from './users.interface';

export interface BlockedUser {
  id: number;
  userId: number;
  blockedUserId: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  unarchived: boolean;

  user?: User;
  blockedUser?: User;
}
