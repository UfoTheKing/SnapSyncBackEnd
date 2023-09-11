import { NextFunction, Request, Response } from 'express';
import fetch from 'cross-fetch';
import ExpoService from '@/services/expo.service';
import { Users } from '@/models/users.model';
import { nowUtc } from '@/utils/util';
import { SnapsSyncComments } from '@/models/snaps_sync_comments.model';

class IndexController {
  public expoService = new ExpoService();
  public index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // let key = 'test';
      // let usersIds = [9];
      // let owner = await Users.query().first();

      // await this.expoService.sendSnapSyncNotification(key, usersIds, owner);

      await SnapsSyncComments.query().insert({
        userId: 9,
        snapSyncId: 1,
        text: 'test',
        createdAtUtc: nowUtc(),
      });

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}

export default IndexController;
