import { WEBSOCKET_ALGORITHM, WEBSOCKET_SECRET_IV, WEBSOCKET_SECRET_KEY } from '@/config';
import { WebsocketToken } from '@/interfaces/websocket_tokens.interface';
import { WebsocketTokens } from '@/models/websocket_tokens.model';
import crypto from 'crypto';

class WebsocketTokenService {
  public async createWebsocketToken(): Promise<{
    model: WebsocketToken;
    hashedToken: string;
  }> {
    const cipher = crypto.createCipheriv(WEBSOCKET_ALGORITHM, WEBSOCKET_SECRET_KEY, WEBSOCKET_SECRET_IV);

    const token = crypto.randomBytes(16).toString('hex').toUpperCase();
    const hashedToken = Buffer.from(cipher.update(token, 'utf8', 'hex') + cipher.final('hex')).toString('base64');

    const createdWebsocketToken = await WebsocketTokens.query().insert({
      token: token,
    });

    return {
      model: createdWebsocketToken,
      hashedToken,
    };
  }

  public async deleteWebsocketToken(id: number): Promise<void> {
    await WebsocketTokens.query().deleteById(id);
  }
}

export default WebsocketTokenService;
