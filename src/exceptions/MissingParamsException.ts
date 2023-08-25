export class MissingParamsException extends Error {
  public params: string[] | string;

  constructor(params: string[] | string) {
    let message = 'Missing';
    if (Array.isArray(params)) {
      message += ` params: ${params.join(', ')}`;
    } else {
      message += ` param: ${params}`;
    }
    super(message);
    this.params = params;
  }
}
