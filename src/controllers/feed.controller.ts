import { RequestWithUser } from '@/interfaces/auth.interface';
import FeedService from '@/services/feed.service';
import { NextFunction, Response } from 'express';

class FeedController {
  public feedService = new FeedService();

  public getTimeline = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allSnapsSync = await this.feedService.findTimeline(req.user.id);
      res.status(200).json({ ...allSnapsSync });
    } catch (error) {
      next(error);
    }
  };
}

export default FeedController;
