import { Model, ModelObject, Pojo } from 'objection';
import { User } from '@interfaces/users.interface';
import objectionSoftDelete from 'objection-js-soft-delete';
import { boolean } from 'boolean';
import moment from 'moment';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class Users extends softDelete(Model) implements User {
  id!: number;
  username!: string;
  fullName!: string;
  profilePicImageKey!: string;

  phoneNumber!: string; // In formato internazionale, esempio: +393401234567
  phoneNumberOnlyDigits!: string; // Solo cifre, esempio: 3401234567
  phoneNumberCountryIso2!: string | null; // Codice ISO 3166-1 alpha-2 del paese, esempio: IT
  latitude!: number | null; // Indica la latitudine del luogo in cui l'utente si è registrato
  longitude!: number | null; // Indica la longitudine del luogo in cui l'utente si è registrato

  dateOfBirth!: Date; // Data di nascita

  biography!: string | null;

  isVerified!: boolean;
  verifiedAt!: Date | null;

  isBanned!: boolean;
  bannedAt!: Date | null;
  bannedUntil!: Date | null;

  isShadowBanned!: boolean;
  shadowBannedAt!: Date | null;
  shadowBannedUntil!: Date | null;
  isPrivate!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'users'; // database table name
  static idColumn = 'id'; // id column name

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    delete json.profilePicImageKey;

    delete json.phoneNumber;
    delete json.phoneNumberOnlyDigits;
    delete json.phoneNumberCountryIso2;

    json.dateOfBirth = {
      it: moment(json.dateOfBirth).format('DD/MM/YYYY'),
      en: moment(json.dateOfBirth).format('YYYY-MM-DD'),
    };

    json.isVerified = boolean(json.isVerified);
    delete json.verifiedAt;

    delete json.latitude;
    delete json.longitude;

    delete json.isBanned;
    delete json.bannedAt;
    delete json.bannedUntil;

    delete json.isShadowBanned;
    delete json.shadowBannedAt;
    delete json.shadowBannedUntil;

    json.isPrivate = boolean(json.isPrivate);

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type UsersShape = ModelObject<Users>;
