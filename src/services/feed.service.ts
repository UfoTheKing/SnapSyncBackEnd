import { HttpException } from '@/exceptions/HttpException';
import { Feed, FeedChildComment, FeedComment, FeedUser, TimelineNode } from '@/interfaces/project/feed.interface';
import { SnapsSync } from '@/models/snaps_sync.model';
import { SnapsSyncUsers } from '@/models/snaps_sync_users.model';
import { Users } from '@/models/users.model';
import UserService from './users.service';
import { SnapsShapesPositions } from '@/models/snaps_shapes_positions.model';
import { SnapsShapes } from '@/models/snaps_shapes.model';
import SnapShapeService from './snaps_shapes.service';
import SnapSyncService from './snaps_sync.service';
import { SnapsSyncComments } from '@/models/snaps_sync_comments.model';
import { SnapsSyncCommentsLikes } from '@/models/snaps_sync_comments_likes.model';
import { nowUtc, timeDifference } from '@/utils/util';
import { Location } from '@/interfaces/locations.interface';
import { Locations } from '@/models/locations.model';

class FeedService {
  public async findTimeline(userId: number): Promise<{
    nodes: TimelineNode[];
  }> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const snapsSync = await SnapsSync.query().whereNotDeleted();

    const nodes: TimelineNode[] = [];

    await Promise.all(
      snapsSync.map(async snapSync => {
        try {
          let feed = await this.findFeedById(snapSync.id, userId);
          nodes.push({
            feed: feed,
          });
        } catch (error) {
          // Non faccio nulla semplicemente non aggiungo il feed
          console.log(error);
        }
      }),
    );

    return {
      nodes: nodes,
    };
  }

  public async findFeedById(feedId: number, loggedUserId: number): Promise<Feed> {
    const snapSync = await SnapsSync.query().whereNotDeleted().findById(feedId);
    if (!snapSync) throw new HttpException(404, "Feed doesn't exist");

    const shape = await SnapsShapes.query().whereNotDeleted().findById(snapSync.snapShapeId);
    if (!shape) throw new HttpException(404, "Shape doesn't exist");

    let shapeIcon = await new SnapShapeService().findIconUrlById(shape.id);
    let shapeFocusedIcon = await new SnapShapeService().findFocusedIconUrlById(shape.id);

    const owner = await Users.query().whereNotDeleted().findById(snapSync.userId);
    if (!owner) throw new HttpException(404, "Owner doesn't exist");

    const snapsSyncUsers = await SnapsSyncUsers.query().whereNotDeleted().where({ snapSyncId: feedId });
    const users: FeedUser[] = [];

    await Promise.all(
      snapsSyncUsers.map(async snapSyncUser => {
        let user = await new UserService().findSmallUserById(snapSyncUser.userId);
        let position = await SnapsShapesPositions.query().whereNotDeleted().findById(snapSyncUser.snapShapePositionId);
        if (!position) throw new HttpException(404, "Position doesn't exist");

        let diff = timeDifference(nowUtc(), new Date(snapSyncUser.snappedAtUtc));
        let subtitle = diff;

        let location: Location | null = null;
        if (snapSyncUser.locationId) {
          location = await Locations.query().whereNotDeleted().findById(snapSyncUser.locationId);
          if (location) {
            subtitle = `${location.shortName} • ${diff}`;
          }
        }

        users.push({
          user: user,
          position: position,
          subtitle: subtitle,
        });
      }),
    );

    const image = await new SnapSyncService().findImageUrlById(snapSync.id);

    const commentsCount = await SnapsSyncComments.query().whereNotDeleted().where({ snapSyncId: feedId }).resultSize();
    const comments: FeedComment[] = await this.findRankedFeedCommentsById(feedId, loggedUserId);

    let obj: Feed = {
      id: snapSync.id,
      shape: {
        id: shape.id,
        name: shape.name,
        numberOfUsers: shape.numberOfUsers,
        iconUrl: shapeIcon,
        focusedIconUrl: shapeFocusedIcon,
      },
      owner: owner,
      users: users,

      originalHeight: shape.height,
      originalWidth: shape.width,

      image: image,

      commentsCount: commentsCount,
      comments: comments,

      publishedAt: snapSync.createdAt,
    };

    return obj;
  }

  public async findRankedFeedCommentsById(feedId: number, loggedUserId: number): Promise<FeedComment[]> {
    const MAX_ITEMS = 1;
    const comments: FeedComment[] = [];

    // TODO: Controllo se esiste un commento dove gli utenti che hanno fatto lo snap_sync
    // hanno messo like / hanno commentato. Farlo in una Stored Procedure per ottimizzare le query

    const findSnapSync = await SnapsSync.query().whereNotDeleted().findById(feedId);
    if (!findSnapSync) throw new HttpException(404, "Feed doesn't exist");

    const snapSyncUsers = await SnapsSyncUsers.query().whereNotDeleted().where({ snapSyncId: feedId });
    const usersIds: number[] = snapSyncUsers.map(snapSyncUser => snapSyncUser.userId);

    // Controllo se esiste un commento dove tutti gli utenti hanno messo like escludendo gli utenti che hanno fatto lo snap_sync

    const snapSyncComment = await SnapsSyncComments.query().whereNotDeleted().where('snapSyncId', feedId).whereNull('snapSyncParentCommentId');

    await Promise.all(
      snapSyncComment.map(async snapSyncComment => {
        let c = await this.findFeedCommentById(snapSyncComment.id, loggedUserId);
        comments.push(c);
      }),
    );

    return comments;
  }

  public async findFeedCommentById(id: number, loggedUserId: number): Promise<FeedComment> {
    const snapSyncComment = await SnapsSyncComments.query().whereNotDeleted().findById(id);
    if (!snapSyncComment) throw new HttpException(404, "Comment doesn't exist");

    const user = await Users.query().whereNotDeleted().findById(snapSyncComment.userId);
    if (!user) throw new HttpException(404, "User doesn't exist");

    const smallUser = await new UserService().findSmallUserById(user.id);

    const likesCount = await SnapsSyncCommentsLikes.query().whereNotDeleted().where({ snapSyncCommentId: id }).resultSize();

    const snapSyncCommentLike = await SnapsSyncCommentsLikes.query()
      .whereNotDeleted()
      .where({ snapSyncCommentId: id })
      .where({ userId: loggedUserId })
      .first();
    const hasLikedComment = snapSyncCommentLike ? true : false;
    const childCommentsCount = await SnapsSyncComments.query().whereNotDeleted().where({ snapSyncParentCommentId: id }).resultSize();

    const text = snapSyncComment.text;

    let obj: FeedComment = {
      id: snapSyncComment.id,
      snapSyncId: snapSyncComment.snapSyncId,
      userId: snapSyncComment.userId,

      likesCount: likesCount,
      hasLikedComment: hasLikedComment,

      childCommentsCount: childCommentsCount,

      text: text,

      user: smallUser,

      createdAt: snapSyncComment.createdAt,
    };

    return obj;
  }
}

export default FeedService;
