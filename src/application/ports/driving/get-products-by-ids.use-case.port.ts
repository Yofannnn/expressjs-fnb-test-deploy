import { ProductPlainObject } from "@/application/types/product.type";

export interface GetProductsByIdsCommand {
  ids: string[];
}

export interface GetProductsByIdsResult {
  products: ProductPlainObject[];
  notFoundIds: string[];
}

export interface GetProductsByIdsUseCasePort {
  execute(command: GetProductsByIdsCommand): Promise<GetProductsByIdsResult>;
}
