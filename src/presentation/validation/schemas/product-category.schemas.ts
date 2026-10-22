import z from "zod";
import { UploadImageSchema } from "./upload-image.schemas";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { ProductCategorySort } from "@/application/ports/driven/product-category.repository.port";

export const CreateProductCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  image: UploadImageSchema.optional(),
});

export const UpdateProductCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  image: UploadImageSchema.optional(),
  status: z.enum(Object.values(ProductCategoryStatus)).optional(),
});

export const GetProductCategoryDetailSchema = z.object({
  id: z.uuid(),
});

export const BrowseProductCategoriesSchema = z.object({
  status: z.enum(Object.values(ProductCategoryStatus)).optional(),
  sort: z.enum(Object.values(ProductCategorySort)).default(ProductCategorySort.SORT_ORDER_ASC).optional(),
});

export const ReorderProductCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.uuid(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export type CreateProductCategorySchemaType = z.infer<typeof CreateProductCategorySchema>;
export type UpdateProductCategorySchemaType = z.infer<typeof UpdateProductCategorySchema>;
export type ReorderProductCategoriesSchemaType = z.infer<typeof ReorderProductCategoriesSchema>;
export type GetProductCategoryDetailSchemaType = z.infer<typeof GetProductCategoryDetailSchema>;
export type BrowseProductCategoriesSchemaType = z.infer<typeof BrowseProductCategoriesSchema>;
