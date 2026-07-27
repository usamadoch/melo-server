import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const config: S3ClientConfig = {
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
};

if (env.S3_ENDPOINT) {
  config.endpoint = env.S3_ENDPOINT;
  config.forcePathStyle = true;
}

export const s3Client = new S3Client(config);
