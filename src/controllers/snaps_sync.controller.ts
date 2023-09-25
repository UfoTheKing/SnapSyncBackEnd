import { RequestWithBlocked, RequestWithUser } from '@/interfaces/auth.interface';
import UserService from '@/services/users.service';
import { NextFunction, Response } from 'express';
import FriendshipStatusService from '@/services/friendship_status.service';
import SnapInstanceService from '@/services/snaps_instances.service';
import ExpoService from '@/services/expo.service';
import { HttpException } from '@/exceptions/HttpException';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
import { CreateSnapInstanceDto } from '@/dtos/snaps_instances.dto';
import WebSocket from 'ws';
import { WEBSOCKET_HOST } from '@/config';
import { WssMessage, WssSystemMessage } from '@/interfaces/project/wss.interface';
import WebsocketTokenService from '@/services/websocket_tokens.service';
import SnapSyncService from '@/services/snaps_sync.service';
import { WssActions } from '@/utils/enums';
import { CreateSnapInstanceUserDto } from '@/dtos/snaps_instances_users.dto';

class SnapsSyncController {
  private wsConnection: WebSocket | null = null;
  private isSystemLoggedIn = false;

  public userService = new UserService();
  public friendshipStatusService = new FriendshipStatusService();
  public snapInstanceService = new SnapInstanceService();
  public expoService = new ExpoService();
  public websocketTokenService = new WebsocketTokenService();
  public snapSyncService = new SnapSyncService();

  constructor() {
    this.connectWebSocket();
  }

  async connectWebSocket() {
    // Assicurati che la connessione WebSocket non sia già aperta
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      return;
    }

    this.wsConnection = new WebSocket(WEBSOCKET_HOST);

    this.wsConnection.on('open', async () => {
      // Genero il WebSocket token che utilizzerò per identificare il client backend
      let { model, hashedToken } = await this.websocketTokenService.createWebsocketToken();
      let wssMessage: WssMessage = {
        token: hashedToken,
        action: WssActions.LOGIN_SYSTEM,
        deviceUuid: null,
        data: null,
      };
      this.wsConnection.send(JSON.stringify(wssMessage));
    });

    this.wsConnection.on('message', data => {
      let message = JSON.parse(data.toString()) as WssSystemMessage;
      if (message) {
        if (message.action === WssActions.LOGIN_SYSTEM) {
          if (message.success) {
            this.isSystemLoggedIn = true;
          } else {
            this.isSystemLoggedIn = false;
          }
        }
      }
    });

    this.wsConnection.on('close', () => {
      this.wsConnection = null;
    });

    this.wsConnection.on('error', error => {
      this.wsConnection = null;
    });
  }

  public createSnapInstance = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction) => {
    try {
      if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        throw new HttpException(500, 'WebSocket connection not open');
      }

      if (!this.isSystemLoggedIn) {
        throw new HttpException(500, 'WebSocket system not logged in');
      }

      if (req.isBlockedByViewer) throw new HttpException(404, 'User not found');
      if (req.isViewerBlocked) throw new HttpException(400, 'Ops! User is blocked');

      const userId = parseInt(req.params.userId);
      if (!userId) throw new MissingParamsException('userId');

      const user = await this.userService.findUserById(userId);
      if (!user) throw new HttpException(404, 'User not found');

      if (user.id === req.user.id) throw new HttpException(400, "You can't create a SnapSync with yourself");

      const friendship_status = await this.friendshipStatusService.getFriendshipStatus(req.user.id, user.id);
      if (!friendship_status.isFriend) throw new HttpException(400, 'Ops! You are not friends');
      if (friendship_status.isBlocking) throw new HttpException(400, 'Ops! You have blocked this user');

      const snapSyncUserOwner: CreateSnapInstanceUserDto = {
        userId: req.user.id,
        isOwner: true,
        snapInstanceId: 0, // Lo setto dopo
      };
      const snapSyncUserJoined: CreateSnapInstanceUserDto = {
        userId: user.id,
        isOwner: false,
        snapInstanceId: 0, // Lo setto dopo
      };

      const data: CreateSnapInstanceDto = {
        userId: req.user.id,
      };

      const snapInstance = await this.snapInstanceService.createSnapInstance(data, [snapSyncUserOwner, snapSyncUserJoined]);

      // Mando un messaggio al WebSocket
      let wssMessage: WssMessage = {
        action: WssActions.CREATE_SNAP_INSTANCE,
        data: {
          key: snapInstance.instanceKey,
        },
      };

      this.wsConnection.send(JSON.stringify(wssMessage));

      // Aspetto la risposta dal WebSocket
      const response = (await new Promise(resolve => {
        this.wsConnection.once('message', data => {
          resolve(JSON.parse(data.toString()));
        });
      })) as WssSystemMessage;

      // console.log(response);

      if (!response || !response.success) {
        throw new HttpException(500, 'Ops! Something went wrong');
      }

      // Mando una notifica push all'utente invitato
      await this.expoService.sendSnapSyncNotification(snapInstance.instanceKey, [user.id], req.user);

      res.status(200).json({ message: 'ok', key: snapInstance.instanceKey });
    } catch (error) {
      next(error);
    }
  };

  private sendErrorSnapWssMessage = async (key: string | null): Promise<void> => {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN && this.isSystemLoggedIn && key) {
      let wssMessage: WssMessage = {
        action: WssActions.ERROR_SNAP,
        data: {
          key: key,
        },
      };

      this.wsConnection.send(JSON.stringify(wssMessage));
    }
  };
}

export default SnapsSyncController;
