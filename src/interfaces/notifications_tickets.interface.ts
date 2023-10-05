export interface NotificationTicket {
  id: number;
  notificationId: number;
  expoTicketId: string;
  expoPushToken: string;

  createdAt: Date;
  updatedAt: Date;
}
