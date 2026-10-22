import { DatabaseClient, Transactional } from "@/infrastructure/database/database.type";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { UnitOfWorkRepositories, UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";

export class PrismaUnitOfWorkAdapter implements UnitOfWorkPort {
  constructor(
    private readonly dbClient: DatabaseClient,
    private readonly userRepository: UserRepositoryPort & Transactional<UserRepositoryPort>,
    private readonly sessionRepository: SessionRepositoryPort & Transactional<SessionRepositoryPort>,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort & Transactional<ApplicationTokenRepositoryPort>,
    private readonly productRepository: ProductRepositoryPort & Transactional<ProductRepositoryPort>,
    private readonly productCategoryRepository: ProductCategoryRepositoryPort & Transactional<ProductCategoryRepositoryPort>,
    private readonly orderRepository: OrderRepositoryPort & Transactional<OrderRepositoryPort>,
    private readonly paymentTransactionRepository: PaymentTransactionRepositoryPort & Transactional<PaymentTransactionRepositoryPort>,
  ) {}

  async commit<T>(operation: (repos: UnitOfWorkRepositories) => Promise<T>): Promise<T> {
    return await this.dbClient.executeInTransaction(async (txContext) => {
      const transactionalRepositories: UnitOfWorkRepositories = {
        userRepository: this.userRepository.withTransaction(txContext),
        sessionRepository: this.sessionRepository.withTransaction(txContext),
        applicationTokenRepository: this.applicationTokenRepository.withTransaction(txContext),
        productCategoryRepository: this.productCategoryRepository.withTransaction(txContext),
        productRepository: this.productRepository.withTransaction(txContext),
        orderRepository: this.orderRepository.withTransaction(txContext),
        paymentTransactionRepository: this.paymentTransactionRepository.withTransaction(txContext),
      };

      return await operation(transactionalRepositories);
    });
  }
}
