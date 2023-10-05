export interface SnapSync {
  id: number;
  userId: number;

  instanceKey: string;

  timerStarted: boolean;
  timerSeconds: number;
  timerStartAt: Date | null;

  timerPublishStarted: boolean;
  timerPublishSeconds: number;
  timerPublishStartAt: Date | null;

  isPublished: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  unarchived: boolean;
}
