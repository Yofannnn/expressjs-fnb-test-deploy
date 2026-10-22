import { del, put } from "@vercel/blob";
import { VercelBlobObjectStorageAdapter } from "@/infrastructure/object-storage/vercel-blob-object-storage.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { UploadFilePayload } from "@/application/ports/driven/object-storage";
import { SERVER_EXCEPTIONS } from "@/application/exceptions/server.exception";
import { VercelBlobConfig } from "@/infrastructure/config/vercel-blob.config";

jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

describe("VercelBlobObjectStorageAdapter", () => {
  let adapter: VercelBlobObjectStorageAdapter;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: jest.Mocked<VercelBlobConfig>;

  const mockFile: UploadFilePayload = {
    fileBuffer: Buffer.from("image-data"),
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    fileSize: 2048,
  };

  const mockUrl = "https://storage.vercel.app/products/photo-abc123.jpg";

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockConfig = {
      readWriteToken: "injected-config-token",
      cacheControlMaxAgeInSeconds: 31536000,
    };

    adapter = new VercelBlobObjectStorageAdapter(mockConfig, mockLogger);
  });

  describe("upload", () => {
    it("should upload the file and return the blob url", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const result = await adapter.upload(mockFile);

      expect(result).toBe(mockUrl);
      expect(put).toHaveBeenCalledTimes(1);
    });

    it("should map configuration values correctly to the Vercel SDK", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      await adapter.upload(mockFile);

      expect(put).toHaveBeenCalledWith(
        mockFile.fileName,
        mockFile.fileBuffer,
        expect.objectContaining({
          contentType: mockFile.mimeType,
          access: "public",
          token: mockConfig.readWriteToken,
          cacheControlMaxAge: mockConfig.cacheControlMaxAgeInSeconds,
          addRandomSuffix: true,
        }),
      );
    });

    it("should dynamically handle different file names and mime types", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const pdfFile: UploadFilePayload = {
        fileBuffer: Buffer.from("pdf-data"),
        fileName: "document.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
      };

      await adapter.upload(pdfFile);

      expect(put).toHaveBeenCalledWith(
        pdfFile.fileName,
        pdfFile.fileBuffer,
        expect.objectContaining({
          contentType: "application/pdf",
        }),
      );
    });

    it("should handle file name with special characters", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const specialFile: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: "café_photo!@#.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      await adapter.upload(specialFile);

      expect(put).toHaveBeenCalledWith("café_photo!@#.jpg", specialFile.fileBuffer, expect.any(Object));
    });

    it("should handle file name with spaces", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const fileWithSpaces: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: "my photo file.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      await adapter.upload(fileWithSpaces);

      expect(put).toHaveBeenCalledWith("my photo file.jpg", fileWithSpaces.fileBuffer, expect.any(Object));
    });

    it("should handle large file sizes", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const largeFile: UploadFilePayload = {
        fileBuffer: Buffer.alloc(10 * 1024 * 1024),
        fileName: "large-file.jpg",
        mimeType: "image/jpeg",
        fileSize: 10 * 1024 * 1024,
      };

      await adapter.upload(largeFile);

      expect(put).toHaveBeenCalledWith(largeFile.fileName, largeFile.fileBuffer, expect.any(Object));
    });

    it("should handle empty file buffer", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const emptyFile: UploadFilePayload = {
        fileBuffer: Buffer.alloc(0),
        fileName: "empty-file.jpg",
        mimeType: "image/jpeg",
        fileSize: 0,
      };

      await adapter.upload(emptyFile);

      expect(put).toHaveBeenCalledWith(emptyFile.fileName, emptyFile.fileBuffer, expect.any(Object));
    });

    it("should log and throw a generic internal server error when the SDK rejects with an Error", async () => {
      const sdkError = new Error("Vercel Blob is down");
      (put as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "VercelBlobObjectStorageAdapter",
        event: "UPLOAD_FAILED",
        message: "Error uploading file to Vercel Blob",
        stack: sdkError.stack,
        data: { fileName: mockFile.fileName, errorMessage: "Vercel Blob is down" },
      });
    });

    it("should not leak the raw SDK error to the caller", async () => {
      const sdkError = new Error("Vercel Blob is down");
      (put as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.upload(mockFile)).rejects.not.toBe(sdkError);
    });

    it("should handle non-Error rejections from the SDK without throwing while logging", async () => {
      (put as jest.Mock).mockRejectedValue("plain string failure");

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UPLOAD_FAILED",
          stack: undefined,
          data: { fileName: mockFile.fileName, errorMessage: "plain string failure" },
        }),
      );
    });

    it("should handle non-Error object rejections from the SDK", async () => {
      (put as jest.Mock).mockRejectedValue({ code: "STORAGE_ERROR", message: "Storage full" });

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UPLOAD_FAILED",
          data: { fileName: mockFile.fileName, errorMessage: "[object Object]" },
        }),
      );
    });

    it("should handle null rejection from the SDK", async () => {
      (put as jest.Mock).mockRejectedValue(null);

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UPLOAD_FAILED",
          data: { fileName: mockFile.fileName, errorMessage: "null" },
        }),
      );
    });

    it("should handle undefined rejection from the SDK", async () => {
      (put as jest.Mock).mockRejectedValue(undefined);

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UPLOAD_FAILED",
          data: { fileName: mockFile.fileName, errorMessage: "undefined" },
        }),
      );
    });
  });

  describe("delete", () => {
    it("should delete the file by url using the configured token from VercelBlobConfig", async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      await adapter.delete(mockUrl);

      expect(del).toHaveBeenCalledWith(mockUrl, { token: mockConfig.readWriteToken });
    });

    it("should handle deleting a file with special characters in URL", async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      const specialUrl = "https://storage.vercel.app/products/café_photo!@#.jpg";
      await adapter.delete(specialUrl);

      expect(del).toHaveBeenCalledWith(specialUrl, { token: mockConfig.readWriteToken });
    });

    it("should log and throw a generic internal server error when the SDK rejects with an Error", async () => {
      const sdkError = new Error("Blob not found");
      (del as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.delete(mockUrl)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "VercelBlobObjectStorageAdapter",
        event: "DELETE_FAILED",
        message: "Error deleting file from Vercel Blob",
        stack: sdkError.stack,
        data: { url: mockUrl, errorMessage: "Blob not found" },
      });
    });

    it("should not leak the raw SDK error to the caller on delete", async () => {
      const sdkError = new Error("Blob not found");
      (del as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.delete(mockUrl)).rejects.not.toBe(sdkError);
    });

    it("should handle non-Error rejections from the SDK without throwing while logging", async () => {
      (del as jest.Mock).mockRejectedValue({ code: "UNKNOWN" });

      await expect(adapter.delete(mockUrl)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DELETE_FAILED",
          stack: undefined,
          data: { url: mockUrl, errorMessage: "[object Object]" },
        }),
      );
    });

    it("should handle string rejection from the SDK", async () => {
      (del as jest.Mock).mockRejectedValue("File not found");

      await expect(adapter.delete(mockUrl)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DELETE_FAILED",
          data: { url: mockUrl, errorMessage: "File not found" },
        }),
      );
    });

    it("should handle null rejection from the SDK on delete", async () => {
      (del as jest.Mock).mockRejectedValue(null);

      await expect(adapter.delete(mockUrl)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DELETE_FAILED",
          data: { url: mockUrl, errorMessage: "null" },
        }),
      );
    });

    it("should handle undefined rejection from the SDK on delete", async () => {
      (del as jest.Mock).mockRejectedValue(undefined);

      await expect(adapter.delete(mockUrl)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DELETE_FAILED",
          data: { url: mockUrl, errorMessage: "undefined" },
        }),
      );
    });
  });

  describe("handleStorageError (private method)", () => {
    it("should log error with correct context and throw INTERNAL_SERVER_ERROR", async () => {
      const sdkError = new Error("Storage error");
      (put as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "VercelBlobObjectStorageAdapter",
        event: "UPLOAD_FAILED",
        message: "Error uploading file to Vercel Blob",
        stack: sdkError.stack,
        data: { fileName: mockFile.fileName, errorMessage: "Storage error" },
      });
    });

    it("should log error with stack trace when available", async () => {
      const sdkError = new Error("Storage error");
      sdkError.stack = "Custom stack trace";
      (put as jest.Mock).mockRejectedValue(sdkError);

      await expect(adapter.upload(mockFile)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Custom stack trace",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle file with very long name", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const longFileName = "a".repeat(255) + ".jpg";
      const fileWithLongName: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: longFileName,
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      await adapter.upload(fileWithLongName);

      expect(put).toHaveBeenCalledWith(longFileName, fileWithLongName.fileBuffer, expect.any(Object));
    });

    it("should handle file with Unicode characters in name", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const unicodeFile: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: "测试文件.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      await adapter.upload(unicodeFile);

      expect(put).toHaveBeenCalledWith("测试文件.jpg", unicodeFile.fileBuffer, expect.any(Object));
    });

    it("should handle file with no extension", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const noExtensionFile: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: "myfile",
        mimeType: "application/octet-stream",
        fileSize: 1024,
      };

      await adapter.upload(noExtensionFile);

      expect(put).toHaveBeenCalledWith("myfile", noExtensionFile.fileBuffer, expect.any(Object));
    });

    it("should handle file with multiple dots in name", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const multipleDotsFile: UploadFilePayload = {
        fileBuffer: Buffer.from("data"),
        fileName: "my.file.name.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      await adapter.upload(multipleDotsFile);

      expect(put).toHaveBeenCalledWith("my.file.name.jpg", multipleDotsFile.fileBuffer, expect.any(Object));
    });

    it("should handle delete with URL containing query parameters", async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      const urlWithParams = "https://storage.vercel.app/image.jpg?width=100";
      await adapter.delete(urlWithParams);

      expect(del).toHaveBeenCalledWith(urlWithParams, { token: mockConfig.readWriteToken });
    });

    it("should handle delete with URL containing special characters", async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      const specialUrl = "https://storage.vercel.app/products/image%20with%20spaces.jpg";
      await adapter.delete(specialUrl);

      expect(del).toHaveBeenCalledWith(specialUrl, { token: mockConfig.readWriteToken });
    });

    it("should handle cacheControlMaxAge from config correctly", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      mockConfig.cacheControlMaxAgeInSeconds = 86400;

      await adapter.upload(mockFile);

      expect(put).toHaveBeenCalledWith(
        mockFile.fileName,
        mockFile.fileBuffer,
        expect.objectContaining({
          cacheControlMaxAge: 86400,
        }),
      );
    });

    it("should handle zero cacheControlMaxAge", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      mockConfig.cacheControlMaxAgeInSeconds = 0;

      await adapter.upload(mockFile);

      expect(put).toHaveBeenCalledWith(
        mockFile.fileName,
        mockFile.fileBuffer,
        expect.objectContaining({
          cacheControlMaxAge: 0,
        }),
      );
    });

    it("should handle missing readWriteToken", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      mockConfig.readWriteToken = undefined as unknown as string;

      await adapter.upload(mockFile);

      expect(put).toHaveBeenCalledWith(
        mockFile.fileName,
        mockFile.fileBuffer,
        expect.objectContaining({
          token: undefined,
        }),
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle upload and delete in sequence", async () => {
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });
      (del as jest.Mock).mockResolvedValue(undefined);

      const uploadedUrl = await adapter.upload(mockFile);
      expect(uploadedUrl).toBe(mockUrl);

      await adapter.delete(uploadedUrl);

      expect(put).toHaveBeenCalledTimes(1);
      expect(del).toHaveBeenCalledWith(uploadedUrl, { token: mockConfig.readWriteToken });
    });

    it("should handle multiple uploads with different files", async () => {
      (put as jest.Mock)
        .mockResolvedValueOnce({ url: "https://storage.vercel.app/file1.jpg" })
        .mockResolvedValueOnce({ url: "https://storage.vercel.app/file2.jpg" });

      const file1: UploadFilePayload = {
        fileBuffer: Buffer.from("data1"),
        fileName: "file1.jpg",
        mimeType: "image/jpeg",
        fileSize: 100,
      };

      const file2: UploadFilePayload = {
        fileBuffer: Buffer.from("data2"),
        fileName: "file2.png",
        mimeType: "image/png",
        fileSize: 200,
      };

      const url1 = await adapter.upload(file1);
      const url2 = await adapter.upload(file2);

      expect(url1).toBe("https://storage.vercel.app/file1.jpg");
      expect(url2).toBe("https://storage.vercel.app/file2.jpg");
      expect(put).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple deletes in sequence", async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      const urls = ["https://storage.vercel.app/file1.jpg", "https://storage.vercel.app/file2.jpg", "https://storage.vercel.app/file3.jpg"];

      for (const url of urls) {
        await adapter.delete(url);
      }

      expect(del).toHaveBeenCalledTimes(3);
      expect(del).toHaveBeenCalledWith(urls[0], { token: mockConfig.readWriteToken });
      expect(del).toHaveBeenCalledWith(urls[1], { token: mockConfig.readWriteToken });
      expect(del).toHaveBeenCalledWith(urls[2], { token: mockConfig.readWriteToken });
    });
  });
});
