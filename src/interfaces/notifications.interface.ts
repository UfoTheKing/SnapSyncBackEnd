export interface Notification {
  id: number;
  userId: number;
  notificationTypeId: number;
  friendId: number | null;
  snapSyncId: number | null;

  data: any | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  sound: string | null;
  ttl: number | null;
  expiration: number | null;
  priority: string | null;
  badge: number | null;
  channelId: string | null;
  categoryId: string | null;
  mutableContent: boolean | null;

  read: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
