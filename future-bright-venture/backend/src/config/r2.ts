import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'future-bright';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export const uploadToR2 = async (
  key: string, 
  buffer: Buffer, 
  contentType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  
  // Return public URL
  return `${PUBLIC_URL}/${key}`;
};

export const getSignedDownloadUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  // Extract key from full URL if provided
  const cleanKey = key.replace(`${PUBLIC_URL}/`, '');
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanKey,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
};

export const deleteFromR2 = async (key: string): Promise<void> => {
  // Extract key from full URL if provided
  const cleanKey = key.replace(`${PUBLIC_URL}/`, '');
  
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanKey,
  });

  await r2Client.send(command);
};

export { r2Client, BUCKET_NAME };
