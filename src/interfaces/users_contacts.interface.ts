export interface UserContact {
  id: number;
  userId: number;
  contactId: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
