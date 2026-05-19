import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { InternalActivityAttendance } from '@/models/Activity';
import { getActivityById } from '@/services/activityService';

export type InternalActivityCheckInResult =
  | { success: true; attendance: InternalActivityAttendance }
  | { success: false; message: string };

export async function checkInToInternalActivity(
  activityId: string,
  userId: string,
  qrToken: string
): Promise<InternalActivityCheckInResult> {
  const activity = await getActivityById(activityId);

  if (!activity || activity.type !== 'INTERNAL') {
    return {
      success: false,
      message: 'QR kod ne pripada internoj aktivnosti.',
    };
  }

  if (activity.status === 'CANCELLED') {
    return {
      success: false,
      message: 'Aktivnost je otkazana.',
    };
  }

  if (activity.status !== 'ACTIVE') {
    return {
      success: false,
      message: 'Prisustvo nije moguće evidentirati za ovu aktivnost.',
    };
  }

  if (activity.qrToken !== qrToken) {
    return {
      success: false,
      message: 'QR kod nije validan za ovu aktivnost.',
    };
  }

  const now = new Date();
  const validFrom = new Date(activity.qrValidFrom);
  const validTo = new Date(activity.qrValidTo);

  if (now < validFrom) {
    return {
      success: false,
      message: 'QR kod još nije validan. Sačekajte da aktivnost počne.',
    };
  }

  if (now > validTo) {
    return {
      success: false,
      message: 'QR kod je istekao.',
    };
  }

  const attendanceRef = doc(
    db,
    'activities',
    activityId,
    'attendances',
    userId
  );
  const attendanceSnapshot = await getDoc(attendanceRef);

  if (attendanceSnapshot.exists()) {
    return {
      success: false,
      message: 'Prisustvo je već evidentirano.',
    };
  }

  const attendance: InternalActivityAttendance = {
    activityId,
    userId,
    checkedInAt: now.toISOString(),
  };

  await setDoc(attendanceRef, attendance);

  return {
    success: true,
    attendance,
  };
}

export async function getInternalActivityAttendances(
  activityId: string
): Promise<InternalActivityAttendance[]> {
  const attendancesRef = collection(
    db,
    'activities',
    activityId,
    'attendances'
  );
  const snapshot = await getDocs(attendancesRef);

  return snapshot.docs
    .map(document => document.data() as InternalActivityAttendance)
    .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt));
}
