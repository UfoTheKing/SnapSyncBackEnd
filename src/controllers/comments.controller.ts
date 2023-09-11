import { CreateSnapSyncCommentLikeDto } from '@/dtos/snaps_sync_comments_likes.dto';
import { HttpException } from '@/exceptions/HttpException';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import SnapSyncService from '@/services/snaps_sync.service';
import SnapSyncCommentService from '@/services/snaps_sync_comments.service';
import SnapSyncCommentLikeService from '@/services/snaps_sync_comments_likes.service';
import { NextFunction, Response } from 'express';

class CommentsController {
  public snapSyncCommentService = new SnapSyncCommentService();
  public snapSyncCommentLikeService = new SnapSyncCommentLikeService();
  public snapSyncService = new SnapSyncService();

  public likeComment = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.params.commentId) throw new MissingParamsException('commentId');
      if (isNaN(parseInt(req.params.commentId))) throw new MissingParamsException('commentId');

      const commentId = parseInt(req.params.commentId);
      const comment = await this.snapSyncCommentService.findSnapSyncCommentById(commentId);
      if (!comment) throw new HttpException(404, "Comment doesn't exist");

      const data: CreateSnapSyncCommentLikeDto = {
        userId: req.user.id,
        snapSyncCommentId: commentId,
      };

      await this.snapSyncCommentLikeService.createSnapSyncCommentLike(data);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public unlikeComment = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.params.commentId) throw new MissingParamsException('commentId');
      if (isNaN(parseInt(req.params.commentId))) throw new MissingParamsException('commentId');

      const commentId = parseInt(req.params.commentId);
      const comment = await this.snapSyncCommentService.findSnapSyncCommentById(commentId);
      if (!comment) throw new HttpException(404, "Comment doesn't exist");

      await this.snapSyncCommentLikeService.unlikeSnapSyncComment(req.user.id, commentId);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };

  public deleteComment = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.params.commentId) throw new MissingParamsException('commentId');
      if (isNaN(parseInt(req.params.commentId))) throw new MissingParamsException('commentId');
      if (!req.params.snapSyncId) throw new MissingParamsException('snapSyncId');
      if (isNaN(parseInt(req.params.snapSyncId))) throw new MissingParamsException('snapSyncId');

      const snapSyncId = parseInt(req.params.snapSyncId);
      const commentId = parseInt(req.params.commentId);
      const comment = await this.snapSyncCommentService.findSnapSyncCommentById(commentId);
      if (!comment) throw new HttpException(404, "Comment doesn't exist");

      const snapSync = await this.snapSyncService.findSnapSyncById(snapSyncId);
      if (!snapSync) throw new HttpException(404, "SnapSync doesn't exist");

      if (comment.userId !== req.user.id) throw new HttpException(403, 'You cannot delete this comment');
      if (snapSync.id !== comment.snapSyncId) throw new HttpException(400, 'Comment not related to SnapSync');

      await this.snapSyncCommentService.deleteComment(commentId);

      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}

export default CommentsController;
