export interface User {
  id: number;
  username: string;
  fullName: string;
  profilePicImageKey: string;

  phoneNumber: string; // In formato internazionale, esempio: +393401234567

  dateOfBirth: Date; // Data di nascita

  biography: string | null;

  isVerified: boolean;
  verifiedAt: Date | null;

  isBanned: boolean;
  bannedAt: Date | null;
  bannedUntil: Date | null;

  isShadowBanned: boolean;
  shadowBannedAt: Date | null;
  shadowBannedUntil: Date | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
