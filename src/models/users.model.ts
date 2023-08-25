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

    json.dateOfBirth = {
      it: moment(json.dateOfBirth).format('DD/MM/YYYY'),
      en: moment(json.dateOfBirth).format('YYYY-MM-DD'),
    };

    json.isVerified = boolean(json.isVerified);
    delete json.verifiedAt;

    delete json.isBanned;
    delete json.bannedAt;
    delete json.bannedUntil;

    delete json.isShadowBanned;
    delete json.shadowBannedAt;
    delete json.shadowBannedUntil;

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type UsersShape = ModelObject<Users>;
