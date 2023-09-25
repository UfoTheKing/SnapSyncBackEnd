import { SmallUser } from '../users.interface';

export interface MutualFriends {
  count: number;
  nodes: Array<SmallUser>;
}

export interface Biography {
  rawText: string | null;
  entities?: Array<BiographyEntity>;
}

export interface BiographyEntity {
  type: 'user';
  id: number;
  text: string;
}

export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  isVerified: boolean;
  profilePictureUrl: string;

  biography: Biography | null;

  mutualFriends?: MutualFriends; // Nel caso non sia il mio profilo
  friendsCount?: number; // Nel caso sia il mio profilo

  snapsCount: number;

  isMyProfile: boolean;
  isPrivate: boolean;
}
