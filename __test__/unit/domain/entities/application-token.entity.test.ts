import {
  BaseApplicationToken,
  ConsumableToken,
  NonConsumableToken,
  VerificationEmailToken,
  PasswordResetToken,
  GuestOrderManagementToken,
  ApplicationToken,
} from "@/domain/entities/application-token.entity";
import { Expiration } from "@/domain/value-objects/expiration.vo";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import {
  PasswordResetTokenExpiredBeyondGracePeriodException,
  VerificationEmailTokenAlreadyUsedException,
  VerificationEmailTokenExpiredException,
  PasswordResetTokenAlreadyUsedException,
  PasswordResetTokenExpiredException,
  GuestOrderManagementTokenExpiredException,
} from "@/domain/exceptions/application-token.exceptions";
import {
  VerificationEmailTokenIssuedEvent,
  VerificationEmailTokenReissuedEvent,
  VerificationEmailTokenUsedEvent,
  PasswordResetTokenIssuedEvent,
  PasswordResetTokenUsedEvent,
  GuestOrderManagementTokenIssuedEvent,
  GuestOrderManagementTokenReissuedEvent,
} from "@/domain/events/application-token.events";
import {
  GuestOrderManagementTokenCreationData,
  PasswordResetTokenCreationData,
  VerificationEmailTokenCreationData,
} from "@/domain/types/application-token.type";

