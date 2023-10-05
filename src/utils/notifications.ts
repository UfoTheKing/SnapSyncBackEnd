import { ExpoPushSuccessTicket, ExpoPushTicket } from 'expo-server-sdk';

// export declare type ExpoPushTicket = ExpoPushSuccessTicket | ExpoPushErrorTicket;
export function isExpoPushSuccessTicket(ticket: ExpoPushTicket): ticket is ExpoPushSuccessTicket {
  return ticket.status === 'ok';
}
