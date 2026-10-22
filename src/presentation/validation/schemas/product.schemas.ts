import z from "zod";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { UploadImageSchema } from "./upload-image.schemas";
import { ProductSort } from "@/application/ports/driven/product.repository.port";
import { UpdateProductImageAction } from "@/application/ports/driving/update-product-image.use-case.port";

export const CreateProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1, { message: "Name must be at least 1 character long" }),
  price: z.coerce.number().min(1, { message: "Price must be at least 1" }),
  description: z.string().optional(),
  stockQuantity: z.coerce.number().nonnegative().optional(),
  type: z.enum(Object.values(ProductType)),
  status: z.enum(Object.values(ProductStatus)).optional(),
  ingredients: z.string().optional(),
  preparationTimeInMinutes: z.coerce.number().nonnegative().optional(),
  images: z.array(UploadImageSchema),
});

export const UpdateProductSchema = z.object({
  id: z.uuid(),
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  description: z.string().optional(),
  type: z.enum(Object.values(ProductType)).optional(),
  ingredients: z.string().optional(),
  preparationTimeInMinutes: z.number().int().nonnegative().optional(),
});

export const UpdateProductStatusSchema = z.object({
  id: z.uuid(),
  setStatus: z.enum(Object.values(ProductStatus)),
});

export const UpdateProductStockSchema = z.object({
  id: z.uuid(),
  restock: z.number().int().nonnegative().optional(),
  deductStock: z.number().int().nonnegative().optional(),
  setStock: z.number().int().nonnegative().optional(),
});

export const UpdateProductImageSchema = z.discriminatedUnion("action", [
  z.object({ id: z.uuid(), action: z.literal(UpdateProductImageAction.ADD), imageFile: UploadImageSchema }).transform((data) => ({
    id: data.id,
    action: data.action,
    imageFile: data.imageFile,
  })),

  z.object({ id: z.uuid(), action: z.literal(UpdateProductImageAction.REMOVE), imageUrl: z.url() }).transform((data) => ({
    id: data.id,
    action: data.action,
    imageUrl: data.imageUrl,
  })),

  z
    .object({ id: z.uuid(), action: z.literal(UpdateProductImageAction.REPLACE), oldImageUrl: z.url(), imageFile: UploadImageSchema })
    .transform((data) => ({
      id: data.id,
      action: data.action,
      oldImageUrl: data.oldImageUrl,
      imageFile: data.imageFile,
    })),

  z.object({ id: z.uuid(), action: z.literal(UpdateProductImageAction.REORDER), reorderedUrls: z.array(z.url()) }).transform((data) => ({
    id: data.id,
    action: data.action,
    reorderedUrls: data.reorderedUrls,
  })),
]);

export const GetProductDetailsSchema = z.object({
  id: z.uuid(),
});

export const GetProductsByIdsSchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

export const SearchProductsSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
});

export const BrowseProductsSchema = z.object({
  categoryId: z.uuid().optional(),
  type: z.enum(Object.values(ProductType)).optional(),
  status: z.enum(Object.values(ProductStatus)).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(Object.values(ProductSort)).default(ProductSort.NEWEST),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().nonnegative().default(15),
});

export type CreateProductSchemaType = z.infer<typeof CreateProductSchema>;
export type UpdateProductSchemaType = z.infer<typeof UpdateProductSchema>;
export type UpdateProductStatusSchemaType = z.infer<typeof UpdateProductStatusSchema>;
export type UpdateProductStockSchemaType = z.infer<typeof UpdateProductStockSchema>;
export type UpdateProductImageSchemaType = z.infer<typeof UpdateProductImageSchema>;
export type GetProductDetailsSchemaType = z.infer<typeof GetProductDetailsSchema>;
export type GetProductsByIdsSchemaType = z.infer<typeof GetProductsByIdsSchema>;
export type SearchProductsSchemaType = z.infer<typeof SearchProductsSchema>;
export type BrowseProductsSchemaType = z.infer<typeof BrowseProductsSchema>;
