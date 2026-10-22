import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { User } from "@/domain/entities/user.entity";
import { Order } from "@/domain/entities/order.entity";
import { GuestOrderManagementToken, PasswordResetToken, VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { TokenGeneratorPort } from "@/application/ports/driven/token-generator.port";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { TimeUtil } from "@/utils/time.util";
import { VerificationEmailPolicy } from "@/domain/policies/verification-email.policy";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { GuestOrderManagementPolicy } from "@/domain/policies/guest-order-management.policy";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { OrderCustomer } from "@/domain/value-objects/order-customer.vo";
import { DeliveryType, OrderCustomerType, OrderStatus, OrderType } from "@/domain/types/order.type";
import { PaymentStatus } from "@/domain/types/payment-transaction.type";

jest.mock("@/utils/time.util");

describe("ApplicationTokenFactory", () => {
  let applicationTokenFactory: ApplicationTokenFactory;
  let mockVerificationEmailPolicy: jest.Mocked<VerificationEmailPolicy>;
  let mockPasswordResetPolicy: jest.Mocked<PasswordResetPolicy>;
  let mockGuestOrderManagementPolicy: jest.Mocked<GuestOrderManagementPolicy>;
  let mockTokenGenerator: jest.Mocked<TokenGeneratorPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockIdGenerator: jest.Mocked<IdGeneratorPort>;
  let mockUser: jest.Mocked<User>;
  let mockOrder: jest.Mocked<Order>;

  const mockRawToken = "raw-secure-token-123";
  const mockTokenFingerprint = "fingerprint-456";
  const mockTokenId = "token-id-789";
  const mockUserId = "user-123";
  const mockEmail = "user@example.com";
  const mockOrderId = "order-123";
  const mockExpiryInHours = 24;
  const mockExpiryInMinutes = 15;
  const mockTokenExpiryInHours = 72;

  const createMockOrder = (isGuest: boolean = true, guestEmail: string | null = mockEmail): Order => {
    const now = new Date();
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: isGuest ? OrderCustomerType.GUEST : OrderCustomerType.MEMBER,
        memberId: isGuest ? null : "member-123",
        guestName: isGuest ? "John Doe" : null,
        guestEmail: isGuest ? guestEmail : null,
      },
      type: OrderType.ONLINE,
      fulfillment: {
        type: OrderType.ONLINE,
        dineIn: null,
        online: {
          deliveryType: DeliveryType.PICKUP,
          deliveryLocation: null,
          scheduledAt: null,
        },
        reservation: null,
      },
      items: [
        {
          productId: "product-123",
          productName: "Product 1",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
        },
      ],
      pricing: {
        subtotal: 200000,
        tax: 20000,
        serviceCharge: 10000,
        deliveryFee: 0,
        discount: 0,
        total: 230000,
      },
      payment: {
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      },
      status: OrderStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));

    mockVerificationEmailPolicy = {
      expiryInHours: mockExpiryInHours,
    } as jest.Mocked<VerificationEmailPolicy>;

    mockPasswordResetPolicy = {
      expiryInMinutes: mockExpiryInMinutes,
    } as jest.Mocked<PasswordResetPolicy>;

    mockGuestOrderManagementPolicy = {
      tokenExpiryInHours: mockTokenExpiryInHours,
      maxResendAttemptsPerHour: 3,
      resendCooldownInSeconds: 60,
    } as jest.Mocked<GuestOrderManagementPolicy>;

    mockTokenGenerator = {
      generate: jest.fn().mockReturnValue(mockRawToken),
    } as jest.Mocked<TokenGeneratorPort>;

    mockFingerprintProvider = {
      fingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      compareFingerprint: jest.fn(),
    } as jest.Mocked<FingerprintPort>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockTokenId),
    } as jest.Mocked<IdGeneratorPort>;

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
    } as unknown as jest.Mocked<User>;

    mockOrder = createMockOrder(true) as unknown as jest.Mocked<Order>;
    mockOrder.getId = jest.fn().mockReturnValue(mockOrderId);
    mockOrder.getCustomer = jest.fn().mockReturnValue({
      isGuest: jest.fn().mockReturnValue(true),
      getGuestEmail: jest.fn().mockReturnValue(mockEmail),
    } as unknown as jest.Mocked<OrderCustomer>);

    (TimeUtil.hoursToMs as jest.Mock).mockImplementation((hours: number) => hours * 60 * 60 * 1000);
    (TimeUtil.minutesToMs as jest.Mock).mockImplementation((minutes: number) => minutes * 60 * 1000);

    applicationTokenFactory = new ApplicationTokenFactory(
      mockVerificationEmailPolicy,
      mockPasswordResetPolicy,
      mockGuestOrderManagementPolicy,
      mockTokenGenerator,
      mockFingerprintProvider,
      mockIdGenerator,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Constructor", () => {
    it("should initialize with all dependencies", () => {
      expect(applicationTokenFactory).toBeInstanceOf(ApplicationTokenFactory);
    });

    it("should accept all required dependencies", () => {
      const factory = new ApplicationTokenFactory(
        mockVerificationEmailPolicy,
        mockPasswordResetPolicy,
        mockGuestOrderManagementPolicy,
        mockTokenGenerator,
        mockFingerprintProvider,
        mockIdGenerator,
      );

      expect(factory).toBeInstanceOf(ApplicationTokenFactory);
    });
  });

  describe("issueVerificationEmail", () => {
    let result: VerificationEmailToken;

    beforeEach(() => {
      result = applicationTokenFactory.issueVerificationEmail(mockUser);
    });

    it("should generate a secure token", () => {
      expect(mockTokenGenerator.generate).toHaveBeenCalled();
    });

    it("should fingerprint the token", () => {
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRawToken);
    });

    it("should generate a token ID", () => {
      expect(mockIdGenerator.generate).toHaveBeenCalled();
    });

    it("should create a VerificationEmailToken with correct data", () => {
      expect(result).toBeInstanceOf(VerificationEmailToken);
      expect(result.getId()).toBe(mockTokenId);
      expect(result.getTokenFingerprint()).toBe(mockTokenFingerprint);
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getUserId()).toBe(mockUserId);
      expect(result.getType()).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
    });

    it("should calculate correct expiration date", () => {
      const expectedExpiry = new Date(Date.now() + mockExpiryInHours * 60 * 60 * 1000);
      expect(result.getExpiresAt().getTime()).toBe(expectedExpiry.getTime());
    });

    it("should use TimeUtil.hoursToMs for expiration calculation", () => {
      expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(mockExpiryInHours);
    });

    it("should return token with active status", () => {
      expect(result.getTokenStatus()).toBe("active");
    });

    it("should return token with null usedAt", () => {
      expect(result.getUsedAt()).toBeNull();
    });

    it("should have createdAt and updatedAt set", () => {
      expect(result.getCreatedAt()).toBeInstanceOf(Date);
      expect(result.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it("should emit VerificationEmailTokenIssuedEvent", () => {
      const events = result.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("VERIFICATION_EMAIL_TOKEN_ISSUED");
    });

    it("should have correct token metadata", () => {
      const metadata = result.getTokenMetadata();
      expect(metadata).toEqual({
        type: ApplicationTokenType.VERIFICATION_EMAIL,
        tokenId: mockTokenId,
        userId: mockUserId,
        identifier: mockEmail,
      });
    });
  });

  describe("reissueVerificationEmail", () => {
    let result: VerificationEmailToken;

    beforeEach(() => {
      result = applicationTokenFactory.reissueVerificationEmail(mockUser);
    });

    it("should generate a secure token", () => {
      expect(mockTokenGenerator.generate).toHaveBeenCalled();
    });

    it("should fingerprint the token", () => {
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRawToken);
    });

    it("should generate a token ID", () => {
      expect(mockIdGenerator.generate).toHaveBeenCalled();
    });

    it("should create a VerificationEmailToken with correct data", () => {
      expect(result).toBeInstanceOf(VerificationEmailToken);
      expect(result.getId()).toBe(mockTokenId);
      expect(result.getTokenFingerprint()).toBe(mockTokenFingerprint);
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getUserId()).toBe(mockUserId);
      expect(result.getType()).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
    });

    it("should emit VerificationEmailTokenReissuedEvent", () => {
      const events = result.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("VERIFICATION_EMAIL_TOKEN_REISSUED");
    });
  });

  describe("issuePasswordReset", () => {
    let result: PasswordResetToken;

    beforeEach(() => {
      result = applicationTokenFactory.issuePasswordReset(mockUser);
    });

    it("should generate a secure token", () => {
      expect(mockTokenGenerator.generate).toHaveBeenCalled();
    });

    it("should fingerprint the token", () => {
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRawToken);
    });

    it("should generate a token ID", () => {
      expect(mockIdGenerator.generate).toHaveBeenCalled();
    });

    it("should create a PasswordResetToken with correct data", () => {
      expect(result).toBeInstanceOf(PasswordResetToken);
      expect(result.getId()).toBe(mockTokenId);
      expect(result.getTokenFingerprint()).toBe(mockTokenFingerprint);
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getUserId()).toBe(mockUserId);
      expect(result.getType()).toBe(ApplicationTokenType.PASSWORD_RESET);
    });

    it("should calculate correct expiration date", () => {
      const expectedExpiry = new Date(Date.now() + mockExpiryInMinutes * 60 * 1000);
      expect(result.getExpiresAt().getTime()).toBe(expectedExpiry.getTime());
    });

    it("should use TimeUtil.minutesToMs for expiration calculation", () => {
      expect(TimeUtil.minutesToMs).toHaveBeenCalledWith(mockExpiryInMinutes);
    });

    it("should return token with active status", () => {
      expect(result.getTokenStatus()).toBe("active");
    });

    it("should return token with null usedAt", () => {
      expect(result.getUsedAt()).toBeNull();
    });

    it("should have createdAt and updatedAt set", () => {
      expect(result.getCreatedAt()).toBeInstanceOf(Date);
      expect(result.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it("should emit PasswordResetTokenIssuedEvent", () => {
      const events = result.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("PASSWORD_RESET_TOKEN_ISSUED");
    });

    it("should have correct token metadata", () => {
      const metadata = result.getTokenMetadata();
      expect(metadata).toEqual({
        type: ApplicationTokenType.PASSWORD_RESET,
        tokenId: mockTokenId,
        userId: mockUserId,
        identifier: mockEmail,
      });
    });
  });

  describe("issueGuestOrderManagement", () => {
    let result: GuestOrderManagementToken;

    describe("with valid guest order", () => {
      beforeEach(() => {
        result = applicationTokenFactory.issueGuestOrderManagement(mockOrder);
      });

      it("should generate a secure token", () => {
        expect(mockTokenGenerator.generate).toHaveBeenCalled();
      });

      it("should fingerprint the token", () => {
        expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRawToken);
      });

      it("should generate a token ID", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalled();
      });

      it("should create a GuestOrderManagementToken with correct data", () => {
        expect(result).toBeInstanceOf(GuestOrderManagementToken);
        expect(result.getId()).toBe(mockTokenId);
        expect(result.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(result.getIdentifier()).toBe(mockEmail);
        expect(result.getOrderId()).toBe(mockOrderId);
        expect(result.getType()).toBe(ApplicationTokenType.GUEST_ORDER_MANAGEMENT);
      });

      it("should calculate correct expiration date using guest order management policy", () => {
        const expectedExpiry = new Date(Date.now() + mockTokenExpiryInHours * 60 * 60 * 1000);
        expect(result.getExpiresAt().getTime()).toBe(expectedExpiry.getTime());
      });

      it("should use TimeUtil.hoursToMs for expiration calculation", () => {
        expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(mockTokenExpiryInHours);
      });

      it("should return token with active status", () => {
        expect(result.getTokenStatus()).toBe("active");
      });

      it("should return token with null usedAt", () => {
        expect(result.getUsedAt()).toBeNull();
      });

      it("should have createdAt and updatedAt set", () => {
        expect(result.getCreatedAt()).toBeInstanceOf(Date);
        expect(result.getUpdatedAt()).toBeInstanceOf(Date);
      });

      it("should emit GuestOrderManagementTokenIssuedEvent", () => {
        const events = result.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED");
      });

      it("should have correct token metadata", () => {
        const metadata = result.getTokenMetadata();
        expect(metadata).toEqual({
          type: ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
          tokenId: mockTokenId,
          orderId: mockOrderId,
          identifier: mockEmail,
        });
      });
    });

    it("should throw error when order is not a guest order", () => {
      const memberOrder = createMockOrder(false) as unknown as jest.Mocked<Order>;
      memberOrder.getId = jest.fn().mockReturnValue(mockOrderId);
      memberOrder.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(false),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      expect(() => applicationTokenFactory.issueGuestOrderManagement(memberOrder)).toThrow(
        "Guest order management token can only be created for a guest order",
      );
    });

    it("should handle order with null guest email by creating token with null identifier", () => {
      const orderWithoutEmail = createMockOrder(true, null) as unknown as jest.Mocked<Order>;
      orderWithoutEmail.getId = jest.fn().mockReturnValue(mockOrderId);
      orderWithoutEmail.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(true),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      const result = applicationTokenFactory.issueGuestOrderManagement(orderWithoutEmail);

      expect(result).toBeInstanceOf(GuestOrderManagementToken);
      expect(result.getIdentifier()).toBeNull();
    });
  });

  describe("reissueGuestOrderManagement", () => {
    let result: GuestOrderManagementToken;

    describe("with valid guest order", () => {
      beforeEach(() => {
        result = applicationTokenFactory.reissueGuestOrderManagement(mockOrder);
      });

      it("should generate a secure token", () => {
        expect(mockTokenGenerator.generate).toHaveBeenCalled();
      });

      it("should fingerprint the token", () => {
        expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRawToken);
      });

      it("should generate a token ID", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalled();
      });

      it("should create a GuestOrderManagementToken with correct data", () => {
        expect(result).toBeInstanceOf(GuestOrderManagementToken);
        expect(result.getId()).toBe(mockTokenId);
        expect(result.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(result.getIdentifier()).toBe(mockEmail);
        expect(result.getOrderId()).toBe(mockOrderId);
        expect(result.getType()).toBe(ApplicationTokenType.GUEST_ORDER_MANAGEMENT);
      });

      it("should emit GuestOrderManagementTokenReissuedEvent", () => {
        const events = result.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED");
      });
    });

    it("should throw error when order is not a guest order", () => {
      const memberOrder = createMockOrder(false) as unknown as jest.Mocked<Order>;
      memberOrder.getId = jest.fn().mockReturnValue(mockOrderId);
      memberOrder.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(false),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      expect(() => applicationTokenFactory.reissueGuestOrderManagement(memberOrder)).toThrow(
        "Guest order management token can only be created for a guest order",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle user with empty email for verification email", () => {
      mockUser.getEmail.mockReturnValue("");

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result.getIdentifier()).toBe("");
    });

    it("should handle user with empty email for password reset", () => {
      mockUser.getEmail.mockReturnValue("");

      const result = applicationTokenFactory.issuePasswordReset(mockUser);

      expect(result.getIdentifier()).toBe("");
    });

    it("should handle user with undefined email for verification email", () => {
      mockUser.getEmail.mockReturnValue(undefined as unknown as string);

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result.getIdentifier()).toBeUndefined();
    });

    it("should handle user with null email for verification email", () => {
      mockUser.getEmail.mockReturnValue(null as unknown as string);

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result.getIdentifier()).toBeNull();
    });

    it("should handle zero expiry hours for verification email", () => {
      mockVerificationEmailPolicy.expiryInHours = 0;

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result.getExpiresAt().getTime()).toBe(Date.now());
    });

    it("should handle zero expiry minutes for password reset", () => {
      mockPasswordResetPolicy.expiryInMinutes = 0;

      const result = applicationTokenFactory.issuePasswordReset(mockUser);

      expect(result.getExpiresAt().getTime()).toBe(Date.now());
    });

    it("should handle zero expiry hours for guest order management", () => {
      mockGuestOrderManagementPolicy.tokenExpiryInHours = 0;

      const result = applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(result.getExpiresAt().getTime()).toBe(Date.now());
    });

    it("should handle very large expiry values", () => {
      const largeExpiry = 9999;
      mockVerificationEmailPolicy.expiryInHours = largeExpiry;

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result.getExpiresAt().getTime()).toBe(Date.now() + largeExpiry * 60 * 60 * 1000);
    });

    it("should handle guest order with empty guest email", () => {
      const orderWithEmptyEmail = createMockOrder(true, "") as unknown as jest.Mocked<Order>;
      orderWithEmptyEmail.getId = jest.fn().mockReturnValue(mockOrderId);
      orderWithEmptyEmail.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(true),
        getGuestEmail: jest.fn().mockReturnValue(""),
      } as unknown as jest.Mocked<OrderCustomer>);

      const result = applicationTokenFactory.issueGuestOrderManagement(orderWithEmptyEmail);

      expect(result.getIdentifier()).toBe("");
    });
  });

  describe("error handling", () => {
    it("should throw if token generator fails for verification email", () => {
      const error = new Error("Token generation failed");
      mockTokenGenerator.generate.mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issueVerificationEmail(mockUser)).toThrow("Token generation failed");
    });

    it("should throw if token generator fails for password reset", () => {
      const error = new Error("Token generation failed");
      mockTokenGenerator.generate.mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issuePasswordReset(mockUser)).toThrow("Token generation failed");
    });

    it("should throw if fingerprint provider fails for verification email", () => {
      const error = new Error("Fingerprint generation failed");
      mockFingerprintProvider.fingerprint.mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issueVerificationEmail(mockUser)).toThrow("Fingerprint generation failed");
    });

    it("should throw if ID generator fails for password reset", () => {
      const error = new Error("ID generation failed");
      mockIdGenerator.generate.mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issuePasswordReset(mockUser)).toThrow("ID generation failed");
    });

    it("should throw if TimeUtil fails for verification email", () => {
      const error = new Error("Time calculation failed");
      (TimeUtil.hoursToMs as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issueVerificationEmail(mockUser)).toThrow("Time calculation failed");
    });

    it("should throw if TimeUtil fails for guest order management", () => {
      const error = new Error("Time calculation failed");
      (TimeUtil.hoursToMs as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => applicationTokenFactory.issueGuestOrderManagement(mockOrder)).toThrow("Time calculation failed");
    });
  });

  describe("token uniqueness", () => {
    it("should generate different tokens for multiple verification email calls", () => {
      mockTokenGenerator.generate.mockReturnValueOnce("token-1").mockReturnValueOnce("token-2");
      mockFingerprintProvider.fingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");
      mockIdGenerator.generate.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      const result1 = applicationTokenFactory.issueVerificationEmail(mockUser);
      const result2 = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result1.getId()).not.toBe(result2.getId());
      expect(result1.getTokenFingerprint()).not.toBe(result2.getTokenFingerprint());
    });

    it("should generate different tokens for multiple password reset calls", () => {
      mockTokenGenerator.generate.mockReturnValueOnce("token-1").mockReturnValueOnce("token-2");
      mockFingerprintProvider.fingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");
      mockIdGenerator.generate.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      const result1 = applicationTokenFactory.issuePasswordReset(mockUser);
      const result2 = applicationTokenFactory.issuePasswordReset(mockUser);

      expect(result1.getId()).not.toBe(result2.getId());
      expect(result1.getTokenFingerprint()).not.toBe(result2.getTokenFingerprint());
    });

    it("should generate different tokens for multiple guest order management calls", () => {
      mockTokenGenerator.generate.mockReturnValueOnce("token-1").mockReturnValueOnce("token-2");
      mockFingerprintProvider.fingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");
      mockIdGenerator.generate.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      const result1 = applicationTokenFactory.issueGuestOrderManagement(mockOrder);
      const result2 = applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(result1.getId()).not.toBe(result2.getId());
      expect(result1.getTokenFingerprint()).not.toBe(result2.getTokenFingerprint());
    });
  });

  describe("timestamp behavior", () => {
    it("should use current time for createdAt and updatedAt", () => {
      const before = new Date();
      const result = applicationTokenFactory.issueVerificationEmail(mockUser);
      const after = new Date();

      expect(result.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getUpdatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should set expiresAt correctly for verification email based on policy", () => {
      const now = new Date("2024-01-01T10:00:00.000Z");
      jest.setSystemTime(now);

      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      const expectedExpiry = new Date(now.getTime() + mockExpiryInHours * 60 * 60 * 1000);
      expect(result.getExpiresAt().getTime()).toBe(expectedExpiry.getTime());
    });

    it("should set expiresAt correctly for guest order management based on policy", () => {
      const now = new Date("2024-01-01T10:00:00.000Z");
      jest.setSystemTime(now);

      const result = applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      const expectedExpiry = new Date(now.getTime() + mockTokenExpiryInHours * 60 * 60 * 1000);
      expect(result.getExpiresAt().getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe("policy configuration", () => {
    it("should use verification email policy expiry", () => {
      const customExpiry = 48;
      mockVerificationEmailPolicy.expiryInHours = customExpiry;
      applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(customExpiry);
    });

    it("should use password reset policy expiry", () => {
      const customExpiry = 30;
      mockPasswordResetPolicy.expiryInMinutes = customExpiry;
      applicationTokenFactory.issuePasswordReset(mockUser);

      expect(TimeUtil.minutesToMs).toHaveBeenCalledWith(customExpiry);
    });

    it("should use guest order management policy expiry", () => {
      const customExpiry = 120;
      mockGuestOrderManagementPolicy.tokenExpiryInHours = customExpiry;
      applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(customExpiry);
    });

    it("should call TimeUtil with correct units for verification email", () => {
      applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(TimeUtil.hoursToMs).toHaveBeenCalled();
      expect(TimeUtil.minutesToMs).not.toHaveBeenCalled();
    });

    it("should call TimeUtil with correct units for password reset", () => {
      applicationTokenFactory.issuePasswordReset(mockUser);

      expect(TimeUtil.minutesToMs).toHaveBeenCalled();
      expect(TimeUtil.hoursToMs).not.toHaveBeenCalled();
    });

    it("should call TimeUtil with correct units for guest order management", () => {
      applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(TimeUtil.hoursToMs).toHaveBeenCalled();
    });
  });

  describe("dependency injection", () => {
    it("should work with all dependencies properly injected", () => {
      const factory = new ApplicationTokenFactory(
        mockVerificationEmailPolicy,
        mockPasswordResetPolicy,
        mockGuestOrderManagementPolicy,
        mockTokenGenerator,
        mockFingerprintProvider,
        mockIdGenerator,
      );

      expect(factory).toBeInstanceOf(ApplicationTokenFactory);

      const verificationToken = factory.issueVerificationEmail(mockUser);
      expect(verificationToken).toBeInstanceOf(VerificationEmailToken);

      const passwordResetToken = factory.issuePasswordReset(mockUser);
      expect(passwordResetToken).toBeInstanceOf(PasswordResetToken);

      const guestOrderToken = factory.issueGuestOrderManagement(mockOrder);
      expect(guestOrderToken).toBeInstanceOf(GuestOrderManagementToken);
    });
  });

  describe("integration scenarios", () => {
    it("should create verification email token with all required fields", () => {
      const result = applicationTokenFactory.issueVerificationEmail(mockUser);

      expect(result).toBeInstanceOf(VerificationEmailToken);
      expect(result.getId()).toBeDefined();
      expect(result.getTokenFingerprint()).toBeDefined();
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getUserId()).toBe(mockUserId);
      expect(result.getExpiresAt()).toBeInstanceOf(Date);
      expect(result.getCreatedAt()).toBeInstanceOf(Date);
      expect(result.getUpdatedAt()).toBeInstanceOf(Date);
      expect(result.getTokenStatus()).toBe("active");
    });

    it("should create password reset token with all required fields", () => {
      const result = applicationTokenFactory.issuePasswordReset(mockUser);

      expect(result).toBeInstanceOf(PasswordResetToken);
      expect(result.getId()).toBeDefined();
      expect(result.getTokenFingerprint()).toBeDefined();
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getUserId()).toBe(mockUserId);
      expect(result.getExpiresAt()).toBeInstanceOf(Date);
      expect(result.getCreatedAt()).toBeInstanceOf(Date);
      expect(result.getUpdatedAt()).toBeInstanceOf(Date);
      expect(result.getTokenStatus()).toBe("active");
    });

    it("should create guest order management token with all required fields", () => {
      const result = applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(result).toBeInstanceOf(GuestOrderManagementToken);
      expect(result.getId()).toBeDefined();
      expect(result.getTokenFingerprint()).toBeDefined();
      expect(result.getIdentifier()).toBe(mockEmail);
      expect(result.getOrderId()).toBe(mockOrderId);
      expect(result.getExpiresAt()).toBeInstanceOf(Date);
      expect(result.getCreatedAt()).toBeInstanceOf(Date);
      expect(result.getUpdatedAt()).toBeInstanceOf(Date);
      expect(result.getTokenStatus()).toBe("active");
    });

    it("should handle sequential creation of all token types", () => {
      mockIdGenerator.generate
        .mockReturnValueOnce("verification-token-id")
        .mockReturnValueOnce("password-reset-token-id")
        .mockReturnValueOnce("guest-order-token-id");
      mockTokenGenerator.generate
        .mockReturnValueOnce("verification-raw-token")
        .mockReturnValueOnce("password-reset-raw-token")
        .mockReturnValueOnce("guest-order-raw-token");
      mockFingerprintProvider.fingerprint
        .mockReturnValueOnce("verification-fingerprint")
        .mockReturnValueOnce("password-reset-fingerprint")
        .mockReturnValueOnce("guest-order-fingerprint");

      const verificationToken = applicationTokenFactory.issueVerificationEmail(mockUser);
      const passwordResetToken = applicationTokenFactory.issuePasswordReset(mockUser);
      const guestOrderToken = applicationTokenFactory.issueGuestOrderManagement(mockOrder);

      expect(verificationToken).toBeInstanceOf(VerificationEmailToken);
      expect(passwordResetToken).toBeInstanceOf(PasswordResetToken);
      expect(guestOrderToken).toBeInstanceOf(GuestOrderManagementToken);
      expect(verificationToken.getId()).not.toBe(passwordResetToken.getId());
      expect(passwordResetToken.getId()).not.toBe(guestOrderToken.getId());
    });

    it("should create reissued verification email token with correct event", () => {
      mockIdGenerator.generate.mockReturnValueOnce("reissued-token-id");

      const result = applicationTokenFactory.reissueVerificationEmail(mockUser);

      expect(result.getId()).toBe("reissued-token-id");
      const events = result.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("VERIFICATION_EMAIL_TOKEN_REISSUED");
    });

    it("should create reissued guest order management token with correct event", () => {
      mockIdGenerator.generate.mockReturnValueOnce("reissued-guest-token-id");

      const result = applicationTokenFactory.reissueGuestOrderManagement(mockOrder);

      expect(result.getId()).toBe("reissued-guest-token-id");
      const events = result.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED");
    });
  });

  describe("guest order management validation", () => {
    it("should validate order is guest order before issuing token", () => {
      const memberOrder = createMockOrder(false) as unknown as jest.Mocked<Order>;
      memberOrder.getId = jest.fn().mockReturnValue(mockOrderId);
      memberOrder.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(false),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      expect(() => applicationTokenFactory.issueGuestOrderManagement(memberOrder)).toThrow(
        "Guest order management token can only be created for a guest order",
      );
    });

    it("should validate order is guest order before reissuing token", () => {
      const memberOrder = createMockOrder(false) as unknown as jest.Mocked<Order>;
      memberOrder.getId = jest.fn().mockReturnValue(mockOrderId);
      memberOrder.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(false),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      expect(() => applicationTokenFactory.reissueGuestOrderManagement(memberOrder)).toThrow(
        "Guest order management token can only be created for a guest order",
      );
    });

    it("should use guest email from order for token identifier", () => {
      const customEmail = "custom.guest@example.com";
      const orderWithCustomEmail = createMockOrder(true, customEmail) as unknown as jest.Mocked<Order>;
      orderWithCustomEmail.getId = jest.fn().mockReturnValue(mockOrderId);
      orderWithCustomEmail.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(true),
        getGuestEmail: jest.fn().mockReturnValue(customEmail),
      } as unknown as jest.Mocked<OrderCustomer>);

      const result = applicationTokenFactory.issueGuestOrderManagement(orderWithCustomEmail);

      expect(result.getIdentifier()).toBe(customEmail);
    });

    it("should throw when order customer is not a guest", () => {
      const memberOrder = createMockOrder(false) as unknown as jest.Mocked<Order>;
      memberOrder.getId = jest.fn().mockReturnValue(mockOrderId);
      memberOrder.getCustomer = jest.fn().mockReturnValue({
        isGuest: jest.fn().mockReturnValue(false),
        getGuestEmail: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<OrderCustomer>);

      expect(() => applicationTokenFactory.issueGuestOrderManagement(memberOrder)).toThrow(
        "Guest order management token can only be created for a guest order",
      );
    });
  });

  describe("performance considerations", () => {
    it("should execute issueVerificationEmail quickly", () => {
      const startTime = Date.now();
      applicationTokenFactory.issueVerificationEmail(mockUser);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should execute issuePasswordReset quickly", () => {
      const startTime = Date.now();
      applicationTokenFactory.issuePasswordReset(mockUser);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should execute issueGuestOrderManagement quickly", () => {
      const startTime = Date.now();
      applicationTokenFactory.issueGuestOrderManagement(mockOrder);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple token generations efficiently", () => {
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        applicationTokenFactory.issueVerificationEmail(mockUser);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return VerificationEmailToken for issueVerificationEmail", () => {
      const result = applicationTokenFactory.issueVerificationEmail(mockUser);
      expect(result).toBeInstanceOf(VerificationEmailToken);
    });

    it("should return VerificationEmailToken for reissueVerificationEmail", () => {
      const result = applicationTokenFactory.reissueVerificationEmail(mockUser);
      expect(result).toBeInstanceOf(VerificationEmailToken);
    });

    it("should return PasswordResetToken for issuePasswordReset", () => {
      const result = applicationTokenFactory.issuePasswordReset(mockUser);
      expect(result).toBeInstanceOf(PasswordResetToken);
    });

    it("should return GuestOrderManagementToken for issueGuestOrderManagement", () => {
      const result = applicationTokenFactory.issueGuestOrderManagement(mockOrder);
      expect(result).toBeInstanceOf(GuestOrderManagementToken);
    });

    it("should return GuestOrderManagementToken for reissueGuestOrderManagement", () => {
      const result = applicationTokenFactory.reissueGuestOrderManagement(mockOrder);
      expect(result).toBeInstanceOf(GuestOrderManagementToken);
    });
  });
});
