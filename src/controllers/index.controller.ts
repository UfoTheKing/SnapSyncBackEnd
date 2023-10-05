import { NextFunction, Request, Response } from 'express';
import ExpoService from '@/services/expo.service';

class IndexController {
  public expoService = new ExpoService();
  public index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const r = req.query.r as string;
      const t = await this.expoService.chunkPushNotificationReceiptIds([r]);
      res.status(200).json({ t });
    } catch (error) {
      next(error);
    }
  };
}

export default IndexController;
