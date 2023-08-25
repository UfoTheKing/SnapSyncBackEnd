export interface Country {
    id: number;
    iso: string;
    name: string;
    nicename: string;
    iso3: string | null;
    numCode: number | null;
    phoneCode: number;

    flagUrl: string | null;
    flagPublicId: string | null;

    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;

    unarchived: boolean;
}

export interface CountryFlag {
    dynamicUrl: string;
    default: {
      url: string;
      width: number;
      height: number;
    };
  }