import { HttpException } from '@/exceptions/HttpException';
import { SnapSyncComment } from '@/interfaces/snaps_sync_comments.interface';
import { SnapsSyncComments } from '@/models/snaps_sync_comments.model';

class SnapSyncCommentService {
  public async findSnapSyncCommentById(commentId: number): Promise<SnapSyncComment> {
    const findOne = await SnapsSyncComments.query().whereNotDeleted().findById(commentId);
    if (!findOne) throw new HttpException(404, "Comment doesn't exist");

    return findOne;
  }

  public async deleteComment(commentId: number): Promise<void> {
    await SnapsSyncComments.query().whereNotDeleted().findById(commentId).delete();
  }
}

export default SnapSyncCommentService;
