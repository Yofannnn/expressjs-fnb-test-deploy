import { PrismaRepository } from "./prisma.repository";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import {
  BrowseProductCategoriesQuery,
  ProductCategoryRepositoryPort,
  ProductCategorySort,
} from "@/application/ports/driven/product-category.repository.port";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { ProductCategory as PrismaProductCategory } from "../../../../prisma/generated";

export class PrismaProductCategoryRepositoryAdapter
  extends PrismaRepository<PrismaProductCategoryRepositoryAdapter>
  implements ProductCategoryRepositoryPort, Transactional<PrismaProductCategoryRepositoryAdapter>
{
  protected repositoryName = "PrismaProductCategoryRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaProductCategoryRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async findById(id: string): Promise<ProductCategory | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const productCategory = await prisma.productCategory.findUnique({
          where: { id },
        });
        return productCategory ? this.toEntity(productCategory) : null;
      },
      "findById",
      { id },
    );
  }

  async browse(query: BrowseProductCategoriesQuery): Promise<ProductCategory[]> {
    const orderBy: Record<ProductCategorySort, Record<string, string>> = {
      [ProductCategorySort.NAME_ASC]: { name: "asc" },
      [ProductCategorySort.NAME_DESC]: { name: "desc" },
      [ProductCategorySort.SORT_ORDER_ASC]: { sortOrder: "asc" },
      [ProductCategorySort.SORT_ORDER_DESC]: { sortOrder: "desc" },
      [ProductCategorySort.NEWEST]: { createdAt: "desc" },
      [ProductCategorySort.OLDEST]: { createdAt: "asc" },
    };

    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const productCategories = await prisma.productCategory.findMany({
          where: { status: query.status },
          take: query.limit,
          orderBy: orderBy[query.sort || ProductCategorySort.SORT_ORDER_ASC],
        });
        return productCategories.map((c) => this.toEntity(c));
      },
      "browse",
      { query },
    );
  }

  async findAll(): Promise<ProductCategory[]> {
    return await this.withLoggingAndErrorHandling(async () => {
      const prisma = await this.getPrismaClient();
      const productCategories = await prisma.productCategory.findMany();
      return productCategories.map(this.toEntity);
    }, "findAll");
  }

  async insert(productCategory: ProductCategory): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.productCategory.create({
          data: this.toPrismaData(productCategory),
        });
      },
      "insert",
      { id: productCategory.getId() },
    );
  }

  async update(productCategory: ProductCategory): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.productCategory.update({
          where: { id: productCategory.getId() },
          data: this.toPrismaData(productCategory),
        });
      },
      "update",
      { id: productCategory.getId() },
    );
  }

  async updateMany(productCategories: ProductCategory[]): Promise<void> {
    await this.withLoggingAndErrorHandling(async () => {
      const prisma = await this.getPrismaClient();
      await prisma.productCategory.updateMany({
        data: productCategories.map((c) => this.toPrismaData(c)),
      });
    }, "updateMany");
  }

  async delete(id: string): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.productCategory.delete({ where: { id } });
      },
      "delete",
      { id },
    );
  }

  async getNextSortOrder(): Promise<number> {
    return await this.withLoggingAndErrorHandling(async () => {
      const prisma = await this.getPrismaClient();
      const result = await prisma.productCategory.aggregate({
        _max: { sortOrder: true },
      });
      return (result._max.sortOrder ?? 0) + 1;
    }, "getNextSortOrder");
  }

  private toPrismaData(productCategory: ProductCategory) {
    return {
      id: productCategory.getId(),
      name: productCategory.getName(),
      description: productCategory.getDescription(),
      status: productCategory.getStatus(),
      sortOrder: productCategory.getSortOrder(),
      imageUrl: productCategory.getImageUrl(),
      createdAt: productCategory.getCreatedAt(),
      updatedAt: productCategory.getUpdatedAt(),
    };
  }

  private toEntity(productCategory: PrismaProductCategory): ProductCategory {
    return ProductCategory.rebuild({
      id: productCategory.id,
      name: productCategory.name,
      description: productCategory.description,
      imageUrl: productCategory.imageUrl,
      status: productCategory.status as ProductCategoryStatus,
      sortOrder: productCategory.sortOrder,
      createdAt: productCategory.createdAt,
      updatedAt: productCategory.updatedAt,
    });
  }
}
