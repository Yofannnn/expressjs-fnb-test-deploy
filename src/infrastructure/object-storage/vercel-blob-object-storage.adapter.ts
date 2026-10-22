import { del, put } from "@vercel/blob";
import { ObjectStoragePort, UploadFilePayload } from "@/application/ports/driven/object-storage.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { VercelBlobConfig } from "../configs/vercel-blob.config";
import { ExternalServiceUnavailableException } from "../exceptions/infrastructure.exceptions";

export class VercelBlobObjectStorageAdapter implements ObjectStoragePort {
  constructor(
    private readonly config: VercelBlobConfig,
    private readonly logger: LoggerPort,
  ) {}

  async upload(file: UploadFilePayload): Promise<string> {
    try {
      const blob = await put(file.fileName, file.fileBuffer, {
        contentType: file.mimeType,
        access: "public",
        addRandomSuffix: true,
        cacheControlMaxAge: this.config.cacheControlMaxAgeInSeconds,
        token: this.config.readWriteToken,
      });

      return blob.url;
    } catch (error) {
      this.handleStorageError("UPLOAD_FAILED", "Error uploading file to Vercel Blob", { fileName: file.fileName }, error);
    }
  }

  async delete(url: string): Promise<void> {
    try {
      await del(url, {
        token: this.config.readWriteToken,
      });
    } catch (error) {
      this.handleStorageError("DELETE_FAILED", "Error deleting file from Vercel Blob", { url }, error);
    }
  }

  private handleStorageError(event: string, message: string, data: Record<string, unknown>, error: unknown): never {
    this.logger.error({
      context: "VercelBlobObjectStorageAdapter",
      event,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      data: { ...data, errorMessage: error instanceof Error ? error.message : String(error) },
    });
    throw new ExternalServiceUnavailableException("Object Storage");
  }
}
