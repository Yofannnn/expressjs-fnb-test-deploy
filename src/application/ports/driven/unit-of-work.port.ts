import { UserRepositoryPort } from "./user.repository.port";
import { SessionRepositoryPort } from "./session.repository.port";
import { ApplicationTokenRepositoryPort } from "./application-token.repository.port";
import { ProductCategoryRepositoryPort } from "./product-category.repository.port";
import { ProductRepositoryPort } from "./product.repository.port";
import { OrderRepositoryPort } from "./order.repository.port";
import { PaymentTransactionRepositoryPort } from "./payment-transaction.repository.port";

export interface UnitOfWorkRepositories {
  userRepository: UserRepositoryPort;
  sessionRepository: SessionRepositoryPort;
  applicationTokenRepository: ApplicationTokenRepositoryPort;
  productRepository: ProductRepositoryPort;
  productCategoryRepository: ProductCategoryRepositoryPort;
  orderRepository: OrderRepositoryPort;
  paymentTransactionRepository: PaymentTransactionRepositoryPort;
}

export interface UnitOfWorkPort {
  commit<T>(operation: (repos: UnitOfWorkRepositories) => Promise<T>): Promise<T>;
}
