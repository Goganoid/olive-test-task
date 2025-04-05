import { z } from 'zod';
import { Route } from '../server/index.js';
import { MediaService } from '../services/media.service.js';
import { S3Service } from '../services/s3.service.js';
import { UploadService } from '../services/upload.service.js';

const mediaTypeSchema = z.enum(['jpg', 'png', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm']);

export const getMediaRoutes = (): Route<any, any>[] => {
  const s3Service = new S3Service();
  const uploadService = new UploadService(s3Service);
  const mediaService = new MediaService(s3Service);

  return [
    new Route(
      '/api/media/new',
      'POST',
      async (req) => {
        const { type } = req.body;
        const result = await mediaService.initFile(type);

        return {
          statusCode: 200,
          body: result,
        };
      },
      {
        body: z.object({
          type: mediaTypeSchema,
        }),
      },
    ),
    new Route(
      '/api/media/:id/finalize',
      'POST',
      async (req) => {
        const { id } = req.params;
        await mediaService.finalizeFile(id);

        return {
          statusCode: 200,
          body: {
            id,
          },
        };
      },
      {
        params: z.object({
          id: z.string().nonempty('id is required'),
        }),
      },
    ),
    new Route(
      'api/media/:id',
      'GET',
      async (req) => {
        const { id } = req.params;
        const file = await mediaService.readFile(id);
        return {
          statusCode: 200,
          body: {
            url: file,
          },
        };
      },
      {
        params: z.object({
          id: z.string().nonempty('id is required'),
        }),
      },
    ),
    new Route(
      'api/media/:id',
      'DELETE',
      async (req) => {
        const { id } = req.params;
        await mediaService.deleteFile(id);

        return {
          statusCode: 200,
          body: {
            message: 'File deleted',
          },
        };
      },
      {
        params: z.object({
          id: z.string().nonempty('id is required'),
        }),
      },
    ),
    new Route(
      'api/upload/single',
      'PUT',
      async (req) => {
        const { key } = req.body;
        await mediaService.verifyFile(key);
        const url = await uploadService.getPresignedPutUrl(key);

        return {
          statusCode: 200,
          body: {
            url,
          },
        };
      },
      {
        body: z.object({
          key: z.string().nonempty('key is required'),
        }),
      },
    ),
    new Route(
      'api/upload/multipart/new',
      'POST',
      async (req) => {
        const { key } = req.body;
        await mediaService.verifyFile(key);
        const dto = await uploadService.initializeMultipartUpload(key);

        return {
          statusCode: 200,
          body: dto,
        };
      },
      {
        params: z.any(),
        body: z.any(),
      },
    ),
    new Route(
      'api/upload/multipart/parts',
      'PUT',
      async (req) => {
        const { uploadId, parts, key } = req.body;
        await mediaService.verifyFile(key);
        const dto = await uploadService.getMultipartPreSignedUrls(key, uploadId, parts);

        return {
          statusCode: 200,
          body: dto,
        };
      },
      {
        body: z.object({
          uploadId: z.string().nonempty('uploadId is required'),
          parts: z.number().min(1, 'parts must be at least 1'),
          key: z.string().nonempty('key is required'),
        }),
      },
    ),
    new Route(
      'api/upload/multipart/complete',
      'POST',
      async (req) => {
        const { key } = req.body;
        const { uploadId, parts } = req.body;
        await mediaService.verifyFile(key);
        const dto = await uploadService.completeMultipartUpload(key, uploadId, parts);

        return {
          statusCode: 200,
          body: dto,
        };
      },
      {
        body: z.object({
          key: z.string().nonempty('key is required'),
          uploadId: z.string().nonempty('uploadId is required'),
          parts: z.array(
            z.object({
              partNumber: z.number().min(1, 'partNumber must be at least 1'),
              eTag: z.string().nonempty('eTag is required'),
            }),
          ),
        }),
      },
    ),
  ];
};
