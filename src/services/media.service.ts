import { ApiError } from '../server/types.js';
import { S3Service } from './s3.service.js';
import { AppDataSource } from '../database/config.js';
import { MediaMetadata } from '../entities/MediaMetadata.js';
import { v4 } from 'uuid';
import { FileDto } from '../dto/file.dto.js';
import { InitializedFileDto } from '../dto/initialized-file.dto.js';

export class MediaService {
  private readonly mediaRepository = AppDataSource.getRepository(MediaMetadata);

  constructor(private readonly s3Service: S3Service) {}

  async initFile(type: string): Promise<InitializedFileDto> {
    const key = `media/${v4()}.${type}`;
    const { id } = await this.mediaRepository.save({ key, type, created: false });
    return { id, key };
  }

  async finalizeFile(id: string) {
    const existingRecord = await this.mediaRepository.findOne({ where: { id } });
    if (!existingRecord) {
      throw new ApiError('File not initialized', 404);
    }
    const existsInS3 = await this.s3Service.keyExists(existingRecord.key);
    if (!existsInS3) {
      throw new ApiError('File does not exist in S3', 404);
    }

    const metadata = await this.s3Service.headObject(existingRecord.key);

    if (metadata.ContentLength === 0) {
      throw new ApiError('File is empty', 400);
    }

    await this.mediaRepository.update(existingRecord.id, {
      size: metadata.ContentLength,
      created: true,
    });
  }

  async readFile(id: string): Promise<FileDto> {
    const record = await this.mediaRepository.findOne({ where: { id } });
    if (!record) {
      throw new ApiError('File not found in database', 404);
    }

    const existsInS3 = await this.s3Service.keyExists(record.key);
    if (!existsInS3) {
      throw new ApiError('File not found in S3', 404);
    }

    return {
      url: record.created ? await this.s3Service.getKeyUrl(record.key) : null,
      key: record.key,
      type: record.type,
      size: record.size,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async deleteFile(id: string) {
    const record = await this.mediaRepository.findOne({ where: { id } });
    if (!record) {
      throw new ApiError('File not found in database', 404);
    }

    await this.mediaRepository.remove(record);

    const existsInS3 = await this.s3Service.keyExists(record.key);
    if (existsInS3) {
      await this.s3Service.deleteKey(record.key);
    }
  }

  async verifyFile(key: string) {
    const record = await this.mediaRepository.findOne({ where: { key } });
    if (!record) {
      throw new ApiError('File not found in database', 404);
    }
  }
}
