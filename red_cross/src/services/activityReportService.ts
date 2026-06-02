import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { db } from '@/firebase/firestore';
import { storage } from '@/firebase/storage';
import { Photo } from '@/models/Photo';

export async function getAssignmentPhotos(
  activityId: string,
  volunteerId: string
): Promise<Photo[]> {
  const photosRef = collection(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId,
    'photos'
  );
  const snapshot = await getDocs(photosRef);

  return snapshot.docs.map(document => document.data() as Photo);
}

export async function getPhotoDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

export async function saveActivityReport({
  activityId,
  volunteerId,
  volunteerComment,
  newPhotoUris,
  removedPhotos,
}: {
  activityId: string;
  volunteerId: string;
  volunteerComment: string;
  newPhotoUris: string[];
  removedPhotos: Photo[];
}): Promise<void> {
  const assignmentRef = doc(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId
  );

  for (const photo of removedPhotos) {
    await deleteObject(ref(storage, photo.path));
    await deleteDoc(
      doc(
        db,
        'activities',
        activityId,
        'assignments',
        volunteerId,
        'photos',
        photo.id
      )
    );
  }

  for (const uri of newPhotoUris) {
    const photoId = createPhotoId();
    const path = `activity-reports/${activityId}/${volunteerId}/${photoId}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(ref(storage, path), blob, {
      contentType: blob.type || 'image/jpeg',
    });

    const photo: Photo = {
      id: photoId,
      assignmentId: volunteerId,
      path,
    };

    await setDoc(
      doc(
        db,
        'activities',
        activityId,
        'assignments',
        volunteerId,
        'photos',
        photoId
      ),
      photo
    );
  }

  await updateDoc(assignmentRef, {
    volunteerComment: volunteerComment.trim(),
    reportSubmittedAt: new Date().toISOString(),
  });
}

function createPhotoId() {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
