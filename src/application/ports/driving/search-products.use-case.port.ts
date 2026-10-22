import { ProductSummaryView } from "@/application/types/product.type";

export interface SearchProductsCommand {
  keyword: string;
}

export interface SearchProductsResult {
  products: ProductSummaryView[];
  total: number;
  didYouMean?: string;
}

export interface SearchProductsUseCasePort {
  execute(command: SearchProductsCommand): Promise<SearchProductsResult>;
}
