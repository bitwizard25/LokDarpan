/**
 * AWS S3 Configuration
 */

import { config } from 'dotenv';

config();

export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.S3_BUCKET_NAME,
  accessPointAlias: process.env.S3_ACCESS_POINT_ALIAS,
  networkOrigin: process.env.S3_NETWORK_ORIGIN,
  bucketOwnerAccountId: process.env.S3_BUCKET_OWNER_ACCOUNT_ID,
  endpoint: process.env.S3_ENDPOINT, // Optional custom S3-compatible endpoint (Cloudflare R2, MinIO, Azure Blob S3 proxy)
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  disableAcl: process.env.S3_DISABLE_ACL === 'true' || Boolean(process.env.S3_ENDPOINT), // Cloudflare R2 rejects canned ACLs
  publicUrl: process.env.STORAGE_PUBLIC_URL || process.env.S3_PUBLIC_URL, // Optional public CDN base URL (e.g. Cloudflare R2 pub url or custom domain)
};

// Validate required AWS configuration
if (!AWS_CONFIG.accessKeyId || !AWS_CONFIG.secretAccessKey || !AWS_CONFIG.bucketName) {
  console.warn('⚠️  AWS credentials not fully configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in .env');
}

export default AWS_CONFIG;

