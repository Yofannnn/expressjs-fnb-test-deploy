import { PrismaRepository } from "./prisma.repository";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import {
  BrowseProductsQuery,
  ProductDetail,
  ProductPage,
  ProductRepositoryPort,
  ProductSort,
} from "@/application/ports/driven/product.repository.port";
import { Product } from "@/domain/entities/product.entity";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { InsufficientStockException } from "@/domain/exceptions/product.exceptions";
import { Prisma, Product as PrismaProduct, ProductImage as PrismaProductImage } from "../../../../prisma/generated";

export class PrismaProductRepositoryAdapter
  extends PrismaRepository<PrismaProductRepositoryAdapter>
  implements ProductRepositoryPort, Transactional<PrismaProductRepositoryAdapter>
{
  protected repositoryName = "PrismaProductRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaProductRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async findById(id: string): Promise<Product | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const product = await prisma.product.findUnique({
          where: { id },
          include: { images: true },
        });

        if (!product) return null;

        return this.toDomain(product);
      },
      "findById",
      { id },
    );
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { images: true } });
        const byId = new Map<string, Product>();

        for (const product of products) {
          byId.set(product.id, this.toDomain(product));
        }

        return ids.map((id) => byId.get(id)).filter((p): p is Product => p !== undefined);
      },
      "findByIds",
      { ids },
    );
  }

  async findDetailById(id: string): Promise<ProductDetail | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const product = await prisma.product.findUnique({
          where: { id },
          include: { productCategory: true, images: true },
        });

        if (!product) return null;

        return {
          product: this.toDomain(product),
          productCategory: ProductCategory.rebuild({
            id: product.productCategory.id,
            name: product.productCategory.name,
            description: product.productCategory.description,
            status: product.productCategory.status as ProductCategoryStatus,
            imageUrl: product.productCategory.imageUrl,
            sortOrder: product.productCategory.sortOrder,
            createdAt: product.productCategory.createdAt,
            updatedAt: product.productCategory.updatedAt,
          }),
        };
      },
      "findDetailById",
      { id },
    );
  }

  async search(keyword: string): Promise<Product[]> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const products = await prisma.product.findMany({
          where: { name: { contains: keyword, mode: "insensitive" } },
          include: { images: { orderBy: [{ isPrimary: "desc" }, { orderNumber: "asc" }], take: 1 } },
          orderBy: { createdAt: "desc" },
        });

        return products.map((product) => this.toDomain(product));
      },
      "search",
      { keyword },
    );
  }

  async browse(query: BrowseProductsQuery): Promise<ProductPage> {
    const orderBy: Record<ProductSort, Record<string, string>> = {
      [ProductSort.NAME_ASC]: { name: "asc" },
      [ProductSort.NAME_DESC]: { name: "desc" },
      [ProductSort.PRICE_ASC]: { price: "asc" },
      [ProductSort.PRICE_DESC]: { price: "desc" },
      [ProductSort.NEWEST]: { createdAt: "desc" },
      [ProductSort.OLDEST]: { createdAt: "asc" },
    };

    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const limit = query.limit ?? 20;

        const products = await prisma.product.findMany({
          where: { categoryId: query.categoryId, status: query.status, type: query.type },
          include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 } },
          take: limit + 1,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
          orderBy: orderBy[query.sort ?? ProductSort.NEWEST],
        });

        const hasMore = products.length > limit;
        const pageItems = hasMore ? products.slice(0, limit) : products;

        return {
          products: pageItems.map((product) => this.toDomain(product)),
          nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
        };
      },
      "browse",
      { query },
    );
  }

  async insert(product: Product): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.product.create({
          data: {
            id: product.getId(),
            categoryId: product.getCategoryId(),
            name: product.getName(),
            description: product.getDescription(),
            price: product.getPrice().getAmount(),
            type: product.getType(),
            ingredients: product.getIngredients(),
            preparationTimeInMinutes: product.getPreparationTimeInMinutes(),
            stockQuantity: product.getStockQuantity(),
            status: product.getStatus(),
            createdAt: product.getCreatedAt(),
            updatedAt: product.getUpdatedAt(),
            images: {
              createMany: {
                data: product.getImages().map((image) => ({
                  url: image.getUrl(),
                  altText: image.getAltText(),
                  sortOrder: image.getSortOrder(),
                  isPrimary: image.isPrimaryImage(),
                })),
              },
            },
          },
        });
      },
      "insert",
      { id: product.getId() },
    );
  }

  async update(product: Product): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.product.update({
          where: { id: product.getId() },
          data: {
            categoryId: product.getCategoryId(),
            name: product.getName(),
            description: product.getDescription(),
            price: product.getPrice().getAmount(),
            type: product.getType(),
            ingredients: product.getIngredients(),
            preparationTimeInMinutes: product.getPreparationTimeInMinutes(),
            stockQuantity: product.getStockQuantity(),
            status: product.getStatus(),
            createdAt: product.getCreatedAt(),
            updatedAt: product.getUpdatedAt(),
          },
        });
      },
      "update",
      { id: product.getId() },
    );
  }

  async updateImages(product: Product): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.productImage.deleteMany({ where: { productId: product.getId() } });
        await prisma.productImage.createMany({
          data: product.getImages().map((image) => ({
            productId: product.getId(),
            url: image.getUrl(),
            altText: image.getAltText(),
            sortOrder: image.getSortOrder(),
            isPrimary: image.isPrimaryImage(),
          })),
        });
        await prisma.product.update({ where: { id: product.getId() }, data: { updatedAt: product.getUpdatedAt() } });
      },
      "updateImages",
      { id: product.getId() },
    );
  }

  async deductStockForItems(items: Array<{ id: string; quantity: number }>): Promise<void> {
    if (items.length === 0) return;

    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        for (const item of items) {
          const affectedRows = await prisma.$executeRaw(Prisma.sql`
              UPDATE products
              SET
                stock_quantity = stock_quantity - ${item.quantity},
                status = CASE
                  WHEN stock_quantity - ${item.quantity} <= 0
                    AND status = 'AVAILABLE'
                  THEN 'OUT_OF_STOCK'::"ProductStatus"
                  ELSE status
                END,
                updated_at = NOW()
              WHERE id = ${item.id}
                AND stock_quantity >= ${item.quantity}
          `);

          if (affectedRows === 0) {
            const current = await prisma.product.findUnique({
              where: { id: item.id },
              select: { stockQuantity: true },
            });
            throw new InsufficientStockException(item.quantity, current?.stockQuantity ?? 0);
          }
        }
      },
      "deductStockForItems",
      { items },
    );
  }

  async delete(id: string): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.product.delete({ where: { id } });
      },
      "delete",
      { id },
    );
  }

  private toDomain(data: PrismaProduct & { images: PrismaProductImage[] }): Product {
    return Product.rebuild({
      id: data.id,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      type: data.type as ProductType,
      ingredients: data.ingredients,
      preparationTimeInMinutes: data.preparationTimeInMinutes,
      status: data.status as ProductStatus,
      stockQuantity: data.stockQuantity,
      images: data.images.map((image) => ({
        productId: image.productId,
        url: image.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
