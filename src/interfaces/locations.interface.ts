export interface Location {
  id: number;
  name: string;
  shortName: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
