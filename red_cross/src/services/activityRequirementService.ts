import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { ActivityRequirement } from '@/models/Activity';

export async function getActivityRequirements(
  activityId: string
): Promise<ActivityRequirement[]> {
  const requirementsRef = collection(
    db,
    'activities',
    activityId,
    'requirements'
  );
  const snapshot = await getDocs(requirementsRef);

  return snapshot.docs.map(document => document.data() as ActivityRequirement);
}

export async function createActivityRequirement(
  activityId: string,
  competencyId: string,
  requiredCount = 1
): Promise<void> {
  const requirement: ActivityRequirement = {
    id: competencyId,
    activityId,
    competencyId,
    requiredCount,
  };
  const requirementRef = doc(
    db,
    'activities',
    activityId,
    'requirements',
    requirement.id
  );

  await setDoc(requirementRef, requirement);
}

export async function updateActivityRequirementCount(
  activityId: string,
  requirementId: string,
  requiredCount: number
): Promise<void> {
  const requirementRef = doc(
    db,
    'activities',
    activityId,
    'requirements',
    requirementId
  );
  await updateDoc(requirementRef, { requiredCount });
}

export async function deleteActivityRequirement(
  activityId: string,
  requirementId: string
): Promise<void> {
  const requirementRef = doc(
    db,
    'activities',
    activityId,
    'requirements',
    requirementId
  );
  await deleteDoc(requirementRef);
}
