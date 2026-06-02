import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Activity } from '@/models/Activity';

export async function createActivity(activity: Activity): Promise<void> {
  const activityRef = doc(db, 'activities', activity.id);
  await setDoc(activityRef, activity);
}

export async function cancelActivity(activityId: string): Promise<void> {
  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    status: 'CANCELLED',
    updatedAt: new Date().toISOString(),
  });
}

export async function updateActivity(
  activityId: string,
  data: Partial<Activity>
): Promise<void> {
  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function publishExternalActivity(
  activityId: string
): Promise<void> {
  const activity = await getActivityById(activityId);

  if (!activity || activity.type !== 'EXTERNAL' || activity.status !== 'DRAFT') {
    throw new Error('Only external draft activities can be published.');
  }

  await updateActivity(activityId, { status: 'ACTIVE' });
}

export async function getActivityById(
  activityId: string
): Promise<Activity | null> {
  const activityRef = doc(db, 'activities', activityId);
  const snapshot = await getDoc(activityRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Activity;
}

export async function getAllActivities(): Promise<Activity[]> {
  const snapshot = await getDocs(collection(db, 'activities'));

  return snapshot.docs
    .map(document => document.data() as Activity)
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
}
