import { CreateSnapSyncCommentLikeDto } from '@/dtos/snaps_sync_comments_likes.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SnapSyncCommentLike } from '@/interfaces/snaps_sync_comments_likes.interface';
import { SnapsSyncComments } from '@/models/snaps_sync_comments.model';
import { SnapsSyncCommentsLikes } from '@/models/snaps_sync_comments_likes.model';
import { Users } from '@/models/users.model';
import { isEmpty } from '@/utils/util';

class SnapSyncCommentLikeService {
  public async createSnapSyncCommentLike(data: CreateSnapSyncCommentLikeDto): Promise<SnapSyncCommentLike> {
    if (isEmpty(data)) throw new HttpException(400, "Data can't be empty");

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const snapSyncComment = await SnapsSyncComments.query().whereNotDeleted().findById(data.snapSyncCommentId);
    if (!snapSyncComment) throw new HttpException(404, "Comment doesn't exist");

    const findLike = await SnapsSyncCommentsLikes.query()
      .whereNotDeleted()
      .where({
        userId: data.userId,
        snapSyncCommentId: data.snapSyncCommentId,
      })
      .first();
    if (findLike) throw new HttpException(409, 'Like already exists');

    const like = await SnapsSyncCommentsLikes.query().insert({
      userId: data.userId,
      snapSyncCommentId: data.snapSyncCommentId,
    });

    return like;
  }

  public async unlikeSnapSyncComment(userId: number, snapSyncCommentId: number): Promise<void> {
    await SnapsSyncCommentsLikes.query()
      .whereNotDeleted()
      .where({
        userId: userId,
        snapSyncCommentId: snapSyncCommentId,
      })
      .delete();
  }
}

export default SnapSyncCommentLikeService;
