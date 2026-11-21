/**
 * Private S3 access for identity documents.
 *
 * Deliberately separate from services/storage.service.js, whose uploads use
 * ACL 'public-read'. These objects are uploaded with NO ACL and are only ever
 * read through short-lived presigned URLs handed to an admin.
 *
 * Use a dedicated bucket via S3_PRIVATE_BUCKET_NAME. If it is unset the main bucket is
 * used, which is only safe if that bucket does not make the `identity-documents/`
 * prefix publicly readable.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_CONFIG } from '../../config/aws.js';

const client = new S3Client({
  region: AWS_CONFIG.region,
  endpoint: AWS_CONFIG.endpoint || undefined,
  forcePathStyle: AWS_CONFIG.forcePathStyle || false,
  credentials: AWS_CONFIG.accessKeyId && AWS_CONFIG.secretAccessKey
    ? { accessKeyId: AWS_CONFIG.accessKeyId, secretAccessKey: AWS_CONFIG.secretAccessKey }
    : undefined,
});

function bucket() {
  const name = process.env.S3_PRIVATE_BUCKET_NAME || AWS_CONFIG.bucketName;
  if (!name) throw new Error('S3_PRIVATE_BUCKET_NAME (or S3_BUCKET_NAME) is not configured');
  return name;
}

async function putPrivate(key, body, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  }));
}

async function getReadUrl(key, expiresInSeconds = 300) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: expiresInSeconds });
}

async function deletePrivate(key) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export default { putPrivate, getReadUrl, deletePrivate };
