export type InvitationResponseStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED';

export type Invitation = {
  id: string;
  activityId: string;
  volunteerId: string;
  sentAt: string; // ISO string
  response: InvitationResponseStatus;
  respondedAt?: string; // ISO string
  responseMessage?: string;
};