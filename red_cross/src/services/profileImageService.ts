import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from '@/config/cloudinary';

export async function uploadProfileImage(uri: string, userId: string) {
  const formData = new FormData();
  const fileName = extractFileName(uri);
  const mimeType = inferMimeType(fileName);

  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('asset_folder', 'profile-images');

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error('Otpremanje profilne slike nije uspelo.');
  }

  const payload = (await uploadResponse.json()) as {
    public_id?: string;
    secure_url?: string;
  };

  if (!payload.public_id || !payload.secure_url) {
    throw new Error('Odgovor servisa za slike nije potpun.');
  }

  return {
    publicId: payload.public_id,
    originalUrl: payload.secure_url,
    optimizedUrl: buildOptimizedProfileImageUrl(payload.public_id),
  };
}

function buildOptimizedProfileImageUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_600,h_600,q_auto,f_auto/${publicId}`;
}

function extractFileName(uri: string) {
  const segments = uri.split('/');
  const candidate = segments[segments.length - 1];

  return candidate && candidate.includes('.') ? candidate : 'profile-image.jpg';
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
