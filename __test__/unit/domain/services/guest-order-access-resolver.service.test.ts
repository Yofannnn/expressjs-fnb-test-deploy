import { GuestOrderAccessResolverService } from "@/domain/services/guest-order-access-resolver.service";
import { Order } from "@/domain/entities/order.entity";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";
import { GuestOrderManagementTokenExpiredException } from "@/domain/exceptions/application-token.exceptions";
import { ApplicationTokenType } from "@/domain/types/application-token.type";

describe("GuestOrderAccessResolverService", () => {
  let mockOrder: jest.Mocked<Order>;
  let mockToken: jest.Mocked<GuestOrderManagementToken>;
  const mockOrderId = "order-123";
  const mockGuestEmail = "guest@example.com";
  const mockTokenId = "token-456";
  const mockTokenFingerprint = "fingerprint-789";

  beforeEach(() => {
    mockOrder = {
      getId: jest.fn().mockReturnValue(mockOrderId),
      getCustomer: jest.fn(),
      getType: jest.fn(),
      getStatus: jest.fn(),
      getItems: jest.fn(),
      getPricing: jest.fn(),
      getFulfillment: jest.fn(),
      getPayment: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      confirm: jest.fn(),
      startPreparing: jest.fn(),
      markReady: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
      reject: jest.fn(),
      pay: jest.fn(),
      seatReservation: jest.fn(),
      markReservationNoShow: jest.fn(),
      markReservationCancelled: jest.fn(),
    } as unknown as jest.Mocked<Order>;

    mockToken = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      getType: jest.fn().mockReturnValue(ApplicationTokenType.GUEST_ORDER_MANAGEMENT),
      getTokenFingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      getIdentifier: jest.fn().mockReturnValue(mockGuestEmail),
      getOrderId: jest.fn().mockReturnValue(mockOrderId),
      getExpiresAt: jest.fn(),
      getUsedAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getRemainingTimeMs: jest.fn(),
      getTokenStatus: jest.fn().mockReturnValue("active"),
      isExpired: jest.fn().mockReturnValue(false),
      isUsed: jest.fn().mockReturnValue(false),
      assertNotExpired: jest.fn(),
      use: jest.fn(),
      canBeUsed: jest.fn(),
      getTokenMetadata: jest.fn(),
    } as unknown as jest.Mocked<GuestOrderManagementToken>;
  });

  describe("resolveGuestEmail", () => {
    describe("successful resolution", () => {
      it("should return the guest email when token is valid and matches order", () => {
        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(mockGuestEmail);
        expect(mockToken.assertNotExpired).toHaveBeenCalled();
        expect(mockToken.getOrderId).toHaveBeenCalled();
        expect(mockOrder.getId).toHaveBeenCalled();
        expect(mockToken.getIdentifier).toHaveBeenCalled();
      });

      it("should call assertNotExpired to validate token expiration", () => {
        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(mockToken.assertNotExpired).toHaveBeenCalledTimes(1);
      });

      it("should call getOrderId to verify order ownership", () => {
        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(mockToken.getOrderId).toHaveBeenCalledTimes(1);
        expect(mockOrder.getId).toHaveBeenCalledTimes(1);
      });

      it("should call getIdentifier to retrieve guest email", () => {
        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(mockToken.getIdentifier).toHaveBeenCalledTimes(1);
      });

      it("should return the identifier string from the token", () => {
        const customEmail = "custom.guest@example.com";
        mockToken.getIdentifier.mockReturnValue(customEmail);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(customEmail);
      });

      it("should handle token with email containing special characters", () => {
        const specialEmail = "guest+test@example.co.uk";
        mockToken.getIdentifier.mockReturnValue(specialEmail);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(specialEmail);
        expect(mockToken.assertNotExpired).toHaveBeenCalled();
        expect(mockToken.getOrderId).toHaveBeenCalled();
      });

      it("should handle token with Unicode characters in email", () => {
        const unicodeEmail = "test@exämple.com";
        mockToken.getIdentifier.mockReturnValue(unicodeEmail);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(unicodeEmail);
      });
    });

    describe("expiration validation", () => {
      it("should throw GuestOrderManagementTokenExpiredException when token is expired", () => {
        mockToken.assertNotExpired.mockImplementation(() => {
          throw new GuestOrderManagementTokenExpiredException(new Date());
        });

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(GuestOrderManagementTokenExpiredException);

        expect(mockToken.assertNotExpired).toHaveBeenCalled();
        expect(mockToken.getOrderId).not.toHaveBeenCalled();
        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });

      it("should not call getOrderId when token is expired", () => {
        mockToken.assertNotExpired.mockImplementation(() => {
          throw new GuestOrderManagementTokenExpiredException(new Date());
        });

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        } catch {
          // Expected
        }

        expect(mockToken.getOrderId).not.toHaveBeenCalled();
        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });

      it("should throw any error from assertNotExpired", () => {
        const customError = new Error("Custom validation error");
        mockToken.assertNotExpired.mockImplementation(() => {
          throw customError;
        });

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(customError);
      });
    });

    describe("order ownership validation", () => {
      it("should throw ForbiddenActionException when token orderId doesn't match order", () => {
        const differentOrderId = "different-order-456";
        mockToken.getOrderId.mockReturnValue(differentOrderId);

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);

        expect(mockToken.assertNotExpired).toHaveBeenCalled();
        expect(mockToken.getOrderId).toHaveBeenCalled();
        expect(mockOrder.getId).toHaveBeenCalled();
        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });

      it("should throw ForbiddenActionException with correct message when order mismatch", () => {
        const differentOrderId = "different-order-456";
        mockToken.getOrderId.mockReturnValue(differentOrderId);

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
          fail("Expected ForbiddenActionException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenActionException);
          expect((error as ForbiddenActionException).message).toContain("view order");
        }
      });

      it("should handle order ID with special characters", () => {
        const specialOrderId = "order-!@#$%^&*()";
        mockOrder.getId.mockReturnValue(specialOrderId);
        mockToken.getOrderId.mockReturnValue(specialOrderId);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(mockGuestEmail);
        expect(mockToken.getOrderId).toHaveBeenCalled();
        expect(mockOrder.getId).toHaveBeenCalled();
      });

      it("should handle empty string order ID match", () => {
        mockOrder.getId.mockReturnValue("");
        mockToken.getOrderId.mockReturnValue("");

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(mockGuestEmail);
      });

      it("should throw when order ID is empty string but token has non-empty ID", () => {
        mockOrder.getId.mockReturnValue("");
        mockToken.getOrderId.mockReturnValue("order-123");

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);
      });
    });

    describe("edge cases with token data", () => {
      it("should handle token with null identifier", () => {
        mockToken.getIdentifier.mockReturnValue(null as unknown as string);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBeNull();
      });

      it("should handle token with undefined identifier", () => {
        mockToken.getIdentifier.mockReturnValue(undefined as unknown as string);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBeUndefined();
      });

      it("should handle token with empty string identifier", () => {
        mockToken.getIdentifier.mockReturnValue("");

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe("");
      });

      it("should handle token with very long identifier", () => {
        const longEmail = "a".repeat(1000) + "@example.com";
        mockToken.getIdentifier.mockReturnValue(longEmail);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(longEmail);
      });

      it("should handle token with whitespace in identifier", () => {
        const emailWithWhitespace = "  guest@example.com  ";
        mockToken.getIdentifier.mockReturnValue(emailWithWhitespace);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(result).toBe(emailWithWhitespace);
      });
    });

    describe("integration with Order entity", () => {
      it("should call Order.getId() to verify ownership", () => {
        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(mockOrder.getId).toHaveBeenCalledTimes(1);
      });

      it("should work with different Order implementations", () => {
        const customOrderId = "custom-order-789";
        const customOrder = {
          getId: jest.fn().mockReturnValue(customOrderId),
        } as unknown as Order;

        mockToken.getOrderId.mockReturnValue(customOrderId);

        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, customOrder);

        expect(result).toBe(mockGuestEmail);
        expect(customOrder.getId).toHaveBeenCalled();
      });

      it("should handle Order with getId returning null", () => {
        mockOrder.getId.mockReturnValue(null as unknown as string);

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);
      });

      it("should handle Order with getId returning undefined", () => {
        mockOrder.getId.mockReturnValue(undefined as unknown as string);

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);
      });
    });

    describe("error scenarios", () => {
      it("should throw ForbiddenActionException when token order ID is null", () => {
        mockToken.getOrderId.mockReturnValue(null as unknown as string);

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);
      });

      it("should throw ForbiddenActionException when token order ID is undefined", () => {
        mockToken.getOrderId.mockReturnValue(undefined as unknown as string);

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(ForbiddenActionException);
      });

      it("should throw ForbiddenActionException with correct message when order ID mismatch", () => {
        mockToken.getOrderId.mockReturnValue("wrong-order");

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
          fail("Expected ForbiddenActionException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenActionException);
          expect((error as ForbiddenActionException).message).toContain("view order");
        }
      });

      it("should preserve the original error from assertNotExpired", () => {
        const expiredException = new GuestOrderManagementTokenExpiredException(new Date());
        mockToken.assertNotExpired.mockImplementation(() => {
          throw expiredException;
        });

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBe(expiredException);
          expect(error).toBeInstanceOf(GuestOrderManagementTokenExpiredException);
        }
      });

      it("should not catch and rethrow errors from assertNotExpired", () => {
        const error = new Error("Original error");
        mockToken.assertNotExpired.mockImplementation(() => {
          throw error;
        });

        expect(() => {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }).toThrow(error);
      });
    });

    describe("method call ordering", () => {
      it("should call assertNotExpired before getOrderId", () => {
        const callOrder: string[] = [];

        mockToken.assertNotExpired.mockImplementation(() => {
          callOrder.push("assertNotExpired");
        });

        mockToken.getOrderId.mockImplementation(() => {
          callOrder.push("getOrderId");
          return mockOrderId;
        });

        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(callOrder).toEqual(["assertNotExpired", "getOrderId"]);
      });

      it("should call getOrderId before getIdentifier", () => {
        const callOrder: string[] = [];

        mockToken.getOrderId.mockImplementation(() => {
          callOrder.push("getOrderId");
          return mockOrderId;
        });

        mockToken.getIdentifier.mockImplementation(() => {
          callOrder.push("getIdentifier");
          return mockGuestEmail;
        });

        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(callOrder).toEqual(["getOrderId", "getIdentifier"]);
      });

      it("should not call getIdentifier when order ID mismatch", () => {
        mockToken.getOrderId.mockReturnValue("wrong-order");

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        } catch {
          // Expected
        }

        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });

      it("should not call getIdentifier when assertNotExpired throws", () => {
        mockToken.assertNotExpired.mockImplementation(() => {
          throw new GuestOrderManagementTokenExpiredException(new Date());
        });

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        } catch {
          // Expected
        }

        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });
    });

    describe("performance considerations", () => {
      it("should execute resolution quickly", () => {
        const startTime = Date.now();
        GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should handle multiple calls efficiently", () => {
        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
        expect(mockToken.assertNotExpired).toHaveBeenCalledTimes(100);
        expect(mockToken.getOrderId).toHaveBeenCalledTimes(100);
        expect(mockToken.getIdentifier).toHaveBeenCalledTimes(100);
      });

      it("should not call unnecessary methods when token is expired", () => {
        mockToken.assertNotExpired.mockImplementation(() => {
          throw new GuestOrderManagementTokenExpiredException(new Date());
        });

        try {
          GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);
        } catch {
          // Expected
        }

        expect(mockToken.getOrderId).not.toHaveBeenCalled();
        expect(mockToken.getIdentifier).not.toHaveBeenCalled();
      });
    });

    describe("type safety", () => {
      it("should accept GuestOrderManagementToken type", () => {
        const token: GuestOrderManagementToken = mockToken as GuestOrderManagementToken;
        const order: Order = mockOrder as Order;

        const result = GuestOrderAccessResolverService.resolveGuestEmail(token, order);

        expect(result).toBe(mockGuestEmail);
      });

      it("should return string type", () => {
        const result = GuestOrderAccessResolverService.resolveGuestEmail(mockToken, mockOrder);

        expect(typeof result).toBe("string");
      });
    });
  });

  describe("integration with real token scenario", () => {
    it("should handle flow: token issued -> token validated -> email resolved", () => {
      const realToken = {
        assertNotExpired: jest.fn(),
        getOrderId: jest.fn().mockReturnValue(mockOrderId),
        getIdentifier: jest.fn().mockReturnValue(mockGuestEmail),
      } as unknown as GuestOrderManagementToken;

      const realOrder = {
        getId: jest.fn().mockReturnValue(mockOrderId),
      } as unknown as Order;

      const result = GuestOrderAccessResolverService.resolveGuestEmail(realToken, realOrder);

      expect(result).toBe(mockGuestEmail);
      expect(realToken.assertNotExpired).toHaveBeenCalled();
      expect(realToken.getOrderId).toHaveBeenCalled();
      expect(realToken.getIdentifier).toHaveBeenCalled();
      expect(realOrder.getId).toHaveBeenCalled();
    });

    it("should handle flow: token expired -> throws exception", () => {
      const realToken = {
        assertNotExpired: jest.fn().mockImplementation(() => {
          throw new GuestOrderManagementTokenExpiredException(new Date());
        }),
        getOrderId: jest.fn(),
        getIdentifier: jest.fn(),
      } as unknown as GuestOrderManagementToken;

      const realOrder = {
        getId: jest.fn(),
      } as unknown as Order;

      expect(() => {
        GuestOrderAccessResolverService.resolveGuestEmail(realToken, realOrder);
      }).toThrow(GuestOrderManagementTokenExpiredException);

      expect(realToken.getOrderId).not.toHaveBeenCalled();
      expect(realToken.getIdentifier).not.toHaveBeenCalled();
    });

    it("should handle flow: token belongs to different order -> throws ForbiddenActionException", () => {
      const realToken = {
        assertNotExpired: jest.fn(),
        getOrderId: jest.fn().mockReturnValue("different-order"),
        getIdentifier: jest.fn(),
      } as unknown as GuestOrderManagementToken;

      const realOrder = {
        getId: jest.fn().mockReturnValue(mockOrderId),
      } as unknown as Order;

      expect(() => {
        GuestOrderAccessResolverService.resolveGuestEmail(realToken, realOrder);
      }).toThrow(ForbiddenActionException);

      expect(realToken.getIdentifier).not.toHaveBeenCalled();
    });
  });
});
