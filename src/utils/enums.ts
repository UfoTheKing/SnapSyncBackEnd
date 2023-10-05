export enum FriendshipStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

export enum NotificationType {
  FriendRequestReceived = 'FriendRequestReceived',
  FriendRequestAccepted = 'FriendRequestAccepted',
  SnapSyncRequestReceived = 'SnapSyncRequestReceived',
}

export enum WssActions {
  LOGIN = 'LOGIN',
  LOGIN_SYSTEM = 'LOGIN_SYSTEM',
  GET_CONNECTED_USERS = 'GET_CONNECTED_USERS',

  CREATE_SNAP_INSTANCE = 'CREATE_SNAP_INSTANCE',
  DELETE_SNAP_INSTANCE = 'DELETE_SNAP_INSTANCE',
  JOIN_SNAP_INSTANCE = 'JOIN_SNAP_INSTANCE',
  LEAVE_SNAP_INSTANCE = 'LEAVE_SNAP_INSTANCE',

  SHOW_SNAP_PREVIEW = 'SHOW_SNAP_PREVIEW',
  PUBLISH_SNAP = 'PUBLISH_SNAP',

  ERROR_SNAP = 'ERROR_SNAP',
  GENERIC = 'GENERIC',
}
