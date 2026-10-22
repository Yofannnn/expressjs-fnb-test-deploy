import { ProductCategoryPlainObject } from "@/application/types/product-category.type";

export interface GetProductCategoryDetailsCommand {
  id: string;
}

export type GetProductCategoryDetailsResult = ProductCategoryPlainObject;

export interface GetProductCategoryDetailsUseCasePort {
  execute(command: GetProductCategoryDetailsCommand): Promise<GetProductCategoryDetailsResult>;
}
