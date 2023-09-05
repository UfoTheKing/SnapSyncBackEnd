import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { UserContact } from '@/interfaces/users_contacts.interface';

// Specify the options for this plugin. This are the defaults.
const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class UsersContacts extends softDelete(Model) implements UserContact {
  id!: number;
  userId!: number;
  contactId!: number;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  unarchived!: boolean;

  static tableName = 'users_contacts';
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

export type UsersContactsShape = ModelObject<UsersContacts>;
