import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Activity } from '@/models/Activity';
import { Invitation } from '@/models/Invitation';

export async function getActivityInvitations(
  activityId: string
): Promise<Invitation[]> {
  const invitationsRef = collection(
    db,
    'activities',
    activityId,
    'invitations'
  );
  const snapshot = await getDocs(invitationsRef);

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
    const invitation: Invitation = {
      id: volunteerId,
      activityId,
      volunteerId,
      sentAt,
      response: 'PENDING',
    };
    const invitationRef = doc(
      db,
      'activities',
      activityId,
      'invitations',
      volunteerId
    );

    batch.set(invitationRef, invitation);
  });

  await batch.commit();
}

export async function getVolunteerInvitations(
  volunteerId: string
): Promise<Array<{ activity: Activity; invitation: Invitation }>> {
  const activitiesSnapshot = await getDocs(collection(db, 'activities'));
  const activities = activitiesSnapshot.docs.map(
    document => document.data() as Activity
  );
  const invitations = await Promise.all(
    activities.map(async activity => {
      const invitation = await getVolunteerInvitation(activity.id, volunteerId);

      return invitation ? { activity, invitation } : null;
    })
  );

  return invitations
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
  const invitationRef = doc(
    db,
    'activities',
    activityId,
    'invitations',
    volunteerId
  );
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
  const invitationRef = doc(
    db,
    'activities',
    activityId,
    'invitations',
    volunteerId
  );

  await updateDoc(invitationRef, {
    response,
    respondedAt: new Date().toISOString(),
    responseMessage: response === 'DECLINED' ? responseMessage ?? '' : '',
  });
}
