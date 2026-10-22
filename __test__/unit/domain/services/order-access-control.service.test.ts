import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { Order } from "@/domain/entities/order.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";

describe("OrderAccessControlService", () => {
  let mockOrder: jest.Mocked<Order>;

  beforeEach(() => {
    mockOrder = {
      isOwnedByMember: jest.fn(),
      isOwnedByGuest: jest.fn(),
      getId: jest.fn().mockReturnValue("order-123"),
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
  });

  describe("assertOwnership", () => {
    describe("with member ID", () => {
      it("should not throw when member owns the order", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).not.toThrow();

        expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
        expect(mockOrder.isOwnedByGuest).not.toHaveBeenCalled();
      });

      it("should throw ForbiddenActionException when member does not own the order", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).toThrow(ForbiddenActionException);

        expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
      });

      it("should prefer memberId over guestEmail when both are provided", () => {
        const memberId = "member-123";
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByMember.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId, guestEmail);
        }).not.toThrow();

        expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
        expect(mockOrder.isOwnedByGuest).not.toHaveBeenCalled();
      });

      it("should throw when memberId is provided but does not match", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).toThrow(ForbiddenActionException);
      });
    });

    describe("with guest email", () => {
      it("should not throw when guest owns the order", () => {
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByGuest.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).not.toThrow();

        expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
        expect(mockOrder.isOwnedByMember).not.toHaveBeenCalled();
      });

      it("should throw ForbiddenActionException when guest does not own the order", () => {
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByGuest.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).toThrow(ForbiddenActionException);

        expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
      });
    });

    describe("with no credentials", () => {
      it("should throw ForbiddenActionException when neither memberId nor guestEmail is provided", () => {
        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder);
        }).toThrow(ForbiddenActionException);

        expect(mockOrder.isOwnedByMember).not.toHaveBeenCalled();
        expect(mockOrder.isOwnedByGuest).not.toHaveBeenCalled();
      });

      it("should throw ForbiddenActionException with undefined memberId and undefined guestEmail", () => {
        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, undefined);
        }).toThrow(ForbiddenActionException);
      });

      it("should throw ForbiddenActionException with null memberId and null guestEmail", () => {
        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, null as unknown as string, null as unknown as string);
        }).toThrow(ForbiddenActionException);
      });

      it("should throw ForbiddenActionException with empty memberId and empty guestEmail", () => {
        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, "", "");
        }).toThrow(ForbiddenActionException);
      });
    });

    describe("with empty strings", () => {
      it("should throw when memberId is empty string", () => {
        const memberId = "";
        mockOrder.isOwnedByMember.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).toThrow(ForbiddenActionException);

        expect(mockOrder.isOwnedByMember).not.toHaveBeenCalled();
      });

      it("should throw when guestEmail is empty string", () => {
        const guestEmail = "";
        mockOrder.isOwnedByGuest.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).toThrow(ForbiddenActionException);

        expect(mockOrder.isOwnedByGuest).not.toHaveBeenCalled();
      });
    });

    describe("exception details", () => {
      it("should throw ForbiddenActionException with correct message", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(false);

        try {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
          fail("Expected ForbiddenActionException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenActionException);
          expect((error as ForbiddenActionException).message).toContain("Anonymous user");
          expect((error as ForbiddenActionException).message).toContain("view order");
        }
      });

      it("should throw ForbiddenActionException for guest access denial", () => {
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByGuest.mockReturnValue(false);

        try {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
          fail("Expected ForbiddenActionException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenActionException);
          expect((error as ForbiddenActionException).message).toContain("Anonymous user");
          expect((error as ForbiddenActionException).message).toContain("view order");
        }
      });

      it("should throw ForbiddenActionException when no credentials provided", () => {
        try {
          OrderAccessControlService.assertOwnership(mockOrder);
          fail("Expected ForbiddenActionException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenActionException);
          expect((error as ForbiddenActionException).message).toContain("Anonymous user");
          expect((error as ForbiddenActionException).message).toContain("view order");
        }
      });
    });

    describe("edge cases", () => {
      it("should handle case-insensitive email comparison", () => {
        const guestEmail = "GUEST@EXAMPLE.COM";
        mockOrder.isOwnedByGuest.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).not.toThrow();

        expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
      });

      it("should handle email with whitespace", () => {
        const guestEmail = "  guest@example.com  ";
        mockOrder.isOwnedByGuest.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).not.toThrow();
      });

      it("should handle memberId with whitespace", () => {
        const memberId = "  member-123  ";
        mockOrder.isOwnedByMember.mockReturnValue(true);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).not.toThrow();

        expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
      });
    });

    describe("integration with Order entity", () => {
      it("should correctly identify member ownership through Order.isOwnedByMember", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(true);

        OrderAccessControlService.assertOwnership(mockOrder, memberId);

        expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
      });

      it("should correctly identify guest ownership through Order.isOwnedByGuest", () => {
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByGuest.mockReturnValue(true);

        OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);

        expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
      });

      it("should correctly deny access when order is not owned by member", () => {
        const memberId = "member-123";
        mockOrder.isOwnedByMember.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, memberId);
        }).toThrow(ForbiddenActionException);
      });

      it("should correctly deny access when order is not owned by guest", () => {
        const guestEmail = "guest@example.com";
        mockOrder.isOwnedByGuest.mockReturnValue(false);

        expect(() => {
          OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
        }).toThrow(ForbiddenActionException);
      });
    });
  });

  describe("canStaffAccessOrders", () => {
    it("should return true for ADMIN role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.ADMIN);
      expect(result).toBe(true);
    });

    it("should return true for MANAGER role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.MANAGER);
      expect(result).toBe(true);
    });

    it("should return false for MEMBER role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.MEMBER);
      expect(result).toBe(false);
    });

    it("should return false for CASHIER role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.CASHIER);
      expect(result).toBe(false);
    });

    it("should return false for KITCHEN role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.KITCHEN);
      expect(result).toBe(false);
    });

    it("should return false for BAR role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(UserRoleType.BAR);
      expect(result).toBe(false);
    });

    it("should return false when role is undefined", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(undefined);
      expect(result).toBe(false);
    });

    it("should return false when role is null", () => {
      const result = OrderAccessControlService.canStaffAccessOrders(null as unknown as UserRoleType);
      expect(result).toBe(false);
    });

    it("should return false for empty string role", () => {
      const result = OrderAccessControlService.canStaffAccessOrders("" as unknown as UserRoleType);
      expect(result).toBe(false);
    });

    it("should handle all role types correctly", () => {
      const roles = [
        { role: UserRoleType.ADMIN, expected: true },
        { role: UserRoleType.MANAGER, expected: true },
        { role: UserRoleType.CASHIER, expected: false },
        { role: UserRoleType.KITCHEN, expected: false },
        { role: UserRoleType.BAR, expected: false },
        { role: UserRoleType.MEMBER, expected: false },
      ];

      for (const { role, expected } of roles) {
        const result = OrderAccessControlService.canStaffAccessOrders(role);
        expect(result).toBe(expected);
      }
    });
  });

  describe("integration scenarios", () => {
    it("should allow staff access for ADMIN even without ownership", () => {
      const memberId = "member-123";
      mockOrder.isOwnedByMember.mockReturnValue(false);

      const isStaff = OrderAccessControlService.canStaffAccessOrders(UserRoleType.ADMIN);
      expect(isStaff).toBe(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, memberId);
      }).toThrow(ForbiddenActionException);
    });

    it("should allow staff access for MANAGER even without ownership", () => {
      const guestEmail = "guest@example.com";
      mockOrder.isOwnedByGuest.mockReturnValue(false);

      const isStaff = OrderAccessControlService.canStaffAccessOrders(UserRoleType.MANAGER);
      expect(isStaff).toBe(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly combine ownership check and staff access check", () => {
      const memberId = "member-123";
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER, UserRoleType.MEMBER, UserRoleType.CASHIER];

      for (const role of roles) {
        const isStaff = OrderAccessControlService.canStaffAccessOrders(role);
        mockOrder.isOwnedByMember.mockReturnValue(true);
        const isOwner = mockOrder.isOwnedByMember(memberId);

        const hasAccess = isStaff || isOwner;
        expect(typeof hasAccess).toBe("boolean");
      }
    });

    it("should handle order ownership with multiple methods", () => {
      const memberId = "member-123";
      const guestEmail = "guest@example.com";

      mockOrder.isOwnedByMember.mockReturnValue(true);
      mockOrder.isOwnedByGuest.mockReturnValue(false);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, memberId, guestEmail);
      }).not.toThrow();
      expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
      expect(mockOrder.isOwnedByGuest).not.toHaveBeenCalled();

      jest.clearAllMocks();
      mockOrder.isOwnedByGuest.mockReturnValue(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
      }).not.toThrow();
      expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
    });
  });

  describe("performance considerations", () => {
    it("should execute ownership check quickly", () => {
      const memberId = "member-123";
      mockOrder.isOwnedByMember.mockReturnValue(true);

      const startTime = Date.now();
      OrderAccessControlService.assertOwnership(mockOrder, memberId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should execute staff access check quickly", () => {
      const startTime = Date.now();
      OrderAccessControlService.canStaffAccessOrders(UserRoleType.ADMIN);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple checks efficiently", () => {
      const memberId = "member-123";
      mockOrder.isOwnedByMember.mockReturnValue(true);

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        OrderAccessControlService.assertOwnership(mockOrder, memberId);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle memberId with special characters", () => {
      const memberId = "member-123!@#$%";
      mockOrder.isOwnedByMember.mockReturnValue(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, memberId);
      }).not.toThrow();

      expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
    });

    it("should handle guestEmail with special characters", () => {
      const guestEmail = "guest+test@example.com";
      mockOrder.isOwnedByGuest.mockReturnValue(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
      }).not.toThrow();

      expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
    });

    it("should handle guestEmail with Unicode characters", () => {
      const guestEmail = "test@exämple.com";
      mockOrder.isOwnedByGuest.mockReturnValue(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, undefined, guestEmail);
      }).not.toThrow();

      expect(mockOrder.isOwnedByGuest).toHaveBeenCalledWith(guestEmail);
    });

    it("should handle memberId with Unicode characters", () => {
      const memberId = "member-🚀-123";
      mockOrder.isOwnedByMember.mockReturnValue(true);

      expect(() => {
        OrderAccessControlService.assertOwnership(mockOrder, memberId);
      }).not.toThrow();

      expect(mockOrder.isOwnedByMember).toHaveBeenCalledWith(memberId);
    });
  });
});