describe("ApplicationToken Entities", () => {
  const mockDate = new Date("2023-01-01T00:00:00.000Z");
  const mockId = "test-id";
  const mockTokenFingerprint = "test-token-fingerprint";
  const mockIdentifier = "test@example.com";
  const mockUserId = "user-123";
  const mockOrderId = "order-456";
  const mockRawToken = "raw-token-value";
  const mockExpiresAt = new Date("2023-01-01T00:15:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(mockDate);
  });

  describe("BaseApplicationToken", () => {
    class TestBaseToken extends BaseApplicationToken {
      getTokenMetadata(): any {
        return { type: this.type };
      }

      protected throwExpiredException(): never {
        throw new Error("Test expired");
      }
    }

    let token: TestBaseToken;
    const expiration = new Expiration(mockExpiresAt);

    beforeEach(() => {
      token = new TestBaseToken(
        mockId,
        ApplicationTokenType.VERIFICATION_EMAIL,
        mockTokenFingerprint,
        mockIdentifier,
        expiration,
        null,
        mockDate,
        mockDate,
      );
    });

    describe("constructor", () => {
      it("should initialize with correct values", () => {
        expect(token.getId()).toBe(mockId);
        expect(token.getType()).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getUsedAt()).toBeNull();
        expect(token.getCreatedAt()).toEqual(mockDate);
        expect(token.getUpdatedAt()).toEqual(mockDate);
        expect(token.getExpiresAt()).toEqual(mockExpiresAt);
      });

      it("should initialize with usedAt when provided", () => {
        const usedAt = new Date("2023-01-02T00:00:00.000Z");
        const usedToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiration,
          usedAt,
          mockDate,
          mockDate,
        );
        expect(usedToken.getUsedAt()).toEqual(usedAt);
        expect(usedToken.isUsed()).toBe(true);
      });

      it("should return date copies for getters", () => {
        const createdAt = token.getCreatedAt();
        const updatedAt = token.getUpdatedAt();
        const expiresAtCopy = token.getExpiresAt();

        expect(createdAt).toEqual(mockDate);
        expect(createdAt).not.toBe(mockDate);
        expect(updatedAt).toEqual(mockDate);
        expect(updatedAt).not.toBe(mockDate);
        expect(expiresAtCopy).toEqual(mockExpiresAt);
        expect(expiresAtCopy).not.toBe(expiration.getExpiresAt());
      });
    });

    describe("isExpired", () => {
      it("should return true when expiration is expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(expiredToken.isExpired()).toBe(true);
      });

      it("should return false when expiration is not expired", () => {
        expect(token.isExpired()).toBe(false);
      });
    });

    describe("isUsed", () => {
      it("should return false when usedAt is null", () => {
        expect(token.isUsed()).toBe(false);
      });

      it("should return true when usedAt is set", () => {
        const usedToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiration,
          new Date(),
          mockDate,
          mockDate,
        );
        expect(usedToken.isUsed()).toBe(true);
      });
    });

    describe("getTokenStatus", () => {
      it('should return "active" when not expired and not used', () => {
        expect(token.getTokenStatus()).toBe("active");
      });

      it('should return "expired" when expired', () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(expiredToken.getTokenStatus()).toBe("expired");
      });

      it('should return "used" when used', () => {
        const usedToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiration,
          new Date(),
          mockDate,
          mockDate,
        );
        expect(usedToken.getTokenStatus()).toBe("used");
      });

      it('should return "used" when both expired and used (used takes precedence)', () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredUsedToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          new Date(),
          mockDate,
          mockDate,
        );
        expect(expiredUsedToken.getTokenStatus()).toBe("used");
      });
    });

    describe("getRemainingTimeMs", () => {
      it("should return remaining time", () => {
        const remaining = token.getRemainingTimeMs();
        expect(remaining).toBe(expiration.getRemainingTimeMs());
      });

      it("should return 0 for expired token", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestBaseToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(expiredToken.getRemainingTimeMs()).toBe(0);
      });
    });

    describe("updateTimestamp", () => {
      it("should update updatedAt timestamp", () => {
        const newDate = new Date("2023-01-02T00:00:00.000Z");
        jest.setSystemTime(newDate);

        (token as unknown as { updateTimestamp: () => void }).updateTimestamp();

        expect(token.getUpdatedAt()).toEqual(newDate);
      });
    });
  });

  describe("ConsumableToken", () => {
    class TestConsumableToken extends ConsumableToken {
      getTokenMetadata(): any {
        return { type: this.type };
      }

      protected throwExpiredException(): never {
        throw new Error("Test expired");
      }

      protected throwAlreadyUsedException(): never {
        throw new Error("Test already used");
      }

      protected emitUsageEvent(): void {}
    }

    let token: TestConsumableToken;
    const expiration = new Expiration(mockExpiresAt);

    beforeEach(() => {
      token = new TestConsumableToken(
        mockId,
        ApplicationTokenType.VERIFICATION_EMAIL,
        mockTokenFingerprint,
        mockIdentifier,
        expiration,
        null,
        mockDate,
        mockDate,
      );
    });

    describe("assertCanBeUsed", () => {
      it("should not throw when token is valid", () => {
        expect(() => token.assertCanBeUsed()).not.toThrow();
      });

      it("should throw when token is expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestConsumableToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );

        expect(() => expiredToken.assertCanBeUsed()).toThrow("Test expired");
      });

      it("should throw when token is already used", () => {
        token.use();
        expect(() => token.assertCanBeUsed()).toThrow("Test already used");
      });
    });

    describe("use", () => {
      it("should mark token as used when valid", () => {
        const emitUsageEventSpy = jest.spyOn(token as unknown as { emitUsageEvent: () => void }, "emitUsageEvent");

        token.use();

        expect(token.isUsed()).toBe(true);
        expect(token.getUsedAt()).toBeInstanceOf(Date);
        expect(emitUsageEventSpy).toHaveBeenCalled();
      });

      it("should update timestamp when used", () => {
        const beforeUpdate = token.getUpdatedAt();
        jest.advanceTimersByTime(5000);
        token.use();
        expect(token.getUpdatedAt().getTime()).toBeGreaterThan(beforeUpdate.getTime());
      });

      it("should throw when token is expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestConsumableToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );

        expect(() => expiredToken.use()).toThrow("Test expired");
      });

      it("should throw when token is already used", () => {
        token.use();
        expect(() => token.use()).toThrow("Test already used");
      });
    });

    describe("canBeUsed", () => {
      it("should return true when not expired and not used", () => {
        expect(token.canBeUsed()).toBe(true);
      });

      it("should return false when expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestConsumableToken(
          mockId,
          ApplicationTokenType.VERIFICATION_EMAIL,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(expiredToken.canBeUsed()).toBe(false);
      });

      it("should return false when used", () => {
        token.use();
        expect(token.canBeUsed()).toBe(false);
      });
    });
  });

  describe("NonConsumableToken", () => {
    class TestNonConsumableToken extends NonConsumableToken {
      getTokenMetadata(): any {
        return { type: this.type };
      }

      protected throwExpiredException(): never {
        throw new Error("Test non-consumable expired");
      }
    }

    let token: TestNonConsumableToken;
    const expiration = new Expiration(mockExpiresAt);

    beforeEach(() => {
      token = new TestNonConsumableToken(
        mockId,
        ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
        mockTokenFingerprint,
        mockIdentifier,
        expiration,
        null,
        mockDate,
        mockDate,
      );
    });

    describe("use", () => {
      it("should throw error", () => {
        expect(() => token.use()).toThrow("This token type cannot be consumed");
      });
    });

    describe("canBeUsed", () => {
      it("should return true when not expired", () => {
        expect(token.canBeUsed()).toBe(true);
      });

      it("should return false when expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestNonConsumableToken(
          mockId,
          ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(expiredToken.canBeUsed()).toBe(false);
      });
    });

    describe("assertNotExpired", () => {
      it("should not throw when token is valid", () => {
        expect(() => token.assertNotExpired()).not.toThrow();
      });

      it("should throw when token is expired", () => {
        const expiredExpiration = new Expiration(new Date(mockDate.getTime() - 1000));
        const expiredToken = new TestNonConsumableToken(
          mockId,
          ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
          mockTokenFingerprint,
          mockIdentifier,
          expiredExpiration,
          null,
          mockDate,
          mockDate,
        );
        expect(() => expiredToken.assertNotExpired()).toThrow("Test non-consumable expired");
      });
    });
  });

  describe("VerificationEmailToken", () => {
    const mockExpirationDate = new Date("2023-01-02T00:00:00.000Z");

    describe("issue", () => {
      it("should create a new token with correct properties", () => {
        const creationData: VerificationEmailTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = VerificationEmailToken.issue(creationData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getUserId()).toBe(mockUserId);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getType()).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
        expect(token.isUsed()).toBe(false);
        expect(token.getExpiresAt().getTime()).toBe(mockExpirationDate.getTime());
        expect(token.getCreatedAt()).toEqual(mockDate);
        expect(token.getUpdatedAt()).toEqual(mockDate);
      });

      it("should create a new token with custom dates", () => {
        const customDate = new Date("2023-01-02T00:00:00.000Z");
        const creationData: VerificationEmailTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
          createdAt: customDate,
          updatedAt: customDate,
        };

        const token = VerificationEmailToken.issue(creationData);

        expect(token.getCreatedAt()).toEqual(customDate);
        expect(token.getUpdatedAt()).toEqual(customDate);
        expect(token.getExpiresAt().getTime()).toBe(mockExpirationDate.getTime());
      });

      it("should emit issue event", () => {
        const creationData: VerificationEmailTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = VerificationEmailToken.issue(creationData);
        const events = token.pullDomainEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(VerificationEmailTokenIssuedEvent);
      });
    });

    describe("reissue", () => {
      it("should create a new token with correct properties", () => {
        const creationData: VerificationEmailTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = VerificationEmailToken.reissue(creationData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getUserId()).toBe(mockUserId);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getType()).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
        expect(token.isUsed()).toBe(false);
      });

      it("should emit reissue event", () => {
        const creationData: VerificationEmailTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = VerificationEmailToken.reissue(creationData);
        const events = token.pullDomainEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(VerificationEmailTokenReissuedEvent);
      });
    });

    describe("rebuild", () => {
      it("should rebuild token with correct properties", () => {
        const rebuildData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const token = VerificationEmailToken.rebuild(rebuildData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getUserId()).toBe(mockUserId);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getUsedAt()).toBeNull();
        expect(token.getExpiresAt()).toEqual(mockExpirationDate);
      });

      it("should rebuild token with usedAt", () => {
        const usedAt = new Date("2023-01-02T00:00:00.000Z");
        const rebuildData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpirationDate,
          usedAt,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const token = VerificationEmailToken.rebuild(rebuildData);
        expect(token.getUsedAt()).toEqual(usedAt);
        expect(token.isUsed()).toBe(true);
      });
    });

    describe("use", () => {
      it("should mark token as used and emit usage event", () => {
        const token = VerificationEmailToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        token.use();

        const events = token.pullDomainEvents();

        expect(token.isUsed()).toBe(true);
        expect(token.getUsedAt()).toBeInstanceOf(Date);
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(VerificationEmailTokenUsedEvent);
      });

      it("should throw when token is expired", () => {
        const token = VerificationEmailToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.use()).toThrow(VerificationEmailTokenExpiredException);
      });

      it("should throw when token is already used", () => {
        const token = VerificationEmailToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpirationDate,
          usedAt: new Date(),
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.use()).toThrow(VerificationEmailTokenAlreadyUsedException);
      });
    });

    describe("getTokenMetadata", () => {
      it("should return correct metadata", () => {
        const token = VerificationEmailToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        const metadata = token.getTokenMetadata();

        expect(metadata).toEqual({
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          tokenId: mockId,
          userId: mockUserId,
          identifier: mockIdentifier,
        });
      });
    });
  });

  describe("PasswordResetToken", () => {
    const mockExpirationDate = new Date("2023-01-02T00:00:00.000Z");

    describe("issue", () => {
      it("should create a new token with correct properties", () => {
        const creationData: PasswordResetTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = PasswordResetToken.issue(creationData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getUserId()).toBe(mockUserId);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getType()).toBe(ApplicationTokenType.PASSWORD_RESET);
        expect(token.isUsed()).toBe(false);
        expect(token.getExpiresAt().getTime()).toBe(mockExpirationDate.getTime());
      });

      it("should emit issue event", () => {
        const creationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = PasswordResetToken.issue(creationData);
        const events = token.pullDomainEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(PasswordResetTokenIssuedEvent);
      });
    });

    describe("rebuild", () => {
      it("should rebuild token with correct properties", () => {
        const rebuildData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const token = PasswordResetToken.rebuild(rebuildData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getUserId()).toBe(mockUserId);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getUsedAt()).toBeNull();
        expect(token.getExpiresAt()).toEqual(mockExpirationDate);
      });
    });

    describe("use", () => {
      it("should mark token as used and emit usage event", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        token.use();

        const events = token.pullDomainEvents();

        expect(token.isUsed()).toBe(true);
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(PasswordResetTokenUsedEvent);
      });

      it("should throw when token is expired", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.use()).toThrow(PasswordResetTokenExpiredException);
      });

      it("should throw when token is already used", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: mockExpirationDate,
          usedAt: new Date(),
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.use()).toThrow(PasswordResetTokenAlreadyUsedException);
      });
    });

    describe("assertWithinGracePeriod", () => {
      it("should not throw when within grace period", () => {
        const justExpiredDate = new Date(Date.now() - 1000);

        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: justExpiredDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.assertWithinGracePeriod(30000)).not.toThrow();
      });

      it("should throw when beyond grace period", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() - 45000),
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.assertWithinGracePeriod(30000)).toThrow(PasswordResetTokenExpiredBeyondGracePeriodException);
      });

      it("should not throw when token is not expired", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() + 30000),
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.assertWithinGracePeriod(30000)).not.toThrow();
      });
    });

    describe("getTokenMetadata", () => {
      it("should return correct metadata", () => {
        const token = PasswordResetToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          userId: mockUserId,
          identifier: mockIdentifier,
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: mockExpirationDate,
          usedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        const metadata = token.getTokenMetadata();

        expect(metadata).toEqual({
          type: ApplicationTokenType.PASSWORD_RESET,
          tokenId: mockId,
          userId: mockUserId,
          identifier: mockIdentifier,
        });
      });
    });
  });

  describe("GuestOrderManagementToken", () => {
    const mockExpirationDate = new Date("2023-01-02T00:00:00.000Z");

    describe("issue", () => {
      it("should create a new token with correct properties", () => {
        const creationData: GuestOrderManagementTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = GuestOrderManagementToken.issue(creationData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getOrderId()).toBe(mockOrderId);
        expect(token.getType()).toBe(ApplicationTokenType.GUEST_ORDER_MANAGEMENT);
        expect(token.isUsed()).toBe(false);
        expect(token.getExpiresAt().getTime()).toBe(mockExpirationDate.getTime());
      });

      it("should create a new token with custom dates", () => {
        const customDate = new Date("2023-01-02T00:00:00.000Z");
        const creationData: GuestOrderManagementTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
          createdAt: customDate,
          updatedAt: customDate,
        };

        const token = GuestOrderManagementToken.issue(creationData);

        expect(token.getCreatedAt()).toEqual(customDate);
        expect(token.getUpdatedAt()).toEqual(customDate);
        expect(token.getExpiresAt().getTime()).toBe(mockExpirationDate.getTime());
      });

      it("should emit issue event", () => {
        const creationData: GuestOrderManagementTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = GuestOrderManagementToken.issue(creationData);
        const events = token.pullDomainEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(GuestOrderManagementTokenIssuedEvent);
      });
    });

    describe("reissue", () => {
      it("should create a new token with correct properties", () => {
        const creationData: GuestOrderManagementTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = GuestOrderManagementToken.reissue(creationData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getOrderId()).toBe(mockOrderId);
        expect(token.getType()).toBe(ApplicationTokenType.GUEST_ORDER_MANAGEMENT);
        expect(token.isUsed()).toBe(false);
      });

      it("should emit reissue event", () => {
        const creationData: GuestOrderManagementTokenCreationData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          rawToken: mockRawToken,
          expiresAt: mockExpirationDate,
        };

        const token = GuestOrderManagementToken.reissue(creationData);
        const events = token.pullDomainEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(GuestOrderManagementTokenReissuedEvent);
      });
    });

    describe("rebuild", () => {
      it("should rebuild token with correct properties", () => {
        const rebuildData = {
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: mockExpirationDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const token = GuestOrderManagementToken.rebuild(rebuildData);

        expect(token.getId()).toBe(mockId);
        expect(token.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(token.getIdentifier()).toBe(mockIdentifier);
        expect(token.getOrderId()).toBe(mockOrderId);
        expect(token.getUsedAt()).toBeNull();
        expect(token.getExpiresAt()).toEqual(mockExpirationDate);
      });
    });

    describe("use", () => {
      it("should throw error since this token type cannot be consumed", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: mockExpirationDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.use()).toThrow("This token type cannot be consumed");
        expect(token.getUsedAt()).toBeNull();
      });
    });

    describe("validateAccess (assertNotExpired)", () => {
      it("should not throw when token is valid", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: mockExpirationDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.assertNotExpired()).not.toThrow();
      });

      it("should throw when token is expired", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: new Date(Date.now() - 1000),
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(() => token.assertNotExpired()).toThrow(GuestOrderManagementTokenExpiredException);
      });
    });

    describe("getTokenMetadata", () => {
      it("should return correct metadata", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: mockExpirationDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        const metadata = token.getTokenMetadata();

        expect(metadata).toEqual({
          type: ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
          tokenId: mockId,
          orderId: mockOrderId,
          identifier: mockIdentifier,
        });
      });
    });

    describe("canBeUsed", () => {
      it("should return true when not expired", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: mockExpirationDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(token.canBeUsed()).toBe(true);
      });

      it("should return false when expired", () => {
        const token = GuestOrderManagementToken.rebuild({
          id: mockId,
          tokenFingerprint: mockTokenFingerprint,
          identifier: mockIdentifier,
          orderId: mockOrderId,
          expiresAt: new Date(Date.now() - 1000),
          createdAt: mockDate,
          updatedAt: mockDate,
        });

        expect(token.canBeUsed()).toBe(false);
      });
    });
  });

  describe("ApplicationToken Type Union", () => {
    it("should allow all token types in union type", () => {
      const tokens: ApplicationToken[] = [
        VerificationEmailToken.rebuild({
          id: "1",
          tokenFingerprint: "fingerprint1",
          userId: "user1",
          identifier: "email1@test.com",
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        PasswordResetToken.rebuild({
          id: "2",
          tokenFingerprint: "fingerprint2",
          userId: "user2",
          identifier: "email2@test.com",
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        GuestOrderManagementToken.rebuild({
          id: "3",
          tokenFingerprint: "fingerprint3",
          identifier: "email3@test.com",
          orderId: "order3",
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toBeInstanceOf(VerificationEmailToken);
      expect(tokens[1]).toBeInstanceOf(PasswordResetToken);
      expect(tokens[2]).toBeInstanceOf(GuestOrderManagementToken);
    });

    it("should handle different token statuses in union type", () => {
      const tokens: ApplicationToken[] = [
        VerificationEmailToken.rebuild({
          id: "1",
          tokenFingerprint: "fingerprint1",
          userId: "user1",
          identifier: "email1@test.com",
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          expiresAt: mockExpiresAt,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        PasswordResetToken.rebuild({
          id: "2",
          tokenFingerprint: "fingerprint2",
          userId: "user2",
          identifier: "email2@test.com",
          type: ApplicationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        GuestOrderManagementToken.rebuild({
          id: "3",
          tokenFingerprint: "fingerprint3",
          identifier: "email3@test.com",
          orderId: "order3",
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      expect(tokens[0].getTokenStatus()).toBe("active");
      expect(tokens[1].getTokenStatus()).toBe("expired");
      expect(tokens[2].getTokenStatus()).toBe("expired");
    });
  });

  describe("Edge cases", () => {
    it("should handle token with very long duration", () => {
      const veryLongDuration = 365 * 24 * 60 * 60 * 1000;
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: new Date(Date.now() + veryLongDuration),
      });

      expect(token.isExpired()).toBe(false);
      expect(token.getRemainingTimeMs()).toBe(veryLongDuration);
    });

    it("should handle token with very long identifier", () => {
      const longIdentifier = "a".repeat(10000);
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: longIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      expect(token.getIdentifier()).toBe(longIdentifier);
    });

    it("should handle token with special characters in identifier", () => {
      const specialIdentifier = 'test!@#$%^&*()_+{}|:"<>?~`';
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: specialIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      expect(token.getIdentifier()).toBe(specialIdentifier);
    });

    it("should maintain immutability of readonly fields", () => {
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      const originalId = token.getId();
      const originalTokenFingerprint = token.getTokenFingerprint();
      const originalType = token.getType();
      const originalUserId = token.getUserId();

      token.use();

      expect(token.getId()).toBe(originalId);
      expect(token.getTokenFingerprint()).toBe(originalTokenFingerprint);
      expect(token.getType()).toBe(originalType);
      expect(token.getUserId()).toBe(originalUserId);
    });

    it("should handle multiple token uses correctly", () => {
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      token.use();
      expect(token.isUsed()).toBe(true);

      expect(() => token.use()).toThrow(VerificationEmailTokenAlreadyUsedException);
    });

    it("should handle expiration at exact current time", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1);
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: pastDate,
      });

      expect(token.isExpired()).toBe(true);
      expect(token.getRemainingTimeMs()).toBe(0);
    });

    it("should handle GuestOrderManagementToken with empty identifier", () => {
      const token = GuestOrderManagementToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        identifier: "",
        orderId: mockOrderId,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      expect(token.getIdentifier()).toBe("");
    });

    it("should handle reissue with custom dates", () => {
      const customDate = new Date("2023-01-02T00:00:00.000Z");
      const token = VerificationEmailToken.reissue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
        createdAt: customDate,
        updatedAt: customDate,
      });

      expect(token.getCreatedAt()).toEqual(customDate);
      expect(token.getUpdatedAt()).toEqual(customDate);
    });

    it("should handle rebuild with usedAt after creation", () => {
      const usedAt = new Date("2023-01-03T00:00:00.000Z");
      const token = VerificationEmailToken.rebuild({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        type: ApplicationTokenType.VERIFICATION_EMAIL,
        expiresAt: mockExpiresAt,
        usedAt,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      expect(token.getUsedAt()).toEqual(usedAt);
      expect(token.isUsed()).toBe(true);
    });

    it("should handle GuestOrderManagementToken with very long orderId", () => {
      const longOrderId = "order-" + "a".repeat(1000);
      const token = GuestOrderManagementToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        identifier: mockIdentifier,
        orderId: longOrderId,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      expect(token.getOrderId()).toBe(longOrderId);
    });

    it("should handle token with zero remaining time", () => {
      const expiredToken = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: new Date(Date.now() - 1),
      });

      expect(expiredToken.getRemainingTimeMs()).toBe(0);
    });

    it("should handle assertWithinGracePeriod with zero grace period", () => {
      const token = PasswordResetToken.rebuild({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        type: ApplicationTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      expect(() => token.assertWithinGracePeriod(0)).toThrow(PasswordResetTokenExpiredBeyondGracePeriodException);
    });

    it("should handle assertWithinGracePeriod with very large grace period", () => {
      const token = PasswordResetToken.rebuild({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        type: ApplicationTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      expect(() => token.assertWithinGracePeriod(1000000000)).not.toThrow();
    });

    it("should handle multiple events correctly", () => {
      const token = VerificationEmailToken.issue({
        id: mockId,
        tokenFingerprint: mockTokenFingerprint,
        userId: mockUserId,
        identifier: mockIdentifier,
        rawToken: mockRawToken,
        expiresAt: mockExpiresAt,
      });

      token.clearDomainEvents();
      token.use();

      const events = token.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(VerificationEmailTokenUsedEvent);
    });
  });
});
