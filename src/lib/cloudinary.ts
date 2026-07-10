import { getMasterData } from './db';

/**
 * Uploads a file, Blob, or Base64 Data URI to Cloudinary using the configuration saved in Firestore.
 * If Cloudinary is disabled, returns null.
 * If Cloudinary is enabled but upload fails, throws an error.
 */
export async function uploadToCloudinary(file: string | File | Blob): Promise<string | null> {
  try {
    const configs = await getMasterData();
    
    // Check if Cloudinary is enabled (defaults to true if not explicitly set to false)
    if (configs.cloudinaryEnabled === false) {
      console.log('Cloudinary integration is disabled in settings. Storing in Firestore.');
      return null;
    }

    const metaEnv = (import.meta as any).env || {};
    const cloudName = configs.cloudinaryCloudName?.trim() || metaEnv.VITE_CLOUDINARY_CLOUD_NAME || 'fyouajy1';
    const uploadPreset = configs.cloudinaryUploadPreset?.trim() || metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary is enabled but cloudName or uploadPreset is missing. Falling back to Firestore Base64.');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Add folder/tags to organize files in Cloudinary
    formData.append('folder', 'pasaya_curtains');
    formData.append('tags', 'curtain,pasaya');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Failed to upload to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
    throw err;
  }
}
