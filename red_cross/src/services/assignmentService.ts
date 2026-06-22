import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Assignment } from '@/models/Assignment';
import { Activity } from '@/models/Activity';
import { getActivityById } from '@/services/activityService';

export function getAssignmentId(activityId: string, volunteerId: string) {
  return `${activityId}_${volunteerId}`;
}

export async function getActivityAssignments(
  activityId: string
): Promise<Assignment[]> {
  const assignmentsQuery = query(
    collection(db, 'assignments'),
    where('activityId', '==', activityId)
  );
  const snapshot = await getDocs(assignmentsQuery);

  return snapshot.docs.map(document => document.data() as Assignment);
}

export async function getVolunteerAssignment(
  activityId: string,
  volunteerId: string
): Promise<Assignment | null> {
  const assignmentRef = doc(db, 'assignments', getAssignmentId(activityId, volunteerId));
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
  const assignmentId = getAssignmentId(activityId, volunteerId);
  const assignment: Assignment = {
    id: assignmentId,
    activityId,
    volunteerId,
    assignedAt: new Date().toISOString(),
    status: 'ASSIGNED',
  };
  const assignmentRef = doc(db, 'assignments', assignmentId);

  await setDoc(assignmentRef, assignment);
}

export async function cancelVolunteerAssignment(
  activityId: string,
  volunteerId: string
): Promise<void> {
  const assignmentRef = doc(db, 'assignments', getAssignmentId(activityId, volunteerId));

  await updateDoc(assignmentRef, { status: 'CANCELLED' });
}

export async function getVolunteerAssignments(
  volunteerId: string
): Promise<Array<{ activity: Activity; assignment: Assignment }>> {
  const assignmentsQuery = query(
    collection(db, 'assignments'),
    where('volunteerId', '==', volunteerId)
  );
  const assignmentsSnapshot = await getDocs(assignmentsQuery);
  const assignments = assignmentsSnapshot.docs.map(
    document => document.data() as Assignment
  );
  const items = await Promise.all(
    assignments.map(async assignment => {
      const activity = await getActivityById(assignment.activityId);

      if (!activity) {
        return null;
      }

      return { activity, assignment };
    })
  );

  return items
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
