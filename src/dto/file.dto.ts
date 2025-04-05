export interface FileDto {
  url: string | null;
  key: string;
  type: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}
