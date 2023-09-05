import { ApiCodes } from '@/utils/apiCodes';

export class HttpException extends Error {
  public status: number;
  public message: string;
  public data: any;
  public apiCode: number;

  constructor(status: number, message: string, data?: any, apiCode?: number) {
    super(message);
    this.status = status;
    this.message = message;
    this.data = data;
    this.apiCode = apiCode || ApiCodes.SomethingWentWrong;
  }
}
