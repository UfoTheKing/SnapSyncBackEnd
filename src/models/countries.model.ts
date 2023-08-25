import { Model, ModelObject, Pojo } from 'objection';
import objectionSoftDelete from 'objection-js-soft-delete';
import { Country, CountryFlag } from '@/interfaces/countries.interface';
import { CLOUDINARY_URL } from '@/utils/costants';

const softDelete = objectionSoftDelete({
  columnName: 'deletedAt',
  deletedValue: new Date(),
  notDeletedValue: null,
});

export class Countries extends softDelete(Model) implements Country {
  id!: number;
  iso!: string;   
  name!: string;
  nicename!: string;
  iso3!: string | null;
  numCode!: number | null;
  phoneCode!: number;

  flagUrl!: string | null;
  flagPublicId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;

  unarchived!: boolean;

  static tableName = 'countries'; // database table name
  static idColumn = 'id'; // id column name

  static get virtualAttributes() {
    return ['flag'];
  }

  flag(): CountryFlag {
    var image = `${CLOUDINARY_URL}/${this.flagPublicId}`;
    var dynamicUrl = `${CLOUDINARY_URL}/h_{height},w_{width}/${this.flagPublicId}`;

    let flag: CountryFlag = {
      dynamicUrl: dynamicUrl,
      default: {
        url: image,
        width: 48,
        height: 48,
      },
    };

    return flag;
  }

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json);

    delete json.flagPublicId;
    delete json.flagUrl;

    delete json.createdAt;
    delete json.updatedAt;
    delete json.deletedAt;

    delete json.unarchived;

    return json;
  }
}

export type CountriesShape = ModelObject<Countries>;
