import { ApplicationTokenFactory } from "./application/factories/application-token.factory";
import { SessionFactory } from "./application/factories/session.factory";
import { RecordUserActivityHandler } from "./application/handlers/record-user-activity.handler";
import { RevokeSessionsOnPasswordChangedHandler } from "./application/handlers/revoke-sessions-on-password-changed.handler";
import { SendEmailHandler } from "./application/handlers/send-email.handler";
import { ApplicationTokenRepositoryPort } from "./application/ports/driven/application-token.repository.port";
import { AuthTokenDecoderPort } from "./application/ports/driven/auth-token-decoder.port";
import { AuthTokenIssuerPort } from "./application/ports/driven/auth-token-issuer.port";
import { AuthTokenVerifierPort } from "./application/ports/driven/auth-token-verifier.port";
import { DistanceCalculatorPort } from "./application/ports/driven/distance-calculator.port";
import { EmailSenderPort } from "./application/ports/driven/email-sender.port";
import { EventBusPort } from "./application/ports/driven/event-bus.port";
import { EventExecutionStrategy } from "./application/ports/driven/event-handler.port";
import { FingerprintPort } from "./application/ports/driven/fingerprint.port";
import { IdGeneratorPort } from "./application/ports/driven/id-generator.port";
import { LoggerPort } from "./application/ports/driven/logger.port";
import { ObjectStoragePort } from "./application/ports/driven/object-storage.port";
import { OrderRepositoryPort } from "./application/ports/driven/order.repository.port";
import { PasswordHasherPort } from "./application/ports/driven/password-hasher.port";
import { PaymentGatewayPort } from "./application/ports/driven/payment-gateway.port";
import { PaymentTransactionRepositoryPort } from "./application/ports/driven/payment-transaction.repository.port";
import { ProductCategoryRepositoryPort } from "./application/ports/driven/product-category.repository.port";
import { ProductRepositoryPort } from "./application/ports/driven/product.repository.port";
import { RequestContextPort } from "./application/ports/driven/request-context.port";
import { SessionRepositoryPort } from "./application/ports/driven/session.repository.port";
import { TokenGeneratorPort } from "./application/ports/driven/token-generator.port";
import { UnitOfWorkPort } from "./application/ports/driven/unit-of-work.port";
import { UserActivityRepositoryPort } from "./application/ports/driven/user-activity.repository.port";
import { UserRepositoryPort } from "./application/ports/driven/user.repository.port";
import { BrowseOrdersUseCasePort } from "./application/ports/driving/browse-orders.use-case.port";
import { BrowseProductCategoriesUseCasePort } from "./application/ports/driving/browse-product-categories.use-case.port";
import { BrowseProductsUseCasePort } from "./application/ports/driving/browse-products.use-case.port";
import { CreateOnlineOrderUseCasePort } from "./application/ports/driving/create-online-order.use-case.port";
import { CreateProductCategoryUseCasePort } from "./application/ports/driving/create-product-category.use-case.port";
import { CreateProductUseCasePort } from "./application/ports/driving/create-product.use-case.port";
import { GetCurrentUserProfileUseCasePort } from "./application/ports/driving/get-current-user-profile.use-case.port";
import { GetOnlineOrderQuoteUseCasePort } from "./application/ports/driving/get-online-order-quote.use-case.port";
import { GetOrderDetailsUseCasePort } from "./application/ports/driving/get-order-details.use-case.port";
import { GetPaymentDetailsUseCasePort } from "./application/ports/driving/get-payment-details.use-case.port";
import { GetPaymentsByOrderIdUseCasePort } from "./application/ports/driving/get-payments-by-order-id.use-case.port";
import { GetProductCategoryDetailsUseCasePort } from "./application/ports/driving/get-product-category-details.use-case.port";
import { GetProductDetailsUseCasePort } from "./application/ports/driving/get-product-details.use-case.port";
import { GetProductsByIdsUseCasePort } from "./application/ports/driving/get-products-by-ids.use-case.port";
import { HandlePaymentUseCasePort } from "./application/ports/driving/handle-payment.use-case.port";
import { InitiateChargeUseCasePort } from "./application/ports/driving/initiate-charge.use-case.port";
import { LoginUseCasePort } from "./application/ports/driving/login.use-case.port";
import { LogoutUseCasePort } from "./application/ports/driving/logout.use-case.port";
import { RefreshSessionUseCasePort } from "./application/ports/driving/refresh-session.use-case.port";
import { RegisterUseCasePort } from "./application/ports/driving/register.use-case.port";
import { RenewGuestOrderTokenUseCasePort } from "./application/ports/driving/renew-guest-order-token.use-case.port";
import { ReorderProductCategoriesUseCasePort } from "./application/ports/driving/reorder-product-categories.use-case.port";
import { RequestPasswordResetUseCasePort } from "./application/ports/driving/request-password-reset.use-case.port";
import { ResendVerificationEmailUseCasePort } from "./application/ports/driving/resend-verification-email.use-case.port";
import { ResetPasswordUseCasePort } from "./application/ports/driving/reset-password.use-case.port";
import { SearchProductsUseCasePort } from "./application/ports/driving/search-products.use-case.port";
import { UpdateProductCategoryUseCasePort } from "./application/ports/driving/update-product-category.use-case.port";
import { UpdateProductImageUseCasePort } from "./application/ports/driving/update-product-image.use-case.port";
import { UpdateProductStatusUseCasePort } from "./application/ports/driving/update-product-status.use-case.port";
import { UpdateProductStockUseCasePort } from "./application/ports/driving/update-product-stock.use-case.port";
import { UpdateProductUseCasePort } from "./application/ports/driving/update-product.use-case.port";
import { ValidateResetTokenUseCasePort } from "./application/ports/driving/validate-reset-token.use-case.port";
import { VerifyEmailUseCasePort } from "./application/ports/driving/verify-email.use-case.port";
import { LoginUseCase } from "./application/use-cases/auth/login.use-case";
import { LogoutUseCase } from "./application/use-cases/auth/logout.use-case";
import { RefreshSessionUseCase } from "./application/use-cases/auth/refresh-session.use-case";
import { RegisterUseCase } from "./application/use-cases/auth/register.use-case";
import { RequestPasswordResetUseCase } from "./application/use-cases/auth/request-password-reset.use-case";
import { ResendVerificationEmailUseCase } from "./application/use-cases/auth/resend-verification-email.use-case";
import { ResetPasswordUseCase } from "./application/use-cases/auth/reset-password.use-case";
import { ValidateResetTokenUseCase } from "./application/use-cases/auth/validate-reset-token.use-case";
import { VerifyEmailUseCase } from "./application/use-cases/auth/verify-email.use-case";
import { BrowseOrdersUseCase } from "./application/use-cases/order/browse-orders.use-case";
import { CreateOnlineOrderUseCase } from "./application/use-cases/order/create-online-order.use-case";
import { GetOnlineOrderQuoteUseCase } from "./application/use-cases/order/get-online-order-quote.use-case";
import { GetOrderDetailsUseCase } from "./application/use-cases/order/get-order-details.use-case";
import { RenewGuestOrderTokenUseCase } from "./application/use-cases/order/renew-guest-order-token.use-case";
import { GetPaymentDetailsUseCase } from "./application/use-cases/payment/get-payment-details.use-case";
import { GetPaymentsByOrderIdUseCase } from "./application/use-cases/payment/get-payments-by-order-id.use-case";
import { HandlePaymentUseCase } from "./application/use-cases/payment/handle-payment.use-case";
import { InitiateChargeUseCase } from "./application/use-cases/payment/initiate-charge.use-case";
import { BrowseProductsUseCase } from "./application/use-cases/product/browse-products.use-case";
import { CreateProductUseCase } from "./application/use-cases/product/create-product.use-case";
import { GetProductDetailsUseCase } from "./application/use-cases/product/get-product-details.use-case";
import { GetProductsByIdsUseCase } from "./application/use-cases/product/get-products-by-ids.use-case";
import { BrowseProductCategoriesUseCase } from "./application/use-cases/product/product-category/browse-product-categories.use-case";
import { CreateProductCategoryUseCase } from "./application/use-cases/product/product-category/create-product-category.use-case";
import { GetProductCategoryDetailsUseCase } from "./application/use-cases/product/product-category/get-product-category-details.use-case";
import { ReorderProductCategoriesUseCase } from "./application/use-cases/product/product-category/reorder-product-categories.use-case";
import { UpdateProductCategoryUseCase } from "./application/use-cases/product/product-category/update-product-category.use-case";
import { SearchProductsUseCase } from "./application/use-cases/product/search-products.use-case";
import { UpdateProductImageUseCase } from "./application/use-cases/product/update-product-image.use-case";
import { UpdateProductStatusUseCase } from "./application/use-cases/product/update-product-status.use-case";
import { UpdateProductStockUseCase } from "./application/use-cases/product/update-product-stock.use-case";
import { UpdateProductUseCase } from "./application/use-cases/product/update-product.use-case";
import { GetCurrentUserProfileUseCase } from "./application/use-cases/user/get-current-user-profile.use-case";
import { DeliveryFeePolicy } from "./domain/policies/delivery-fee.policy";
import { GuestOrderManagementPolicy } from "./domain/policies/guest-order-management.policy";
import { LoginSecurityPolicy } from "./domain/policies/login-security.policy";
import { OrderConstraintPolicy } from "./domain/policies/order-constraint.policy";
import { PasswordResetPolicy } from "./domain/policies/password-reset.policy";
import { PricingPolicy } from "./domain/policies/pricing.policy";
import { SessionPolicy } from "./domain/policies/session.policy";
import { VerificationEmailPolicy } from "./domain/policies/verification-email.policy";
import { StoreLocation } from "./domain/types/store-location.type";
import { RedisConnectionManager } from "./infrastructure/cache/redis-connection";
import { CircuitBreakerFactory } from "./infrastructure/circuit-breaker/circuit-breaker.factory";
import { IdGeneratorAdapter } from "./infrastructure/common/id-generator.adapter";
import { AppIdentity, AppIdentityConfig } from "./infrastructure/configs/app-identity.config";
import { DeliveryFeePolicyEnvConfig } from "./infrastructure/configs/delivery-fee-policy.config";
import { EventBatchConfig, EventBatchEnvConfig } from "./infrastructure/configs/event-batch.config";
import { EventQueueProcessorConfig, EventQueueProcessorEnvConfig } from "./infrastructure/configs/event-queue-processor.config";
import { EventQueueConfig, EventQueueEnvConfig } from "./infrastructure/configs/event-queue.config";
import { GuestOrderManagementPolicyEnvConfig } from "./infrastructure/configs/guest-order-management-policy.config";
import { JwtConfig, JwtEnvConfig } from "./infrastructure/configs/jwt.config";
import { LoginSecurityPolicyEnvConfig } from "./infrastructure/configs/login-security-policy.config";
import { MidtransConfig, MidtransEnvConfig } from "./infrastructure/configs/midtrans.config";
import { NodemailerTransportConfig, NodemailerTransportEnvConfig } from "./infrastructure/configs/nodemailer.config";
import { OrderConstraintPolicyEnvConfig } from "./infrastructure/configs/order-constraint-policy.config";
import { PasswordResetPolicyEnvConfig } from "./infrastructure/configs/password-reset-policy.config";
import { PricingPolicyEnvConfig } from "./infrastructure/configs/pricing-policy.config";
import { PrismaDatabaseConfig, PrismaEnvConfig } from "./infrastructure/configs/prisma-database.config";
import { RateLimitConfig, RateLimitEnvConfig } from "./infrastructure/configs/rate-limit.config";
import { RedisConfig, RedisEnvConfig } from "./infrastructure/configs/redis.config";
import { SessionPolicyEnvConfig } from "./infrastructure/configs/session-policy.config";
import { StoreLocationEnvConfig } from "./infrastructure/configs/store-location.config";
import { VercelBlobConfig, VercelBlobEnvConfig } from "./infrastructure/configs/vercel-blob.config";
import { VerificationEmailPolicyEnvConfig } from "./infrastructure/configs/verification-email-policy.config";
import { createLogger } from "./infrastructure/configs/winston-logger.config";
import { Transactional } from "./infrastructure/database/database.type";
import { PrismaDatabaseClient } from "./infrastructure/database/prisma-database-client";
import { PrismaUnitOfWorkAdapter } from "./infrastructure/database/prisma-unit-of-work.adapter";
import { PrismaApplicationTokenRepositoryAdapter } from "./infrastructure/database/repositories/prisma-application-token.repository.adapter";
import { PrismaOrderRepositoryAdapter } from "./infrastructure/database/repositories/prisma-order.repository.adapter";
import { PrismaPaymentTransactionRepositoryAdapter } from "./infrastructure/database/repositories/prisma-payment-transaction.repository.adapter";
import { PrismaProductCategoryRepositoryAdapter } from "./infrastructure/database/repositories/prisma-product-category.repository.adapter";
import { PrismaProductRepositoryAdapter } from "./infrastructure/database/repositories/prisma-product.repository.adapter";
import { PrismaSessionRepositoryAdapter } from "./infrastructure/database/repositories/prisma-session.repository.adapter";
import { PrismaUserActivityRepositoryAdapter } from "./infrastructure/database/repositories/prisma-user-activity.repository.adapter";
import { PrismaUserRepositoryAdapter } from "./infrastructure/database/repositories/prisma-user.repository.adapter";
import { EmailTemplateFactory } from "./infrastructure/email/email-template-factory";
import { EmailClient } from "./infrastructure/email/email.type";
import { NodemailerEmailClient } from "./infrastructure/email/nodemailer-email-client";
import { NodemailerEmailSenderAdapter } from "./infrastructure/email/nodemailer-email-sender.adapter";
import { BatchFlushCoordinator } from "./infrastructure/events/batcher/batch-flush-coordinator";
import { EventBatcher } from "./infrastructure/events/batcher/event-batcher.type";
import { InMemoryEventBatcher } from "./infrastructure/events/batcher/in-memory-event-batcher";
import { DeadLetterQueue } from "./infrastructure/events/core/dead-letter-queue.type";
import { EventEnricher } from "./infrastructure/events/core/event-enricher";
import { EventGrouper } from "./infrastructure/events/core/event-grouper";
import { DispatchReporter } from "./infrastructure/events/dispatch/dispatch-reporter";
import { HandlerRunner } from "./infrastructure/events/dispatch/handler-runner";
import { EventBusAdapter } from "./infrastructure/events/event-bus.adapter";
import { PrismaDeadLetterQueueAdapter } from "./infrastructure/events/prisma-dead-letter-queue.adapter";
import { EventQueueProcessor } from "./infrastructure/events/queue/event-queue-processor";
import { EventQueue } from "./infrastructure/events/queue/event-queue.type";
import { RedisEventQueue } from "./infrastructure/events/queue/redis-event-queue";
import { EventHandlerRegistration } from "./infrastructure/events/registration/event-handler-registration.type";
import { InMemoryEventHandlerRegistry } from "./infrastructure/events/registration/in-memory-event-handler-registry";
import { EventHandlerInvoker } from "./infrastructure/events/retry/event-handler-invoker.type";
import { RetryHandlerInvoker } from "./infrastructure/events/retry/retry-handler-invoker";
import { DelayedStrategy } from "./infrastructure/events/strategies/delayed.strategy";
import { ImmediateCriticalStrategy } from "./infrastructure/events/strategies/immediate-critical.strategy";
import { ImmediateTolerantStrategy } from "./infrastructure/events/strategies/immediate-tolerant.strategy";
import { QueuedBatchStrategy } from "./infrastructure/events/strategies/queued-batch.strategy";
import { HaversineDistanceCalculatorAdapter } from "./infrastructure/geolocation/haversine-distance-calculator.adapter";
import { WinstonLogger } from "./infrastructure/logger/winston-logger.adapter";
import { VercelBlobObjectStorageAdapter } from "./infrastructure/object-storage/vercel-blob-object-storage.adapter";
import { MidtransPaymentGatewayAdapter } from "./infrastructure/payment/midtrans-payment-gateway.adapter";
import { ApiRateLimit } from "./infrastructure/rate-limit/api-rate-limit.type";
import { RedisApiRateLimit } from "./infrastructure/rate-limit/redis-api-rate-limit";
import { NodeAsyncLocalStorage } from "./infrastructure/request-context/node-async-local-storage";
import { NodeRequestContextAdapter } from "./infrastructure/request-context/node-request-context.adapter";
import { BcryptPasswordHasherAdapter } from "./infrastructure/security/bcrypt-password-hasher.adapter";
import { CryptoTokenGeneratorAdapter } from "./infrastructure/security/crypto-token-generator.adapter";
import { JwtAuthTokenDecoderAdapter } from "./infrastructure/security/jwt-auth-token-decoder.adapter";
import { JWTAuthTokenIssuerAdapter } from "./infrastructure/security/jwt-auth-token-issuer.adapter";
import { JWTAuthTokenVerifierAdapter } from "./infrastructure/security/jwt-auth-token-verifier.adapter";
import { Sha256FingerprintAdapter } from "./infrastructure/security/sha256-fingerprint.adapter";
import { AuthController } from "./presentation/controllers/auth.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { OrderController } from "./presentation/controllers/order.controller";
import { PaymentController } from "./presentation/controllers/payment.controller";
import { ProductCategoryController } from "./presentation/controllers/product-category.controller";
import { ProductController } from "./presentation/controllers/product.controller";
import { UserController } from "./presentation/controllers/user.controller";
import { HTTPErrorFilter } from "./presentation/filter/http-error.filter";
import { ZodRequestValidation } from "./presentation/validation/zod-request-validation";

