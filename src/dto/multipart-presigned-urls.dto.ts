export interface PresignedPartDto {
  signedUrl: string;
  partNumber: number;
}

export interface MultipartPreSignedUrlsDto {
  parts: PresignedPartDto[];
}

export interface CompletedPartDto {
  partNumber: number;
  eTag: string;
}
