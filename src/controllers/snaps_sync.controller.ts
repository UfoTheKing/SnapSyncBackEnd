import { RequestWithBlocked, RequestWithFile, RequestWithUser } from '@/interfaces/auth.interface';
import UserService from '@/services/users.service';
import { NextFunction, Response } from 'express';
import FriendshipStatusService from '@/services/friendship_status.service';
import ExpoService from '@/services/expo.service';
import { HttpException } from '@/exceptions/HttpException';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
import WebSocket from 'ws';
import { WEBSOCKET_HOST } from '@/config';
import { WssMessage, WssSystemMessage } from '@/interfaces/project/wss.interface';
import WebsocketTokenService from '@/services/websocket_tokens.service';
import SnapSyncService from '@/services/snaps_sync.service';
import { WssActions } from '@/utils/enums';
import { ApiCodes } from '@/utils/apiCodes';
import { CreateSnapSyncUserDto } from '@/dtos/snaps_sync_users.dto';
import { CreateSnaSyncDto, TakeSnapDto } from '@/dtos/snaps_sync.dto';
import { boolean } from 'boolean';

class SnapsSyncController {
  private wsConnection: WebSocket | null = null;
  private isSystemLoggedIn = false;

  public userService = new UserService();
  public friendshipStatusService = new FriendshipStatusService();
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
      if (!friendship_status.isFriend) throw new HttpException(400, `You and ${user.username} are not friends`);
      if (friendship_status.isBlocking) throw new HttpException(400, 'Ops! You have blocked this user');

      const snapSyncUserOwner: CreateSnapSyncUserDto = {
        userId: req.user.id,
        isOwner: true,
        snapSyncId: 0, // Lo setto dopo
      };
      const snapSyncUserJoined: CreateSnapSyncUserDto = {
        userId: user.id,
        isOwner: false,
        snapSyncId: 0, // Lo setto dopo
      };

      const data: CreateSnaSyncDto = {
        userId: req.user.id,
      };

      const { snap, notification } = await this.snapSyncService.createSnapSync(data, [snapSyncUserOwner, snapSyncUserJoined]);

      // Mando un messaggio al WebSocket
      let wssMessage: WssMessage = {
        action: WssActions.CREATE_SNAP_INSTANCE,
        data: {
          key: snap.instanceKey,
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
      await this.expoService.sendSnapSyncNotification(notification, req.user, snap.instanceKey);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public takeSnap = async (req: RequestWithUser & RequestWithFile, res: Response, next: NextFunction) => {
    let globalKey: string | null = null;
    try {
      if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        throw new HttpException(500, 'WebSocket connection not open');
      }

      if (!this.isSystemLoggedIn) {
        throw new HttpException(500, 'WebSocket system not logged in');
      }

      if (!req.file) throw new HttpException(422, 'File not found');
      if (!req.file.buffer) throw new HttpException(422, 'File buffer not found');

      if (!req.params.key) throw new MissingParamsException('key');

      const key = req.params.key;
      if (typeof key !== 'string') throw new HttpException(422, 'Key must be a string');
      const snapSync = await this.snapSyncService.findSnapSyncByKey(key);
      if (!snapSync) throw new HttpException(404, 'SnapSync not found');
      if (boolean(snapSync.isPublished)) throw new HttpException(400, 'Ops! This SnapSync is already published');

      globalKey = key;

      const data: TakeSnapDto = {
        userId: req.user.id,
        snapSyncId: snapSync.id,
        file: req.file,
      };

      const { allUsersSnapped } = await this.snapSyncService.takeSnap(data);

      if (allUsersSnapped) {
        // Faccio mandare al websocket un messaggio per mostarare l'anteprima
        let wssMessage: WssMessage = {
          action: WssActions.SHOW_SNAP_PREVIEW,
          data: {
            key: key,
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
          throw new HttpException(500, 'Ops! Something went wrong', null, ApiCodes.DeleteSnap);
        }
      }

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      if (error && error instanceof HttpException && error.apiCode === ApiCodes.DeleteSnap) {
        await this.sendErrorSnapWssMessage(globalKey);
      }

      next(error);
    }
  };

  // public publishSnap = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  //   let globalKey: string | null = null;
  //   try {
  //     if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
  //       throw new HttpException(500, 'WebSocket connection not open');
  //     }

  //     if (!this.isSystemLoggedIn) {
  //       throw new HttpException(500, 'WebSocket system not logged in');
  //     }

  //     if (!req.params.key) throw new MissingParamsException('key');
  //     if (typeof req.params.key !== 'string') throw new HttpException(422, 'Key must be a string');

  //     const key = req.params.key;
  //     const snapInstance = await this.snapInstanceService.findSnapInstanceByKey(key);
  //     if (!snapInstance) throw new HttpException(404, 'SnapSync not found');
  //     if (snapInstance.userId !== req.user.id) throw new HttpException(400, 'Ops! You are not the owner of this SnapSync');

  //     globalKey = snapInstance.instanceKey;

  //     const data: PublishSnapDto = {
  //       userId: req.user.id,
  //       snapInstanceId: snapInstance.id,
  //     };

  //     await this.snapInstanceService.publishSnap(data);

  //     // Faccio mandare al websocket un messaggio per farli chiudere l'anteprima
  //     let wssMessage: WssMessage = {
  //       action: WssActions.PUBLISH_SNAP,
  //       data: {
  //         key: key,
  //       },
  //     };

  //     this.wsConnection.send(JSON.stringify(wssMessage));

  //     // Aspetto la risposta dal WebSocket
  //     const response = (await new Promise(resolve => {
  //       this.wsConnection.once('message', data => {
  //         resolve(JSON.parse(data.toString()));
  //       });
  //     })) as WssSystemMessage;

  //     // console.log(response);

  //     if (!response || !response.success) {
  //       throw new HttpException(500, 'Ops! Something went wrong', null, ApiCodes.DeleteSnap);
  //     }

  //     res.status(200).json({ message: 'ok' });
  //   } catch (error) {
  //     // console.log(error, globalKey);
  //     if (error && error instanceof HttpException && error.apiCode === ApiCodes.DeleteSnap) {
  //       await this.sendErrorSnapWssMessage(globalKey);
  //     }
  //     next(error);
  //   }
  // };

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
