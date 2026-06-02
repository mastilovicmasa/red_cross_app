export type AssignmentStatus =
  | 'ASSIGNED'
  | 'CANCELLED'
  | 'COMPLETED';

export type Assignment = {
  id: string;
  activityId: string;
  volunteerId: string;
  assignedAt: string; // ISO string
  status: AssignmentStatus;
  volunteerComment?: string;
  reportSubmittedAt?: string; // ISO string
};
