import { ProductDetailsView } from "@/application/types/product.type";

export interface GetProductDetailsCommand {
  id: string;
}

export type GetProductDetailsResult = ProductDetailsView;

export interface GetProductDetailsUseCasePort {
  execute(command: GetProductDetailsCommand): Promise<GetProductDetailsResult>;
}
