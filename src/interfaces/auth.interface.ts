import { Request } from 'express';
import { User } from '@interfaces/users.interface';
import { Country } from './countries.interface';
import { LocationRecord } from '@maxmind/geoip2-node/dist/src/records';
import { Device } from './devices.interface';

export interface DataStoredInToken {
  id: number;
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface LogInResponse {
  device: Device;
  user: {
    id: number;
    username: string;
    fullName: string;
    biography: string | null;
    profilePictureUrl: string;
    isVerified: boolean;
  };
  tokenData: TokenData;
  accessToken: string; // selector:validator
}

export interface MulterUploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: Buffer;
  filename: string;
  path: string;
  size: number;
  buffer: Buffer;
}

export interface RequestWithClientIp extends Request {
  clientIp: string;
}

export interface RequestWithUser extends RequestWithClientIp {
  user: User;
}

export interface RequestWithIsPrivate extends RequestWithClientIp {
  isPrivate: boolean;
  isMyFriend: boolean;
}

export interface RequestWithCountry extends RequestWithClientIp {
  country: Country | null;
  location?: LocationRecord;
}

export interface RequestWithDevice extends RequestWithClientIp {
  device: Device | null;
}

export interface RequestWithBlocked extends RequestWithClientIp {
  isBlockedByViewer: boolean;
  isViewerBlocked: boolean;
}

// @ts-ignore
export interface RequestWithFile extends Request {
  file?: MulterUploadFile | undefined;
}

export interface RequestWithFiles extends Request {
  files?: MulterUploadFile[] | undefined;
}
