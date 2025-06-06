
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
  folder: string,
  fileName: string, // This is the safeFileName (e.g., "report.pdf" or "image.png")
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOptions: cloudinary.UploadApiOptions = {
      folder: folder,
      overwrite: true,
      resource_type: resourceType,
    };

    if (resourceType === 'raw') {
      // For 'raw' files, the public_id should include the file extension.
      // We don't set the 'format' parameter explicitly here, letting Cloudinary use the extension in public_id.
      uploadOptions.public_id = fileName; // e.g., "report.pdf"
      // 'format' is intentionally not set for raw files when extension is in public_id
    } else {
      // For 'image', 'video', 'auto', it's common to separate public_id (base name) and format (extension).
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        uploadOptions.public_id = fileName.substring(0, dotIndex); // e.g., "image_name"
        uploadOptions.format = fileName.substring(dotIndex + 1);    // e.g., "png"
      } else {
        // If no extension, use the full fileName as public_id; Cloudinary might auto-detect format for 'auto' type.
        uploadOptions.public_id = fileName;
      }
    }

    const finalPublicIdForLog = uploadOptions.public_id;
    const finalFormatForLog = uploadOptions.format;

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          console.error('Upload Options used:', { folder, public_id: finalPublicIdForLog, resource_type: resourceType, format: finalFormatForLog });
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed without error object'));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}
