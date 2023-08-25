import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { AuthUser } from '@/interfaces/auth_users.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class AuthUsers extends softDelete(Model) implements AuthUser {
  id!: number;
  sessionId!: string;
  username!: string | null;
  fullName!: string | null;
  profilePicImageKey!: string | null;
  phoneNumber!: string | null;
  isPhoneNumberVerified!: boolean;
  dateOfBirth!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'auth_users';
  static idColumn = 'id';

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);
    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;
    delete json.unarchived;
    return json;
  }
}

export type AuthUsersShape = ModelObject<AuthUsers>;
