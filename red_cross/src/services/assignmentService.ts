import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Assignment } from '@/models/Assignment';
import { Activity } from '@/models/Activity';

export async function getActivityAssignments(
  activityId: string
): Promise<Assignment[]> {
  const assignmentsRef = collection(
    db,
    'activities',
    activityId,
    'assignments'
  );
  const snapshot = await getDocs(assignmentsRef);

  return snapshot.docs.map(document => document.data() as Assignment);
}

export async function getVolunteerAssignment(
  activityId: string,
  volunteerId: string
): Promise<Assignment | null> {
  const assignmentRef = doc(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId
  );
  const snapshot = await getDoc(assignmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Assignment;
}

export async function assignVolunteer(
  activityId: string,
  volunteerId: string
): Promise<void> {
  const assignment: Assignment = {
    id: volunteerId,
    activityId,
    volunteerId,
    assignedAt: new Date().toISOString(),
    status: 'ASSIGNED',
  };
  const assignmentRef = doc(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId
  );

  await setDoc(assignmentRef, assignment);
}

export async function cancelVolunteerAssignment(
  activityId: string,
  volunteerId: string
): Promise<void> {
  const assignmentRef = doc(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId
  );

  await updateDoc(assignmentRef, { status: 'CANCELLED' });
}

export async function getVolunteerAssignments(
  volunteerId: string
): Promise<Array<{ activity: Activity; assignment: Assignment }>> {
  const activitiesSnapshot = await getDocs(collection(db, 'activities'));
  const activities = activitiesSnapshot.docs.map(
    document => document.data() as Activity
  );
  const assignments = await Promise.all(
    activities.map(async activity => {
      const assignment = await getVolunteerAssignment(activity.id, volunteerId);

      return assignment ? { activity, assignment } : null;
    })
  );

  return assignments
    .filter(
      (
        item
      ): item is {
        activity: Activity;
        assignment: Assignment;
      } => Boolean(item)
    )
    .sort((first, second) =>
      first.activity.startDateTime.localeCompare(second.activity.startDateTime)
    );
}
