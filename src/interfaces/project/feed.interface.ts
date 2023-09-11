import { SmallSnapShape } from '../snaps_shapes.interface';
import { SnapShapePosition } from '../snaps_shapes_positions.interface';
import { SmallUser, User } from '../users.interface';

export interface TimelineNode {
  feed?: Feed;
}

export interface FeedComment {
  id: number;
  snapSyncId: number;
  userId: number;

  likesCount: number;
  hasLikedComment: boolean;

  childCommentsCount: number;

  text: string | null;

  user: SmallUser;

  previewChildComments?: FeedChildComment[];

  createdAt: Date;
}

export interface FeedChildComment {
  id: number;
  snapSyncId: number;
  userId: number;
  parentCommentId: number;

  childCommentIndex: number;
  likesCount: number;
  hasLikedComment: boolean;

  text: string | null;

  user: SmallUser;

  createdAt: Date;
}

export interface FeedUser {
  user: SmallUser;
  position: SnapShapePosition;
  subtitle: string;
}

export interface Feed {
  id: number;
  shape: SmallSnapShape;
  owner: User;
  users: FeedUser[];

  image: string;

  originalWidth: number;
  originalHeight: number;

  commentsCount: number;
  comments: FeedComment[];

  publishedAt: Date;
}