class DIContainer {
  private static instance: DIContainer;
  public readonly appIdentity: AppIdentity;
  public readonly prismaDatabaseConfig: PrismaDatabaseConfig;
  public readonly nodemailerTransportConfig: NodemailerTransportConfig;
  public readonly midtransConfig: MidtransConfig;
  public readonly eventBatchConfig: EventBatchConfig;
  public readonly eventQueueProcessorConfig: EventQueueProcessorConfig;
  public readonly eventQueueConfig: EventQueueConfig;
  public readonly jwtConfig: JwtConfig;
  public readonly rateLimitConfig: RateLimitConfig;
  public readonly redisConfig: RedisConfig;
  public readonly vercelBlobConfig: VercelBlobConfig;
  public readonly loginSecurityPolicy: LoginSecurityPolicy;
  public readonly passwordResetPolicy: PasswordResetPolicy;
  public readonly verificationEmailPolicy: VerificationEmailPolicy;
  public readonly sessionPolicy: SessionPolicy;
  public readonly deliveryFeePolicy: DeliveryFeePolicy;
  public readonly guestOrderManagementPolicy: GuestOrderManagementPolicy;
  public readonly orderConstraintPolicy: OrderConstraintPolicy;
  public readonly pricingPolicy: PricingPolicy;
  public readonly storeLocation: StoreLocation;
  public readonly nodeAsyncLocalStorage: NodeAsyncLocalStorage;
  public readonly requestContext: RequestContextPort;
  public readonly logger: LoggerPort;
  public readonly circuitBreakerFactory: CircuitBreakerFactory;
  public readonly redisConnection: RedisConnectionManager;
  public readonly dbClient: PrismaDatabaseClient;
  public readonly userRepository: UserRepositoryPort & Transactional<UserRepositoryPort>;
  public readonly sessionRepository: SessionRepositoryPort & Transactional<SessionRepositoryPort>;
  public readonly applicationTokenRepository: ApplicationTokenRepositoryPort & Transactional<ApplicationTokenRepositoryPort>;
  public readonly productCategoryRepository: ProductCategoryRepositoryPort & Transactional<ProductCategoryRepositoryPort>;
  public readonly productRepository: ProductRepositoryPort & Transactional<ProductRepositoryPort>;
  public readonly orderRepository: OrderRepositoryPort & Transactional<OrderRepositoryPort>;
  public readonly paymentTransactionRepository: PaymentTransactionRepositoryPort & Transactional<PaymentTransactionRepositoryPort>;
  public readonly userActivityRepository: UserActivityRepositoryPort;
  public readonly uow: UnitOfWorkPort;
  public readonly requestValidation: ZodRequestValidation;
  public readonly emailClient: EmailClient;
  public readonly emailTemplateFactory: EmailTemplateFactory;
  public readonly emailSender: EmailSenderPort;
  public readonly distanceCalculator: DistanceCalculatorPort;
  public readonly idGenerator: IdGeneratorPort;
  public readonly fingerprintProvider: FingerprintPort;
  public readonly passwordHasher: PasswordHasherPort;
  public readonly tokenGenerator: TokenGeneratorPort;
  public readonly authTokenIssuer: AuthTokenIssuerPort;
  public readonly authTokenVerifier: AuthTokenVerifierPort;
  public readonly authTokenDecoder: AuthTokenDecoderPort;
  public readonly recordUserActivityHandler: RecordUserActivityHandler;
  public readonly sendEmailHandler: SendEmailHandler;
  public readonly revokeSessionsOnPasswordChangedHandler: RevokeSessionsOnPasswordChangedHandler;
  public readonly batchFlushCoordinator: BatchFlushCoordinator;
  public readonly eventBatcher: EventBatcher;
  public readonly dispatchReporter: DispatchReporter;
  public readonly handlerRunner: HandlerRunner;
  public readonly eventQueueProcessor: EventQueueProcessor;
  public readonly eventHandlerRegistration: EventHandlerRegistration;
  public readonly eventQueue: EventQueue;
  public readonly eventHandlerInvoker: EventHandlerInvoker;
  public readonly immediateCriticalStrategy: ImmediateCriticalStrategy;
  public readonly immediateTolerantStrategy: ImmediateTolerantStrategy;
  public readonly queuedBatchStrategy: QueuedBatchStrategy;
  public readonly delayedStrategy: DelayedStrategy;
  public readonly eventEnricher: EventEnricher;
  public readonly eventGrouper: EventGrouper;
  public readonly eventBus: EventBusPort;
  public readonly deadLetterQueue: DeadLetterQueue;
  public readonly objectStorage: ObjectStoragePort;
  public readonly paymentGateway: PaymentGatewayPort;
  public readonly apiRateLimit: ApiRateLimit;
  public readonly registerUseCase: RegisterUseCasePort;
  public readonly sessionFactory: SessionFactory;
  public readonly applicationTokenFactory: ApplicationTokenFactory;
  public readonly loginUseCase: LoginUseCasePort;
  public readonly refreshSessionUseCase: RefreshSessionUseCasePort;
  public readonly logoutUseCase: LogoutUseCasePort;
  public readonly verifyEmailUseCase: VerifyEmailUseCasePort;
  public readonly resendVerificationEmailUseCase: ResendVerificationEmailUseCasePort;
  public readonly requestPasswordResetUseCase: RequestPasswordResetUseCasePort;
  public readonly validateResetTokenUseCase: ValidateResetTokenUseCasePort;
  public readonly resetPasswordUseCase: ResetPasswordUseCasePort;
  public readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCasePort;
  public readonly getProductDetailUseCase: GetProductDetailsUseCasePort;
  public readonly getProductsByIdsUseCase: GetProductsByIdsUseCasePort;
  public readonly browseProductsUseCase: BrowseProductsUseCasePort;
  public readonly searchProductsUseCase: SearchProductsUseCasePort;
  public readonly createProductUseCase: CreateProductUseCasePort;
  public readonly updateProductUseCase: UpdateProductUseCasePort;
  public readonly updateProductStockUseCase: UpdateProductStockUseCasePort;
  public readonly updateProductStatusUseCase: UpdateProductStatusUseCasePort;
  public readonly updateProductImageUseCase: UpdateProductImageUseCasePort;
  public readonly getProductCategoryDetailUseCase: GetProductCategoryDetailsUseCasePort;
  public readonly browseProductCategoriesUseCase: BrowseProductCategoriesUseCasePort;
  public readonly createProductCategoryUseCase: CreateProductCategoryUseCasePort;
  public readonly updateProductCategoryUseCase: UpdateProductCategoryUseCasePort;
  public readonly reorderProductCategoriesUseCase: ReorderProductCategoriesUseCasePort;
  public readonly createOnlineOrderUseCase: CreateOnlineOrderUseCasePort;
  public readonly browseOrdersUseCase: BrowseOrdersUseCasePort;
  public readonly getOrderDetailsUseCase: GetOrderDetailsUseCasePort;
  public readonly getOnlineOrderQuoteUseCase: GetOnlineOrderQuoteUseCasePort;
  public readonly renewGuestOrderTokenUseCase: RenewGuestOrderTokenUseCasePort;
  public readonly initiateChargeUseCase: InitiateChargeUseCasePort;
  public readonly handlePaymentUseCase: HandlePaymentUseCasePort;
  public readonly getPaymentDetailsUseCase: GetPaymentDetailsUseCasePort;
  public readonly getPaymentsByOrderIdUseCase: GetPaymentsByOrderIdUseCasePort;
  public readonly httpErrorFilter: HTTPErrorFilter;
  public readonly authController: AuthController;
  public readonly userController: UserController;
  public readonly productController: ProductController;
  public readonly productCategoryController: ProductCategoryController;
  public readonly orderController: OrderController;
  public readonly paymentController: PaymentController;
  public readonly healthController: HealthController;

