import { PrismaUnitOfWorkAdapter } from "@/infrastructure/database/prisma-unit-of-work.adapter";
import { DatabaseClient, TransactionContext } from "@/infrastructure/database/database.type";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";
import { UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { User } from "@/domain/entities/user.entity";
import { Session } from "@/domain/entities/session.entity";
import { ApplicationToken } from "@/domain/entities/application-token.entity";
import { Product } from "@/domain/entities/product.entity";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { Expiration } from "@/domain/value-objects/expiration.vo";
import { UserProfile } from "@/domain/value-objects/user-profile.vo";
import { UserStatus } from "@/domain/value-objects/user-status.vo";
import { UserSecurity } from "@/domain/value-objects/user-security.vo";
import { UserRoleType } from "@/domain/types/user.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { UserEmail } from "@/domain/value-objects/user-email.vo";
import { UserPassword } from "@/domain/value-objects/user-password.vo";

jest.mock("@/domain/entities/user.entity");
jest.mock("@/domain/entities/session.entity");
jest.mock("@/domain/entities/application-token.entity");
jest.mock("@/domain/entities/product.entity");
jest.mock("@/domain/entities/product-category.entity");

describe("PrismaUnitOfWorkAdapter", () => {
  let unitOfWork: PrismaUnitOfWorkAdapter;
  let mockDbClient: jest.Mocked<DatabaseClient>;
  let mockUserRepository: jest.Mocked<UserRepositoryPort & { withTransaction: jest.Mock }>;
  let mockSessionRepository: jest.Mocked<SessionRepositoryPort & { withTransaction: jest.Mock }>;
  let mockApplicationTokenRepository: jest.Mocked<ApplicationTokenRepositoryPort & { withTransaction: jest.Mock }>;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort & { withTransaction: jest.Mock }>;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepositoryPort & { withTransaction: jest.Mock }>;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort & { withTransaction: jest.Mock }>;
  let mockPaymentTransactionRepository: jest.Mocked<PaymentTransactionRepositoryPort & { withTransaction: jest.Mock }>;
  let mockTxContext: jest.Mocked<TransactionContext>;

  const createMockUser = (id: string = "user-1"): User => {
    const mockUser = new User(
      id,
      {} as unknown as UserEmail,
      {} as unknown as UserPassword,
      {} as unknown as UserProfile,
      UserRoleType.MEMBER,
      {} as unknown as UserStatus,
      {} as unknown as UserSecurity,
      new Date(),
      new Date(),
    );
    jest.spyOn(mockUser, "getId").mockReturnValue(id);
    return mockUser;
  };

  const createMockSession = (id: string = "session-1"): Session => {
    const mockSession = new Session(
      id,
      "token-hash",
      "token-family",
      "user-1",
      {} as unknown as Expiration,
      null,
      null,
      "Mozilla/5.0",
      "127.0.0.1",
      "device-1",
      new Date(),
      new Date(),
    );
    jest.spyOn(mockSession, "getId").mockReturnValue(id);
    return mockSession;
  };

  const createMockApplicationToken = (): ApplicationToken => {
    return {} as ApplicationToken;
  };

  const createMockOrder = (id: string = "order-1"): Order => {
    return { getId: () => id } as unknown as Order;
  };

  const createMockPaymentTransaction = (id: string = "payment-1"): PaymentTransaction => {
    return { getId: () => id } as unknown as PaymentTransaction;
  };

  const createMockProduct = (id: string = "product-1"): Product => {
    const mockProduct = new Product(
      id,
      "category-1",
      "Test Product",
      "Description",
      {} as unknown as Money,
      ProductType.FOOD,
      null,
      30,
      [],
      100,
      ProductStatus.AVAILABLE,
      new Date(),
      new Date(),
    );
    jest.spyOn(mockProduct, "getId").mockReturnValue(id);
    return mockProduct;
  };

  const createMockProductCategory = (id: string = "category-1"): ProductCategory => {
    const mockCategory = new ProductCategory(id, "Test Category", "Description", null, ProductCategoryStatus.ACTIVE, 1, new Date(), new Date());
    jest.spyOn(mockCategory, "getId").mockReturnValue(id);
    return mockCategory;
  };

  beforeEach(() => {
    mockTxContext = { transaction: jest.fn() } as unknown as jest.Mocked<TransactionContext>;

    mockDbClient = {
      executeInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(mockTxContext);
      }),
    } as unknown as jest.Mocked<DatabaseClient>;

    mockUserRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findById: jest.fn(),
        findByEmail: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockSessionRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findById: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        revokeTokenFamily: jest.fn(),
        revokeAllSessionsForUser: jest.fn(),
      }),
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      revokeTokenFamily: jest.fn(),
      revokeAllSessionsForUser: jest.fn(),
    };

    mockApplicationTokenRepository = {
      withTransaction: jest.fn().mockReturnValue({
        insert: jest.fn(),
        update: jest.fn(),
        invalidateByTypeAndIdentifier: jest.fn(),
        countByTypeAndIdentifierWithin: jest.fn(),
        findByTokenFingerprint: jest.fn(),
        findLastTokenByTypeAndIdentifier: jest.fn(),
      }),
      insert: jest.fn(),
      update: jest.fn(),
      invalidateByTypeAndIdentifier: jest.fn(),
      countByTypeAndIdentifierWithin: jest.fn(),
      findByTokenFingerprint: jest.fn(),
      findLastTokenByTypeAndIdentifier: jest.fn(),
    };

    mockProductRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findDetailById: jest.fn(),
        findById: jest.fn(),
        findByIds: jest.fn(),
        search: jest.fn(),
        browse: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        updateImages: jest.fn(),
        delete: jest.fn(),
      }),
      deductStockForItems: jest.fn(),
      findDetailById: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      search: jest.fn(),
      browse: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateImages: jest.fn(),
      delete: jest.fn(),
    };

    mockProductCategoryRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findById: jest.fn(),
        browse: jest.fn(),
        findAll: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      }),
      getNextSortOrder: jest.fn(),
      findById: jest.fn(),
      browse: jest.fn(),
      findAll: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    };

    mockOrderRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findById: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
      }),
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepositoryPort & { withTransaction: jest.Mock }>;

    mockPaymentTransactionRepository = {
      withTransaction: jest.fn().mockReturnValue({
        findById: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
      }),
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PaymentTransactionRepositoryPort & { withTransaction: jest.Mock }>;

    unitOfWork = new PrismaUnitOfWorkAdapter(
      mockDbClient,
      mockUserRepository,
      mockSessionRepository,
      mockApplicationTokenRepository,
      mockProductRepository,
      mockProductCategoryRepository,
      mockOrderRepository,
      mockPaymentTransactionRepository,
    );
  });

  describe("constructor", () => {
    it("should create an instance with all dependencies", () => {
      expect(unitOfWork).toBeInstanceOf(PrismaUnitOfWorkAdapter);
    });

    it("should accept all repository dependencies", () => {
      const uow = new PrismaUnitOfWorkAdapter(
        mockDbClient,
        mockUserRepository,
        mockSessionRepository,
        mockApplicationTokenRepository,
        mockProductRepository,
        mockProductCategoryRepository,
        mockOrderRepository,
        mockPaymentTransactionRepository,
      );
      expect(uow).toBeInstanceOf(PrismaUnitOfWorkAdapter);
    });
  });

  describe("commit", () => {
    it("should execute operation within a transaction", async () => {
      const mockOperation = jest.fn().mockResolvedValue("result");

      const result = await unitOfWork.commit(mockOperation);

      expect(mockDbClient.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("should provide transactional repositories to the operation", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        expect(repos).toHaveProperty("userRepository");
        expect(repos).toHaveProperty("sessionRepository");
        expect(repos).toHaveProperty("applicationTokenRepository");
        expect(repos).toHaveProperty("productCategoryRepository");
        expect(repos).toHaveProperty("productRepository");
        expect(repos).toHaveProperty("orderRepository");
        expect(repos).toHaveProperty("paymentTransactionRepository");
        return "success";
      });

      await unitOfWork.commit(mockOperation);

      expect(mockOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          userRepository: expect.any(Object),
          sessionRepository: expect.any(Object),
          applicationTokenRepository: expect.any(Object),
          productCategoryRepository: expect.any(Object),
          productRepository: expect.any(Object),
          orderRepository: expect.any(Object),
          paymentTransactionRepository: expect.any(Object),
        }),
      );
    });

    it("should call withTransaction on each repository with the transaction context", async () => {
      await unitOfWork.commit(async () => "success");

      expect(mockUserRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockSessionRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockApplicationTokenRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockProductCategoryRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockProductRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockOrderRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
      expect(mockPaymentTransactionRepository.withTransaction).toHaveBeenCalledWith(mockTxContext);
    });

    it("should return the operation result", async () => {
      const expectedResult = { data: "test", status: 200 };
      const mockOperation = jest.fn().mockResolvedValue(expectedResult);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe(expectedResult);
    });

    it("should handle successful operation with multiple repository interactions", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(mockUser);
        await repos.sessionRepository.insert(mockSession);
        return { user: mockUser, session: mockSession };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it("should rollback transaction on error", async () => {
      const error = new Error("Operation failed");
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(unitOfWork.commit(mockOperation)).rejects.toThrow("Operation failed");
      expect(mockDbClient.executeInTransaction).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from repository operations", async () => {
      const error = new Error("Repository error");
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(createMockUser());
        throw error;
      });

      await expect(unitOfWork.commit(mockOperation)).rejects.toThrow("Repository error");
    });

    it("should handle multiple repository operations in sequence", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();
      const mockToken = createMockApplicationToken();
      const mockProduct = createMockProduct();
      const mockCategory = createMockProductCategory();

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(mockUser);
        await repos.sessionRepository.insert(mockSession);
        await repos.applicationTokenRepository.insert(mockToken);
        await repos.productCategoryRepository.insert(mockCategory);
        await repos.productRepository.insert(mockProduct);
        return "all inserted";
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe("all inserted");
    });

    it("should handle nested operations", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const user = createMockUser();
        await repos.userRepository.insert(user);

        const innerOperation = async (innerRepos: UnitOfWorkRepositories) => {
          const session = createMockSession();
          await innerRepos.sessionRepository.insert(session);
          return "inner done";
        };

        return await unitOfWork.commit(innerOperation);
      });

      await expect(unitOfWork.commit(mockOperation)).resolves.toBe("inner done");
    });

    it("should handle null/undefined operation result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(undefined);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBeUndefined();
      expect(mockDbClient.executeInTransaction).toHaveBeenCalledTimes(1);
    });

    it("should handle primitive operation results", async () => {
      const mockOperation = jest.fn().mockResolvedValue(42);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe(42);
    });

    it("should handle array operation results", async () => {
      const expectedArray = [1, 2, 3, 4, 5];
      const mockOperation = jest.fn().mockResolvedValue(expectedArray);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual(expectedArray);
    });

    it("should handle object operation results with nested properties", async () => {
      const expectedObject = {
        user: createMockUser(),
        session: createMockSession(),
        metadata: { timestamp: new Date() },
      };
      const mockOperation = jest.fn().mockResolvedValue(expectedObject);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual(expectedObject);
    });
  });

  describe("transactional repositories", () => {
    it("should provide transactional user repository with all methods", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txUserRepo = repos.userRepository;
        expect(txUserRepo.findById).toBeDefined();
        expect(txUserRepo.findByEmail).toBeDefined();
        expect(txUserRepo.insert).toBeDefined();
        expect(txUserRepo.update).toBeDefined();
        expect(txUserRepo.delete).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional session repository with all methods", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txSessionRepo = repos.sessionRepository;
        expect(txSessionRepo.findById).toBeDefined();
        expect(txSessionRepo.insert).toBeDefined();
        expect(txSessionRepo.update).toBeDefined();
        expect(txSessionRepo.revokeTokenFamily).toBeDefined();
        expect(txSessionRepo.revokeAllSessionsForUser).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional application token repository with all methods", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txTokenRepo = repos.applicationTokenRepository;
        expect(txTokenRepo.insert).toBeDefined();
        expect(txTokenRepo.update).toBeDefined();
        expect(txTokenRepo.invalidateByTypeAndIdentifier).toBeDefined();
        expect(txTokenRepo.countByTypeAndIdentifierWithin).toBeDefined();
        expect(txTokenRepo.findByTokenFingerprint).toBeDefined();
        expect(txTokenRepo.findLastTokenByTypeAndIdentifier).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional product category repository with all methods", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txCategoryRepo = repos.productCategoryRepository;
        expect(txCategoryRepo.findById).toBeDefined();
        expect(txCategoryRepo.browse).toBeDefined();
        expect(txCategoryRepo.findAll).toBeDefined();
        expect(txCategoryRepo.insert).toBeDefined();
        expect(txCategoryRepo.update).toBeDefined();
        expect(txCategoryRepo.updateMany).toBeDefined();
        expect(txCategoryRepo.delete).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional product repository with all methods", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txProductRepo = repos.productRepository;
        expect(txProductRepo.findDetailById).toBeDefined();
        expect(txProductRepo.findById).toBeDefined();
        expect(txProductRepo.findByIds).toBeDefined();
        expect(txProductRepo.search).toBeDefined();
        expect(txProductRepo.browse).toBeDefined();
        expect(txProductRepo.insert).toBeDefined();
        expect(txProductRepo.update).toBeDefined();
        expect(txProductRepo.updateImages).toBeDefined();
        expect(txProductRepo.delete).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional order repository", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txOrderRepo = repos.orderRepository;
        expect(txOrderRepo.findById).toBeDefined();
        expect(txOrderRepo.insert).toBeDefined();
        expect(txOrderRepo.update).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });

    it("should provide transactional payment transaction repository", async () => {
      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        const txPaymentRepo = repos.paymentTransactionRepository;
        expect(txPaymentRepo.findById).toBeDefined();
        expect(txPaymentRepo.insert).toBeDefined();
        expect(txPaymentRepo.update).toBeDefined();
        return "success";
      });

      await unitOfWork.commit(mockOperation);
    });
  });

  describe("error scenarios", () => {
    it("should propagate database transaction errors", async () => {
      const dbError = new Error("Database transaction failed");
      mockDbClient.executeInTransaction.mockRejectedValue(dbError);

      const mockOperation = jest.fn().mockResolvedValue("success");

      await expect(unitOfWork.commit(mockOperation)).rejects.toThrow("Database transaction failed");
    });

    it("should handle operation that throws non-Error object", async () => {
      const mockOperation = jest.fn().mockRejectedValue("string error");

      await expect(unitOfWork.commit(mockOperation)).rejects.toBe("string error");
    });

    it("should handle operation that throws null", async () => {
      const mockOperation = jest.fn().mockRejectedValue(null);

      await expect(unitOfWork.commit(mockOperation)).rejects.toBeNull();
    });

    it("should handle operation that throws undefined", async () => {
      const mockOperation = jest.fn().mockRejectedValue(undefined);

      await expect(unitOfWork.commit(mockOperation)).rejects.toBeUndefined();
    });

    it("should handle repository withTransaction throwing error", async () => {
      mockUserRepository.withTransaction.mockImplementation(() => {
        throw new Error("withTransaction failed");
      });

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(createMockUser());
        return "success";
      });

      await expect(unitOfWork.commit(mockOperation)).rejects.toThrow("withTransaction failed");
    });

    it("should handle multiple repository failures", async () => {
      const error1 = new Error("User repository error");
      const error2 = new Error("Session repository error");

      let callCount = 0;
      mockUserRepository.withTransaction.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          throw error1;
        }
        return {
          insert: jest.fn().mockRejectedValue(error2),
        };
      });

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(createMockUser());
        await repos.sessionRepository.insert(createMockSession());
        return "success";
      });

      await expect(unitOfWork.commit(mockOperation)).rejects.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty operation", async () => {
      const mockOperation = jest.fn().mockResolvedValue(undefined);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBeUndefined();
    });

    it("should handle operation that returns Promise", async () => {
      const mockOperation = jest.fn().mockReturnValue(Promise.resolve("promise result"));

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe("promise result");
    });

    it("should handle transaction context being reused", async () => {
      let capturedContext: TransactionContext;

      mockDbClient.executeInTransaction.mockImplementation(async (callback) => {
        const context = { id: "tx-1" } as TransactionContext;
        capturedContext = context;
        return await callback(context);
      });

      await unitOfWork.commit(async (repos: UnitOfWorkRepositories) => {
        expect(mockUserRepository.withTransaction).toHaveBeenCalledWith(capturedContext);

        await repos.userRepository.insert(createMockUser());
        return "success";
      });
    });

    it("should handle large number of repository operations", async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        user: createMockUser(`user-${i}`),
        session: createMockSession(`session-${i}`),
      }));

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        for (const op of operations) {
          await repos.userRepository.insert(op.user);
          await repos.sessionRepository.insert(op.session);
        }
        return operations.length;
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe(100);
    });

    it("should handle circular references in operation result", async () => {
      const circularObj = { name: "test" } as unknown as { self: typeof circularObj };
      circularObj.self = circularObj;

      const mockOperation = jest.fn().mockResolvedValue(circularObj);

      const result = (await unitOfWork.commit(mockOperation)) as unknown as typeof circularObj;

      expect(result).toBe(circularObj);
      expect(result.self).toBe(result);
    });

    it("should handle symbols in operation result", async () => {
      const symbol = Symbol("test");
      const mockOperation = jest.fn().mockResolvedValue(symbol);

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe(symbol);
    });
  });

  describe("integration-like scenarios", () => {
    it("should handle user creation with session creation in same transaction", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      const txUserRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockUser),
        findByEmail: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const txSessionRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockSession),
        update: jest.fn(),
        revokeTokenFamily: jest.fn(),
        revokeAllSessionsForUser: jest.fn(),
      };

      mockUserRepository.withTransaction.mockReturnValue(txUserRepo);
      mockSessionRepository.withTransaction.mockReturnValue(txSessionRepo);

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.userRepository.insert(mockUser);
        const foundUser = await repos.userRepository.findById(mockUser.getId());
        await repos.sessionRepository.insert(mockSession);
        const foundSession = await repos.sessionRepository.findById(mockSession.getId());
        return { user: foundUser, session: foundSession };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it("should handle product with category creation in same transaction", async () => {
      const mockCategory = createMockProductCategory();
      const mockProduct = createMockProduct();

      const txCategoryRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockCategory),
        browse: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      };

      const txProductRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockProduct),
        findByIds: jest.fn().mockResolvedValue([mockProduct]),
        findDetailById: jest.fn(),
        search: jest.fn(),
        browse: jest.fn(),
        update: jest.fn(),
        updateImages: jest.fn(),
        delete: jest.fn(),
      };

      mockProductCategoryRepository.withTransaction.mockReturnValue(txCategoryRepo);
      mockProductRepository.withTransaction.mockReturnValue(txProductRepo);

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.productCategoryRepository.insert(mockCategory);
        await repos.productRepository.insert(mockProduct);
        const foundCategory = await repos.productCategoryRepository.findById(mockCategory.getId());
        const foundProduct = await repos.productRepository.findById(mockProduct.getId());
        return { category: foundCategory, product: foundProduct };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ category: mockCategory, product: mockProduct });
    });

    it("should handle order creation with payment charge initiation in same transaction", async () => {
      const mockOrder = createMockOrder();
      const mockPayment = createMockPaymentTransaction();

      const txOrderRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn(),
      };

      const txPaymentRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(mockPayment),
        update: jest.fn(),
      };

      mockOrderRepository.withTransaction.mockReturnValue(txOrderRepo);
      mockPaymentTransactionRepository.withTransaction.mockReturnValue(txPaymentRepo);

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.orderRepository.insert(mockOrder);
        await repos.paymentTransactionRepository.insert(mockPayment);
        const foundOrder = await repos.orderRepository.findById(mockOrder.getId());
        const foundPayment = await repos.paymentTransactionRepository.findById(mockPayment.getId());
        return { order: foundOrder, payment: foundPayment };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ order: mockOrder, payment: mockPayment });
      expect(txOrderRepo.insert).toHaveBeenCalledWith(mockOrder);
      expect(txPaymentRepo.insert).toHaveBeenCalledWith(mockPayment);
    });

    it("should handle a refund transaction alongside an order status update in the same transaction", async () => {
      const mockOrder = createMockOrder();
      const mockRefund = createMockPaymentTransaction("refund-1");

      const txOrderRepo = {
        insert: jest.fn(),
        findById: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const txPaymentRepo = {
        insert: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn(),
        update: jest.fn(),
      };

      mockOrderRepository.withTransaction.mockReturnValue(txOrderRepo);
      mockPaymentTransactionRepository.withTransaction.mockReturnValue(txPaymentRepo);

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.orderRepository.update(mockOrder);
        await repos.paymentTransactionRepository.insert(mockRefund);
        return "refunded";
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toBe("refunded");
      expect(txOrderRepo.update).toHaveBeenCalledWith(mockOrder);
      expect(txPaymentRepo.insert).toHaveBeenCalledWith(mockRefund);
    });

    it("should handle application token with session revocation in same transaction", async () => {
      const mockToken = createMockApplicationToken();
      const mockSession = createMockSession();

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        await repos.applicationTokenRepository.insert(mockToken);
        await repos.sessionRepository.revokeTokenFamily(mockSession.getTokenFamily(), "Token revoked");
        return { token: mockToken, session: mockSession };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ token: mockToken, session: mockSession });
    });

    it("should handle batch operations across multiple repositories", async () => {
      const users = Array.from({ length: 5 }, (_, i) => createMockUser(`user-${i}`));
      const categories = Array.from({ length: 3 }, (_, i) => createMockProductCategory(`category-${i}`));
      const products = Array.from({ length: 10 }, (_, i) => createMockProduct(`product-${i}`));

      const mockOperation = jest.fn().mockImplementation(async (repos: UnitOfWorkRepositories) => {
        for (const user of users) {
          await repos.userRepository.insert(user);
        }
        for (const category of categories) {
          await repos.productCategoryRepository.insert(category);
        }
        for (const product of products) {
          await repos.productRepository.insert(product);
        }
        return { userCount: users.length, categoryCount: categories.length, productCount: products.length };
      });

      const result = await unitOfWork.commit(mockOperation);

      expect(result).toEqual({ userCount: 5, categoryCount: 3, productCount: 10 });
    });
  });
});
