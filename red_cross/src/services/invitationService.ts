import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Activity } from '@/models/Activity';
import { Invitation } from '@/models/Invitation';
import { getActivityById } from '@/services/activityService';

export function getInvitationId(activityId: string, volunteerId: string) {
  return `${activityId}_${volunteerId}`;
}

export async function getActivityInvitations(
  activityId: string
): Promise<Invitation[]> {
  const invitationsQuery = query(
    collection(db, 'invitations'),
    where('activityId', '==', activityId)
  );
  const snapshot = await getDocs(invitationsQuery);

  return snapshot.docs.map(document => document.data() as Invitation);
}

export async function createActivityInvitations(
  activityId: string,
  volunteerIds: string[]
): Promise<void> {
  if (volunteerIds.length === 0) {
    return;
  }

  const batch = writeBatch(db);
  const sentAt = new Date().toISOString();

  volunteerIds.forEach(volunteerId => {
    const invitationId = getInvitationId(activityId, volunteerId);
    const invitation: Invitation = {
      id: invitationId,
      activityId,
      volunteerId,
      sentAt,
      response: 'PENDING',
    };
    const invitationRef = doc(db, 'invitations', invitationId);

    batch.set(invitationRef, invitation);
  });

  await batch.commit();
}

export async function getVolunteerInvitations(
  volunteerId: string
): Promise<Array<{ activity: Activity; invitation: Invitation }>> {
  const invitationsQuery = query(
    collection(db, 'invitations'),
    where('volunteerId', '==', volunteerId)
  );
  const invitationsSnapshot = await getDocs(invitationsQuery);
  const invitations = invitationsSnapshot.docs.map(
    document => document.data() as Invitation
  );
  const items = await Promise.all(
    invitations.map(async invitation => {
      const activity = await getActivityById(invitation.activityId);

      if (!activity) {
        return null;
      }

      return { activity, invitation };
    })
  );

  return items
    .filter(
      (
        item
      ): item is {
        activity: Activity;
        invitation: Invitation;
      } => Boolean(item)
    )
    .sort((first, second) =>
      first.activity.startDateTime.localeCompare(second.activity.startDateTime)
    );
}

export async function getVolunteerInvitation(
  activityId: string,
  volunteerId: string
): Promise<Invitation | null> {
  const invitationRef = doc(db, 'invitations', getInvitationId(activityId, volunteerId));
  const snapshot = await getDoc(invitationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Invitation;
}

export async function respondToInvitation(
  activityId: string,
  volunteerId: string,
  response: 'ACCEPTED' | 'DECLINED',
  responseMessage?: string
): Promise<void> {
  const invitationRef = doc(db, 'invitations', getInvitationId(activityId, volunteerId));

  await updateDoc(invitationRef, {
    response,
    respondedAt: new Date().toISOString(),
    responseMessage: response === 'DECLINED' ? responseMessage ?? '' : '',
  });
}
