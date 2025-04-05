import {
  CompleteMultipartUploadCommand,
  CompleteMultipartUploadCommandInput,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CompletedPartDto } from '../dto/multipart-presigned-urls.dto.js';
import { ApiError } from '../server/types.js';

export class S3Service {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET_NAME must be set');
    }

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    this.bucketName = bucketName;
  }

  async createMultipartUpload(key: string) {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await this.s3.send(command);
  }

  async getMultipartPreSignedUrl(fileKey: string, uploadId: string, index: number): Promise<string> {
    const multipartParams = {
      Bucket: this.bucketName,
      Key: fileKey,
      UploadId: uploadId,
      PartNumber: index + 1,
    };
    const command = new UploadPartCommand(multipartParams);

    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return url;
  }

  async completeMultipartUpload(fileKey: string, fileId: string, parts: CompletedPartDto[]) {
    const multipartParams: CompleteMultipartUploadCommandInput = {
      Bucket: this.bucketName,
      Key: fileKey,
      UploadId: fileId,
      MultipartUpload: {
        Parts: parts
          .map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.eTag,
          }))
          .sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0)),
      },
    };
    const command = new CompleteMultipartUploadCommand(multipartParams);

    const response = await this.s3.send(command);
    return {
      key: response.Key,
      location: response.Location,
      bucket: response.Bucket,
      eTag: response.ETag,
    };
  }

  async getPresignedPutUrl(key: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async getKeyUrl(key: string) {
    const exists = await this.keyExists(key);
    if (!exists) {
      throw new ApiError('Media not found', 404);
    }
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async deleteKey(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3.send(command);
  }

  async headObject(key: string) {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await this.s3.send(command);
  }

  async keyExists(key: string) {
    try {
      const data = await this.headObject(key);
      return data.$metadata.httpStatusCode === 200;
    } catch (error: any) {
      const statusCode = error.$metadata?.httpStatusCode;
      if (statusCode === 404 || statusCode === 403) {
        return false;
      } else {
        throw error;
      }
    }
  }
}
