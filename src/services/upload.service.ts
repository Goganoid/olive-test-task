import { MultipartCompletedUploadDto } from '../dto/multipart-completed-upload.dto.js';
import { CompletedPartDto, MultipartPreSignedUrlsDto } from '../dto/multipart-presigned-urls.dto.js';
import { MultipartUploadDto } from '../dto/multipart-upload.dto.js';
import { ApiError } from '../server/types.js';
import { logger } from '../utils/logger.js';
import { S3Service } from './s3.service.js';

export class UploadService {
  constructor(private readonly s3Service: S3Service) {}

  async initializeMultipartUpload(key: string): Promise<MultipartUploadDto> {
    const response = await this.s3Service.createMultipartUpload(key);

    if (!response.Key || !response.UploadId) {
      throw new ApiError('Failed to create multipart upload', 500);
    }

    return {
      key: response.Key,
      uploadId: response.UploadId,
    };
  }

  async getMultipartPreSignedUrls(
    fileKey: string,
    uploadId: string,
    parts: number,
  ): Promise<MultipartPreSignedUrlsDto> {
    const promises: Promise<string>[] = [];
    for (let index = 0; index < parts; index++) {
      promises.push(this.s3Service.getMultipartPreSignedUrl(fileKey, uploadId, index));
    }
    const signedUrls = await Promise.all(promises);
    return {
      parts: signedUrls.map((signedUrl, index) => ({
        signedUrl,
        partNumber: index + 1,
      })),
    };
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompletedPartDto[],
  ): Promise<MultipartCompletedUploadDto> {
    const { bucket, eTag, location } = await this.s3Service
      .completeMultipartUpload(key, uploadId, parts)
      .catch((error) => {
        logger.error('Error completing multipart upload:', error);
        throw new ApiError('Failed to complete multipart upload', 500);
      });

    if (!key || !location || !eTag) {
      throw new ApiError('Failed to complete multipart upload', 500);
    }

    return {
      key,
      location,
      bucket,
      eTag,
    };
  }

  async getPresignedPutUrl(key: string) {
    return await this.s3Service.getPresignedPutUrl(key);
  }
}
