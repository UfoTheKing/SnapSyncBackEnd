import { NextFunction, Response } from 'express';
import { RequestWithBlocked, RequestWithUser } from '@/interfaces/auth.interface';
import { BlockedUsers } from '@/models/blocked_users.model';
import { HttpException } from '@/exceptions/HttpException';

const blockedMiddleware = async (req: RequestWithUser & RequestWithBlocked, res: Response, next: NextFunction) => {
  try {
    // Middleare to check if user is blocked by the logged user or if the logged user is blocked by the user
    if (!req.user) throw new HttpException(401, 'Unauthorized');

    req.isBlockedByViewer = false;
    req.isViewerBlocked = false;

    let userid: number = req.params.userId ? parseInt(req.params.userId) : 0;
    if (!userid) throw new HttpException(400, 'Invalid user id');
    else if (userid !== req.user.id) {
      // Controllo se l'utente di cui si vuole visualizzare il profilo è stato bloccato dall'utente loggato
      let isViewerBlocked = await BlockedUsers.query().whereNotDeleted().where('userId', req.user.id).where('blockedUserId', userid).first();
      if (isViewerBlocked) req.isViewerBlocked = true;

      // Controllo se l'utente loggato è stato bloccato dall'utente di cui si vuole visualizzare il profilo
      let isBlockedByViewer = await BlockedUsers.query().whereNotDeleted().where('userId', userid).where('blockedUserId', req.user.id).first();
      if (isBlockedByViewer) req.isBlockedByViewer = true;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default blockedMiddleware;
