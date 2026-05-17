export type ActivityStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ActivityType = 'INTERNAL' | 'EXTERNAL';

export type BaseActivity = {
  id: string;
  title: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  location: string;
  status: ActivityStatus;
  createdByUserId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

export type ActivityRequirement = {
  id: string;
  activityId: string;
  competencyId: string;
  requiredCount: number;
};

export type ExternalActivity = BaseActivity & {
  type: 'EXTERNAL';
};

export type InternalActivity = BaseActivity & {
  type: 'INTERNAL';
  qrToken: string;
  qrValidFrom: string; // ISO string
  qrValidTo: string; // ISO string
};

export type Activity = InternalActivity | ExternalActivity;

export type InternalActivityAttendance = {
  activityId: string;
  userId: string;
  checkedInAt: string; // ISO string
};
