export interface UploadFilePayload {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface ObjectStoragePort {
  upload(file: UploadFilePayload): Promise<string>;
  delete(url: string): Promise<void>;
}
