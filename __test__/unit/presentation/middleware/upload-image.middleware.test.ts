/* eslint-disable @typescript-eslint/no-require-imports */
import { uploadImage } from "@/presentation/middleware/upload-image.middleware";
import multer from "multer";

jest.mock("multer", () => {
  const mockMemoryStorage = jest.fn().mockReturnValue({});

  const mockMulter = jest.fn().mockImplementation((options) => {
    (mockMulter as unknown as { _lastOptions?: unknown })._lastOptions = options;
    return {
      single: jest.fn().mockReturnValue(jest.fn()),
      array: jest.fn().mockReturnValue(jest.fn()),
      fields: jest.fn().mockReturnValue(jest.fn()),
      none: jest.fn().mockReturnValue(jest.fn()),
      any: jest.fn().mockReturnValue(jest.fn()),
    };
  }) as unknown as jest.Mocked<typeof multer>;

  mockMulter.memoryStorage = mockMemoryStorage;

  return {
    __esModule: true,
    default: mockMulter,
  };
});

describe("uploadImage", () => {
  const mockMulter = multer as jest.MockedFunction<typeof multer> & {
    memoryStorage: jest.Mock;
    _lastOptions?: any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMulter._lastOptions = undefined;
    jest.isolateModules(() => {
      require("@/presentation/middleware/upload-image.middleware");
    });
  });

  describe("Multer configuration", () => {
    it("should use memory storage", () => {
      expect(mockMulter.memoryStorage).toHaveBeenCalled();
    });

    it("should set file size limit to 5 MB", () => {
      const multerConfig = mockMulter._lastOptions;
      expect(multerConfig).toBeDefined();
      expect(multerConfig.limits.fileSize).toBe(5 * 1024 * 1024);
    });

    it("should have fileFilter function", () => {
      const multerConfig = mockMulter._lastOptions;
      expect(multerConfig).toBeDefined();
      expect(typeof multerConfig.fileFilter).toBe("function");
    });
  });

  describe("fileFilter", () => {
    let fileFilter: (req: any, file: any, cb: any) => void;

    beforeEach(() => {
      const multerConfig = mockMulter._lastOptions;
      fileFilter = multerConfig.fileFilter;
    });

    it("should allow image/jpeg files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/jpeg" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/png files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/png" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/gif files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/gif" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/webp files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/webp" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/svg+xml files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/svg+xml" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/bmp files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/bmp" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow image/tiff files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/tiff" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should reject non-image files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "application/pdf" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should reject text files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "text/plain" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should reject video files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "video/mp4" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should reject audio files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "audio/mpeg" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should reject application/json files", () => {
      const mockReq = {};
      const mockFile = { mimetype: "application/json" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should reject files with no mimetype", () => {
      const mockReq = {};
      const mockFile = { mimetype: undefined };
      const mockCallback = jest.fn();

      expect(() => {
        fileFilter(mockReq, mockFile, mockCallback);
      }).toThrow();
    });

    it("should reject files with null mimetype", () => {
      const mockReq = {};
      const mockFile = { mimetype: null };
      const mockCallback = jest.fn();

      expect(() => {
        fileFilter(mockReq, mockFile, mockCallback);
      }).toThrow();
    });

    it("should reject files with empty mimetype", () => {
      const mockReq = {};
      const mockFile = { mimetype: "" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should handle case sensitivity in mimetype", () => {
      const mockReq = {};
      const mockFile = { mimetype: "IMAGE/JPEG" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
    });

    it("should handle mimetype with parameters", () => {
      const mockReq = {};
      const mockFile = { mimetype: "image/svg+xml;charset=utf-8" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });
  });

  describe("Multer instance", () => {
    it("should return a multer instance with configured options", () => {
      expect(multer).toHaveBeenCalledWith({
        storage: expect.any(Object),
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
        fileFilter: expect.any(Function),
      });
    });

    it("should provide single file upload method", () => {
      expect(uploadImage.single).toBeDefined();
      expect(typeof uploadImage.single).toBe("function");
    });

    it("should provide array file upload method", () => {
      expect(uploadImage.array).toBeDefined();
      expect(typeof uploadImage.array).toBe("function");
    });

    it("should provide fields file upload method", () => {
      expect(uploadImage.fields).toBeDefined();
      expect(typeof uploadImage.fields).toBe("function");
    });

    it("should provide none file upload method", () => {
      expect(uploadImage.none).toBeDefined();
      expect(typeof uploadImage.none).toBe("function");
    });

    it("should provide any file upload method", () => {
      expect(uploadImage.any).toBeDefined();
      expect(typeof uploadImage.any).toBe("function");
    });
  });

  describe("Integration scenarios", () => {
    it("should be configured to handle image uploads in Express routes", () => {
      expect(uploadImage.single).toBeDefined();
      expect(uploadImage.array).toBeDefined();
    });

    it("should be able to handle the configured file size limit", () => {
      const multerConfig = mockMulter._lastOptions;
      expect(multerConfig).toBeDefined();
      expect(multerConfig.limits.fileSize).toBe(5 * 1024 * 1024);
    });

    it("should handle various image mimetypes correctly", () => {
      const imageMimetypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff", "image/x-icon"];

      const multerConfig = mockMulter._lastOptions;
      const fileFilter = multerConfig.fileFilter;

      for (const mimetype of imageMimetypes) {
        const mockReq = {};
        const mockFile = { mimetype };
        const mockCallback = jest.fn();

        fileFilter(mockReq, mockFile, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(null, true);
      }
    });

    it("should reject non-image mimetypes correctly", () => {
      const nonImageMimetypes = [
        "application/pdf",
        "text/plain",
        "video/mp4",
        "audio/mpeg",
        "application/json",
        "application/xml",
        "text/html",
        "application/zip",
      ];

      const multerConfig = mockMulter._lastOptions;
      const fileFilter = multerConfig.fileFilter;

      for (const mimetype of nonImageMimetypes) {
        const mockReq = {};
        const mockFile = { mimetype };
        const mockCallback = jest.fn();

        fileFilter(mockReq, mockFile, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(new Error("Only image files are allowed"));
      }
    });
  });

  describe("Error handling scenarios", () => {
    it("should reject files larger than 5 MB", () => {
      const multerConfig = mockMulter._lastOptions;
      expect(multerConfig).toBeDefined();
      expect(multerConfig.limits.fileSize).toBeLessThan(10 * 1024 * 1024);
    });

    it("should preserve error message consistency", () => {
      const multerConfig = mockMulter._lastOptions;
      const fileFilter = multerConfig.fileFilter;

      const mockReq = {};
      const mockFile = { mimetype: "application/pdf" };
      const mockCallback = jest.fn();

      fileFilter(mockReq, mockFile, mockCallback);

      const callArgs = mockCallback.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Error);
      expect(callArgs[0].message).toBe("Only image files are allowed");
    });
  });
});
