import { z } from "zod";

const MAX_IMAGE_SIZE = 1024 * 1024;

export const UploadImageSchema = z.object({
  fileBuffer: z.instanceof(Buffer),
  fileName: z.string().min(1),
  mimeType: z.string().regex(/^image\/.+$/),
  fileSize: z.number().max(MAX_IMAGE_SIZE),
});
