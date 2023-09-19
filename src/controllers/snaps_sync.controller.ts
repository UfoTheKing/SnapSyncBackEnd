import { RequestWithFile, RequestWithUser } from '@/interfaces/auth.interface';
import UserService from '@/services/users.service';
import { NextFunction, Request, Response } from 'express';
import FriendshipStatusService from '@/services/friendship_status.service';
import SnapInstanceService from '@/services/snaps_instances.service';
import ExpoService from '@/services/expo.service';
import SnapShapeService from '@/services/snaps_shapes.service';
import { HttpException } from '@/exceptions/HttpException';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
import { TakeSnapDto } from '@/dtos/snaps_instances.dto';
import WebSocket from 'ws';
import { WEBSOCKET_HOST } from '@/config';
import { WssMessage, WssSystemMessage } from '@/interfaces/project/wss.interface';
import WebsocketTokenService from '@/services/websocket_tokens.service';
import { ApiCodes } from '@/utils/apiCodes';
import SnapShapePositionService from '@/services/snaps_shapes_positions.service';
import { CreateSnapSyncDto } from '@/dtos/snaps_sync.dto';
import SnapSyncService from '@/services/snaps_sync.service';
import { WssActions } from '@/utils/enums';
import { SnapSyncShape } from '@/interfaces/project/snaps_sync.interface';

class SnapsSyncController {
  private wsConnection: WebSocket | null = null;
  private isSystemLoggedIn = false;

  public userService = new UserService();
  public friendshipStatusService = new FriendshipStatusService();
  public snapInstanceService = new SnapInstanceService();
  public expoService = new ExpoService();
  public snapShapeService = new SnapShapeService();
  public snapShapePositionService = new SnapShapePositionService();
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

  public getSnapsSyncShapes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.snapShapeService.findAllSnapsShapes();

      let shapes: Array<SnapSyncShape> = [];

      for (let i = 0; i < data.length; i++) {
        const iconUrl = await this.snapShapeService.findIconUrlById(data[i].id);
        const focusedIconUrl = await this.snapShapeService.findFocusedIconUrlById(data[i].id);
        const positions = await this.snapShapePositionService.findAllSnapsShapesPositionsBySnapShapeId(data[i].id);
        const grid = await this.snapShapeService.findSnapShapeGridById(data[i].id, true);

        shapes.push({
          id: data[i].id,
          name: data[i].name,
          numberOfUsers: data[i].numberOfUsers,
          grid: grid,
          rows: data[i].rows,
          columns: data[i].columns,
          spacing: data[i].spacing,
          width: data[i].width,
          height: data[i].height,
          iconUrl: iconUrl,
          focusedIconUrl: focusedIconUrl,
          positions: positions,
        });
      }

      res.status(200).json({ shapes });
    } catch (error) {
      next(error);
    }
  };

  public checkSnapInstance = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.params.key) throw new MissingParamsException('key');

      const key = req.params.key;
      const snapInstance = await this.snapInstanceService.findSnapInstanceByKey(key);
      if (!snapInstance) throw new HttpException(404, "SnapSync doesn't exist");

      await this.snapInstanceService.checkSnapInstance(snapInstance.id, req.user.id);

      const shape = await this.snapShapeService.findSnapShapeById(snapInstance.snapShapeId);
      const iconUrl = await this.snapShapeService.findIconUrlById(snapInstance.snapShapeId);
      const focusedIconUrl = await this.snapShapeService.findFocusedIconUrlById(snapInstance.snapShapeId);
      const positions = await this.snapShapePositionService.findAllSnapsShapesPositionsBySnapShapeId(snapInstance.snapShapeId);
      const grid = await this.snapShapeService.findSnapShapeGridById(snapInstance.snapShapeId, true);

      const rShape: SnapSyncShape = {
        id: shape.id,
        name: shape.name,
        numberOfUsers: shape.numberOfUsers,
        grid: grid,
        rows: shape.rows,
        columns: shape.columns,
        spacing: shape.spacing,
        width: shape.width,
        height: shape.height,
        iconUrl: iconUrl,
        focusedIconUrl: focusedIconUrl,
        positions: positions,
      };

      res.status(200).json({ message: 'ok', isJoinable: true, shape: rShape });
    } catch (error) {
      next(error);
    }
  };

  public takeSnap = async (req: RequestWithUser & RequestWithFile, res: Response, next: NextFunction) => {
    let globalKey: string | null = null;
    try {
      if (!req.file) throw new HttpException(400, 'No snap file provided!');
      if (!req.file.buffer) throw new HttpException(400, 'No snap file provided!');
      if (!req.params.key) throw new MissingParamsException('key');

      if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        throw new HttpException(500, 'WebSocket connection not open');
      }

      if (!this.isSystemLoggedIn) {
        throw new HttpException(500, 'WebSocket system not logged in');
      }

      const key = req.params.key;
      const snapInstance = await this.snapInstanceService.findSnapInstanceByKey(key);
      if (!snapInstance) throw new HttpException(404, "SnapSync doesn't exist");

      globalKey = snapInstance.instanceKey;

      const data: TakeSnapDto = {
        userId: req.user.id,
        snapInstanceId: snapInstance.id,
        file: req.file,
      };

      const areAllSnapped = await this.snapInstanceService.takeSnap(data);

      if (areAllSnapped) {
        let wssMessage: WssMessage = {
          action: WssActions.SEND_SNAP,
          data: {
            key: snapInstance.instanceKey,
          },
        };

        this.wsConnection.send(JSON.stringify(wssMessage));

        // Aspetta un messaggio dal server WebSocket
        const messageFromWebSocket = (await new Promise(resolve => {
          this.wsConnection.once('message', data => {
            resolve(JSON.parse(data.toString()));
          });
        })) as WssSystemMessage;

        if (!messageFromWebSocket.success) {
          await this.sendErrorSnapWssMessage(globalKey);
        }
      }

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      if (error instanceof HttpException && error.apiCode === ApiCodes.DeleteSnap) {
        await this.sendErrorSnapWssMessage(globalKey);
      }

      next(error);
    }
  };

  public cloudinaryWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: controllare che il webhook sia stato inviato da Cloudinary con il signatureVerification
      // Se corretto salvare il file su s3 e mandare un messaggio WebSocket a tutti i client dello SnapSync

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public publishSnap = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        throw new HttpException(500, 'WebSocket connection not open');
      }

      if (!this.isSystemLoggedIn) {
        throw new HttpException(500, 'WebSocket system not logged in');
      }

      if (!req.params.key) throw new MissingParamsException('key');

      const key = req.params.key;
      const snapInstance = await this.snapInstanceService.findSnapInstanceByKey(key);
      if (!snapInstance) throw new HttpException(404, "SnapSync doesn't exist");

      if (snapInstance.userId !== req.user.id) {
        throw new HttpException(403, "You can't publish this SnapSync");
      }

      const data: CreateSnapSyncDto = {
        snapInstanceId: snapInstance.id,
      };

      await this.snapSyncService.createSnapSync(data);

      // Mando un messaggio WebSocket a tutti i client
      let wssMessage: WssMessage = {
        action: WssActions.PUBLISH_SNAP,
        data: {
          key: snapInstance.instanceKey,
        },
      };

      this.wsConnection.send(JSON.stringify(wssMessage));

      res.status(200).json({ message: 'ok' });
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
