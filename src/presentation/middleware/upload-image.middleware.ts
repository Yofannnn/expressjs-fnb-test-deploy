import multer from "multer";
import { RequestHandler } from "express";
import { RequestValidationException } from "../exceptions/request-validation.exception";

const multerUpload = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(
        new RequestValidationException({
          issues: [
            {
              code: "invalid_file_type",
              message: "Invalid file type",
              field: "image",
            },
          ],
          totalIssues: 1,
        }),
      );
    }

    cb(null, true);
  },
});

const multerErrorMessages: Record<string, string> = {
  LIMIT_FILE_SIZE: "File exceeds the maximum allowed size",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field",
};

const handleMulterError = (error: unknown): unknown => {
  if (error instanceof multer.MulterError) {
    return new RequestValidationException({
      issues: [
        {
          code: error.code.toLowerCase(),
          message: multerErrorMessages[error.code] ?? error.message,
          field: error.field ?? "file",
        },
      ],
      totalIssues: 1,
    });
  }

  return error;
};

const wrapMulter = (middleware: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (error) {
        return next(handleMulterError(error));
      }

      next();
    });
  };
};

export const uploadImage = {
  single: (fieldName: string) => wrapMulter(multerUpload.single(fieldName)),
  array: (fieldName: string, maxCount?: number) => wrapMulter(multerUpload.array(fieldName, maxCount)),
  fields: (fields: multer.Field[]) => wrapMulter(multerUpload.fields(fields)),
};
