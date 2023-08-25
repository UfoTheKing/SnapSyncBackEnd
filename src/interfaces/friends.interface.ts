import { FriendshipStatus } from './friendship_statuses.interface';
import { User } from './users.interface';

export interface Friend {
  id: number;
  userId: number;
  friendId: number;
  friendshipStatusId: number;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  unarchived: boolean;
  friendshipHash: string;

  user?: User;
  friend?: User;
  friendshipStatus?: FriendshipStatus;
}
