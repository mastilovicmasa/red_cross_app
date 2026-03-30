export type ActivityStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type Activity = {
  id: string;
  title: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  location: string;
  status: ActivityStatus;
  createdByUserId: string;
};

export type ActivityRequirement = {
  id: string;
  activityId: string;
  competencyId: string;
  requiredCount: number;
};

export type ExternalActivity = Activity & {
  type: 'EXTERNAL';
  requiredVolunteerCount?: number;
};

export type InternalActivity = Activity & {
  type: 'INTERNAL';
  qrToken: string;
  qrValidFrom: string; // ISO string
  qrValidTo: string; // ISO string
};