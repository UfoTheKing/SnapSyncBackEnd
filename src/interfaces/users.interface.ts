export interface User {
  id: number;
  username: string;
  fullName: string;
  profilePicImageKey: string;

  phoneNumber: string; // In formato internazionale, esempio: +393401234567
  phoneNumberOnlyDigits: string; // Solo cifre, esempio: 393401234567
  phoneNumberCountryIso2: string | null; // Codice ISO 3166-1 alpha-2 del paese, esempio: IT
  latitude: number | null; // Indica la latitudine del luogo in cui l'utente si è registrato
  longitude: number | null; // Indica la longitudine del luogo in cui l'utente si è registrato

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
  isPrivate: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}

export interface SmallUser {
  id: number;
  username: string;
  fullName: string;
  isVerified: boolean;
  profilePictureUrl: string;

  socialContext?: string;
  streak?: number;
}
