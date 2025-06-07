
// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadStreamToCloudinary(
  fileBuffer: Buffer,
  folderPath: string, 
  fileName: string, 
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
): Promise<string> {
  console.log(`[CloudinaryUpload] Initiating upload for: ${folderPath}/${fileName}, resourceType: ${resourceType}, bufferLength: ${fileBuffer.length}`);

  if (fileBuffer.length === 0) {
    console.error('[CloudinaryUpload] Error: File buffer is empty. Aborting upload.');
    return Promise.reject(new Error('File buffer is empty. Cannot upload.'));
  }

  return new Promise((resolve, reject) => {
    let uploadOptions: cloudinary.UploadApiOptions;

    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
    const extension = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';

    if (resourceType === 'raw') {
      uploadOptions = {
        resource_type: 'raw',
        overwrite: true,
        invalidate: true, // Added invalidate
        public_id: `${folderPath}/${fileName}`, // fileName includes extension for raw files
      };
    } else {
      uploadOptions = {
        resource_type: resourceType,
        folder: folderPath,
        overwrite: true,
        invalidate: true, // Added invalidate
        public_id: baseName, // baseName does NOT include extension for image/video/auto
      };
      if (extension) {
        uploadOptions.format = extension; 
      }
    }
    
    console.log('[CloudinaryUpload] Upload options being used:', JSON.stringify(uploadOptions, null, 2));

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('[CloudinaryUpload] Upload Error from Cloudinary:', JSON.stringify(error, null, 2));
          reject(error);
        } else if (result) {
          console.log('[CloudinaryUpload] Upload Success. Result from Cloudinary:');
          console.log(`  - Public ID: ${result.public_id}`);
          console.log(`  - Resource Type: ${result.resource_type}`);
          console.log(`  - Format: ${result.format}`);
          console.log(`  - Bytes: ${result.bytes}`);
          console.log(`  - Secure URL: ${result.secure_url}`);
          
          if (resourceType === 'raw' && result.resource_type !== 'raw') {
            console.warn(`[CloudinaryUpload] Warning: Expected 'raw' resource_type, but Cloudinary reports '${result.resource_type}'. URL: ${result.secure_url}`);
          }
          resolve(result.secure_url);
        } else {
          console.error('[CloudinaryUpload] Upload failed without specific error object from Cloudinary.');
          reject(new Error('Cloudinary upload failed without error object'));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

