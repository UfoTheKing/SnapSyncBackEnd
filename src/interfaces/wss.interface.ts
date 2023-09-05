export interface WssSystemMessage {
  success: boolean;
  message: string;
  action: string;
  data: any | null;
  code: number;
  isBroadcast: boolean;
  sender: string;
}

export interface WssMessage {
  token?: string;
  deviceUuid?: string;
  action: string;
  data?: any;
}
