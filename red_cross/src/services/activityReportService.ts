import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from '@/config/cloudinary';
import { db } from '@/firebase/firestore';
import { Assignment } from '@/models/Assignment';
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

export async function saveActivityReport({
  activityId,
  volunteerId,
  volunteerComment,
  newPhotoUris,
}: {
  activityId: string;
  volunteerId: string;
  volunteerComment: string;
  newPhotoUris: string[];
}): Promise<void> {
  const assignmentRef = doc(
    db,
    'activities',
    activityId,
    'assignments',
    volunteerId
  );
  const assignmentSnapshot = await getDoc(assignmentRef);

  if (!assignmentSnapshot.exists()) {
    throw new Error('Assignment does not exist.');
  }

  const assignment = assignmentSnapshot.data() as Assignment;

  if (assignment.reportSubmittedAt) {
    throw new Error('Report has already been submitted.');
  }

  const uploadedPhotos = await Promise.all(
    newPhotoUris.map(uri => uploadPhotoToCloudinary(uri, volunteerId))
  );

  for (const uploadedPhoto of uploadedPhotos) {
    const photoId = createPhotoId();
    const photo: Photo = {
      id: photoId,
      assignmentId: volunteerId,
      publicId: uploadedPhoto.publicId,
      url: uploadedPhoto.url,
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

async function uploadPhotoToCloudinary(uri: string, volunteerId: string) {
  const formData = new FormData();
  const fileName = extractFileName(uri);
  const mimeType = inferMimeType(fileName);

  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `activity-reports/${volunteerId}`);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error('Cloudinary upload failed.');
  }

  const payload = (await uploadResponse.json()) as {
    public_id?: string;
    secure_url?: string;
  };

  if (!payload.public_id || !payload.secure_url) {
    throw new Error('Cloudinary upload response is incomplete.');
  }

  return {
    publicId: payload.public_id,
    url: payload.secure_url,
  };
}

function extractFileName(uri: string) {
  const segments = uri.split('/');
  const candidate = segments[segments.length - 1];

  return candidate && candidate.includes('.') ? candidate : 'report-photo.jpg';
}

function inferMimeType(fileName: string) {
  const lowerCaseName = fileName.toLowerCase();

  if (lowerCaseName.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerCaseName.endsWith('.jpg') || lowerCaseName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return 'image/jpeg';
}

function createPhotoId() {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