  private constructor() {
    this.appIdentity = new AppIdentityConfig();
    this.prismaDatabaseConfig = new PrismaEnvConfig();
    this.nodemailerTransportConfig = new NodemailerTransportEnvConfig();
    this.midtransConfig = new MidtransEnvConfig();
    this.eventBatchConfig = new EventBatchEnvConfig();
    this.eventQueueProcessorConfig = new EventQueueProcessorEnvConfig();
    this.eventQueueConfig = new EventQueueEnvConfig();
    this.jwtConfig = new JwtEnvConfig();
    this.rateLimitConfig = new RateLimitEnvConfig();
    this.redisConfig = new RedisEnvConfig();
    this.vercelBlobConfig = new VercelBlobEnvConfig();
    this.loginSecurityPolicy = new LoginSecurityPolicyEnvConfig();
    this.passwordResetPolicy = new PasswordResetPolicyEnvConfig();
    this.verificationEmailPolicy = new VerificationEmailPolicyEnvConfig();
    this.sessionPolicy = new SessionPolicyEnvConfig();
    this.storeLocation = new StoreLocationEnvConfig();
    this.deliveryFeePolicy = new DeliveryFeePolicyEnvConfig();
    this.guestOrderManagementPolicy = new GuestOrderManagementPolicyEnvConfig();
    this.orderConstraintPolicy = new OrderConstraintPolicyEnvConfig();
    this.pricingPolicy = new PricingPolicyEnvConfig();
    this.nodeAsyncLocalStorage = new NodeAsyncLocalStorage();
    this.requestContext = new NodeRequestContextAdapter(this.nodeAsyncLocalStorage);
    this.logger = new WinstonLogger(createLogger, this.requestContext);
    this.circuitBreakerFactory = new CircuitBreakerFactory(this.logger);
    this.redisConnection = new RedisConnectionManager(this.redisConfig, this.logger);
    this.dbClient = new PrismaDatabaseClient(this.prismaDatabaseConfig, this.logger, this.circuitBreakerFactory);
    this.requestValidation = new ZodRequestValidation();
    this.distanceCalculator = new HaversineDistanceCalculatorAdapter();
    this.idGenerator = new IdGeneratorAdapter();
    this.fingerprintProvider = new Sha256FingerprintAdapter();
    this.passwordHasher = new BcryptPasswordHasherAdapter();
    this.tokenGenerator = new CryptoTokenGeneratorAdapter();
    this.authTokenIssuer = new JWTAuthTokenIssuerAdapter(this.sessionPolicy, this.jwtConfig);
    this.authTokenVerifier = new JWTAuthTokenVerifierAdapter(this.jwtConfig);
    this.authTokenDecoder = new JwtAuthTokenDecoderAdapter();
    this.emailTemplateFactory = new EmailTemplateFactory(this.appIdentity);
    this.emailClient = new NodemailerEmailClient(this.nodemailerTransportConfig, this.logger);
    this.emailSender = new NodemailerEmailSenderAdapter(this.emailClient, this.emailTemplateFactory);
    this.userRepository = new PrismaUserRepositoryAdapter(this.logger, this.dbClient);
    this.sessionRepository = new PrismaSessionRepositoryAdapter(this.logger, this.dbClient);
    this.applicationTokenRepository = new PrismaApplicationTokenRepositoryAdapter(this.logger, this.dbClient);
    this.productCategoryRepository = new PrismaProductCategoryRepositoryAdapter(this.logger, this.dbClient);
    this.productRepository = new PrismaProductRepositoryAdapter(this.logger, this.dbClient);
    this.orderRepository = new PrismaOrderRepositoryAdapter(this.logger, this.dbClient);
    this.paymentTransactionRepository = new PrismaPaymentTransactionRepositoryAdapter(this.logger, this.dbClient);
    this.userActivityRepository = new PrismaUserActivityRepositoryAdapter(this.logger, this.dbClient);
    this.recordUserActivityHandler = new RecordUserActivityHandler(this.userActivityRepository, this.requestContext, this.logger);
    this.sendEmailHandler = new SendEmailHandler(this.emailSender, this.requestContext, this.userRepository, this.orderRepository, this.logger);
    this.revokeSessionsOnPasswordChangedHandler = new RevokeSessionsOnPasswordChangedHandler(this.sessionRepository, this.logger);
    this.eventHandlerRegistration = new InMemoryEventHandlerRegistry(
      this.recordUserActivityHandler,
      this.sendEmailHandler,
      this.revokeSessionsOnPasswordChangedHandler,
      this.logger,
    );
    this.eventHandlerInvoker = new RetryHandlerInvoker(this.eventHandlerRegistration, () => this.handlerRunner, this.idGenerator);
    this.deadLetterQueue = new PrismaDeadLetterQueueAdapter(this.dbClient, this.eventHandlerInvoker, this.logger);
    this.handlerRunner = new HandlerRunner(this.deadLetterQueue, this.logger);
    this.eventBatcher = new InMemoryEventBatcher(this.eventBatchConfig, this.logger);
    this.eventQueue = new RedisEventQueue(this.redisConnection, this.eventQueueConfig, this.logger);
    this.batchFlushCoordinator = new BatchFlushCoordinator(this.eventBatcher, this.eventQueue);
    this.eventQueueProcessor = new EventQueueProcessor(
      this.eventQueueProcessorConfig,
      this.eventQueue,
      this.eventHandlerRegistration,
      this.handlerRunner,
      this.batchFlushCoordinator,
      this.logger,
    );
    this.eventEnricher = new EventEnricher(this.idGenerator);
    this.eventGrouper = new EventGrouper(this.eventHandlerRegistration, this.logger);
    this.dispatchReporter = new DispatchReporter(this.deadLetterQueue, this.logger);
    this.immediateCriticalStrategy = new ImmediateCriticalStrategy(this.handlerRunner, this.logger);
    this.immediateTolerantStrategy = new ImmediateTolerantStrategy(this.handlerRunner);
    this.queuedBatchStrategy = new QueuedBatchStrategy(this.eventBatcher, this.batchFlushCoordinator);
    this.delayedStrategy = new DelayedStrategy(this.eventQueue);
    this.eventBus = new EventBusAdapter(this.circuitBreakerFactory, this.eventEnricher, this.eventGrouper, this.dispatchReporter, {
      [EventExecutionStrategy.IMMEDIATE_CRITICAL]: this.immediateCriticalStrategy,
      [EventExecutionStrategy.IMMEDIATE_TOLERANT]: this.immediateTolerantStrategy,
      [EventExecutionStrategy.QUEUED_BATCH]: this.queuedBatchStrategy,
      [EventExecutionStrategy.DELAYED]: this.delayedStrategy,
    });
    this.objectStorage = new VercelBlobObjectStorageAdapter(this.vercelBlobConfig, this.logger);
    this.paymentGateway = new MidtransPaymentGatewayAdapter(this.midtransConfig, this.logger);
    this.uow = new PrismaUnitOfWorkAdapter(
      this.dbClient,
      this.userRepository,
      this.sessionRepository,
      this.applicationTokenRepository,
      this.productRepository,
      this.productCategoryRepository,
      this.orderRepository,
      this.paymentTransactionRepository,
    );
    this.apiRateLimit = new RedisApiRateLimit(
      this.rateLimitConfig,
      this.redisConnection,
      this.circuitBreakerFactory,
      this.requestContext,
      this.logger,
    );
    this.sessionFactory = new SessionFactory(
      this.sessionPolicy,
      this.authTokenIssuer,
      this.fingerprintProvider,
      this.idGenerator,
      this.requestContext,
    );
    this.applicationTokenFactory = new ApplicationTokenFactory(
      this.verificationEmailPolicy,
      this.passwordResetPolicy,
      this.guestOrderManagementPolicy,
      this.tokenGenerator,
      this.fingerprintProvider,
      this.idGenerator,
    );
    this.registerUseCase = new RegisterUseCase(
      this.uow,
      this.sessionFactory,
      this.applicationTokenFactory,
      this.passwordHasher,
      this.idGenerator,
      this.eventBus,
      this.logger,
    );
    this.loginUseCase = new LoginUseCase(this.loginSecurityPolicy, this.uow, this.sessionFactory, this.passwordHasher, this.eventBus, this.logger);
    this.refreshSessionUseCase = new RefreshSessionUseCase(
      this.uow,
      this.sessionFactory,
      this.authTokenVerifier,
      this.fingerprintProvider,
      this.eventBus,
      this.requestContext,
      this.logger,
    );
    this.logoutUseCase = new LogoutUseCase(this.uow, this.authTokenVerifier, this.eventBus, this.requestContext, this.logger);
    this.verifyEmailUseCase = new VerifyEmailUseCase(this.uow, this.fingerprintProvider, this.eventBus, this.logger);
    this.resendVerificationEmailUseCase = new ResendVerificationEmailUseCase(
      this.verificationEmailPolicy,
      this.uow,
      this.applicationTokenFactory,
      this.eventBus,
      this.logger,
    );
    this.requestPasswordResetUseCase = new RequestPasswordResetUseCase(
      this.passwordResetPolicy,
      this.uow,
      this.applicationTokenFactory,
      this.eventBus,
      this.logger,
    );
    this.validateResetTokenUseCase = new ValidateResetTokenUseCase(
      this.passwordResetPolicy,
      this.applicationTokenRepository,
      this.fingerprintProvider,
      this.logger,
    );
    this.resetPasswordUseCase = new ResetPasswordUseCase(
      this.passwordResetPolicy,
      this.uow,
      this.passwordHasher,
      this.fingerprintProvider,
      this.eventBus,
      this.logger,
    );
    this.getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(this.userRepository, this.logger);
    this.browseProductsUseCase = new BrowseProductsUseCase(this.productRepository, this.logger);
    this.getProductsByIdsUseCase = new GetProductsByIdsUseCase(this.productRepository, this.logger);
    this.searchProductsUseCase = new SearchProductsUseCase(this.productRepository, this.logger);
    this.getProductDetailUseCase = new GetProductDetailsUseCase(this.productRepository, this.logger);
    this.createProductUseCase = new CreateProductUseCase(this.uow, this.productCategoryRepository, this.idGenerator, this.objectStorage, this.logger);
    this.updateProductUseCase = new UpdateProductUseCase(this.uow, this.logger);
    this.updateProductStockUseCase = new UpdateProductStockUseCase(this.uow, this.logger);
    this.updateProductStatusUseCase = new UpdateProductStatusUseCase(this.uow, this.logger);
    this.updateProductImageUseCase = new UpdateProductImageUseCase(this.uow, this.objectStorage, this.logger);
    this.getProductCategoryDetailUseCase = new GetProductCategoryDetailsUseCase(this.productCategoryRepository, this.logger);
    this.browseProductCategoriesUseCase = new BrowseProductCategoriesUseCase(this.productCategoryRepository, this.logger);
    this.createProductCategoryUseCase = new CreateProductCategoryUseCase(this.uow, this.objectStorage, this.idGenerator, this.logger);
    this.updateProductCategoryUseCase = new UpdateProductCategoryUseCase(this.uow, this.objectStorage, this.logger);
    this.reorderProductCategoriesUseCase = new ReorderProductCategoriesUseCase(this.uow, this.logger);
    this.createOnlineOrderUseCase = new CreateOnlineOrderUseCase(
      this.orderConstraintPolicy,
      this.deliveryFeePolicy,
      this.pricingPolicy,
      this.storeLocation,
      this.uow,
      this.applicationTokenFactory,
      this.idGenerator,
      this.distanceCalculator,
      this.eventBus,
      this.logger,
    );
    this.browseOrdersUseCase = new BrowseOrdersUseCase(this.orderRepository, this.logger);
    this.getOrderDetailsUseCase = new GetOrderDetailsUseCase(
      this.orderRepository,
      this.productRepository,
      this.applicationTokenRepository,
      this.fingerprintProvider,
      this.logger,
    );
    this.getOnlineOrderQuoteUseCase = new GetOnlineOrderQuoteUseCase(
      this.pricingPolicy,
      this.deliveryFeePolicy,
      this.storeLocation,
      this.productRepository,
      this.distanceCalculator,
      this.logger,
    );
    this.renewGuestOrderTokenUseCase = new RenewGuestOrderTokenUseCase(
      this.guestOrderManagementPolicy,
      this.uow,
      this.applicationTokenFactory,
      this.eventBus,
      this.logger,
    );
    this.initiateChargeUseCase = new InitiateChargeUseCase(
      this.uow,
      this.orderRepository,
      this.applicationTokenRepository,
      this.fingerprintProvider,
      this.idGenerator,
      this.paymentGateway,
      this.eventBus,
      this.logger,
    );
    this.handlePaymentUseCase = new HandlePaymentUseCase(this.uow, this.paymentGateway, this.eventBus, this.logger);
    this.getPaymentDetailsUseCase = new GetPaymentDetailsUseCase(
      this.paymentTransactionRepository,
      this.orderRepository,
      this.applicationTokenRepository,
      this.fingerprintProvider,
      this.logger,
    );
    this.getPaymentsByOrderIdUseCase = new GetPaymentsByOrderIdUseCase(
      this.paymentTransactionRepository,
      this.orderRepository,
      this.applicationTokenRepository,
      this.fingerprintProvider,
      this.logger,
    );
    this.httpErrorFilter = new HTTPErrorFilter(this.requestContext, this.logger);
    this.authController = new AuthController(
      this.requestValidation,
      this.registerUseCase,
      this.loginUseCase,
      this.refreshSessionUseCase,
      this.logoutUseCase,
      this.verifyEmailUseCase,
      this.resendVerificationEmailUseCase,
      this.requestPasswordResetUseCase,
      this.validateResetTokenUseCase,
      this.resetPasswordUseCase,
      this.sessionPolicy,
      this.logger,
    );
    this.userController = new UserController(this.getCurrentUserProfileUseCase, this.authTokenVerifier);
    this.productController = new ProductController(
      this.requestValidation,
      this.browseProductsUseCase,
      this.searchProductsUseCase,
      this.getProductsByIdsUseCase,
      this.getProductDetailUseCase,
      this.createProductUseCase,
      this.updateProductUseCase,
      this.updateProductStockUseCase,
      this.updateProductStatusUseCase,
      this.updateProductImageUseCase,
    );
    this.productCategoryController = new ProductCategoryController(
      this.requestValidation,
      this.createProductCategoryUseCase,
      this.updateProductCategoryUseCase,
      this.getProductCategoryDetailUseCase,
      this.browseProductCategoriesUseCase,
      this.reorderProductCategoriesUseCase,
    );
    this.orderController = new OrderController(
      this.requestValidation,
      this.createOnlineOrderUseCase,
      this.browseOrdersUseCase,
      this.getOrderDetailsUseCase,
      this.getOnlineOrderQuoteUseCase,
      this.renewGuestOrderTokenUseCase,
      this.authTokenVerifier,
    );
    this.paymentController = new PaymentController(
      this.requestValidation,
      this.initiateChargeUseCase,
      this.handlePaymentUseCase,
      this.getPaymentDetailsUseCase,
      this.getPaymentsByOrderIdUseCase,
      this.authTokenVerifier,
    );
    this.healthController = new HealthController(this.dbClient, this.redisConnection);
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
}

export const getDIContainer = () => DIContainer.getInstance();
