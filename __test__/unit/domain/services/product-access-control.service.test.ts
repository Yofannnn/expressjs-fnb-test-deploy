import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { UserRoleType } from "@/domain/types/user.type";

describe("ProductAccessControlService", () => {
  describe("assertCanCreate", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should not throw for MANAGER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MANAGER);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("create products");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for empty string role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate("" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertCanUpdate", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should not throw for MANAGER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("update products");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductAccessControlService.assertCanUpdate(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertCanDelete", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for MANAGER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductAccessControlService.assertCanDelete(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("delete products");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductAccessControlService.assertCanDelete(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertCanManageStock", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should not throw for MANAGER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MANAGER);
      }).not.toThrow();
    });

    it("should not throw for CASHIER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.CASHIER);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("manage product stock");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertRole (private method)", () => {
    it("should allow ADMIN for all operations", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should allow MANAGER for create, update, and stock management but not delete", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MANAGER);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MANAGER);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should allow CASHIER for stock management only", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.CASHIER);
      }).not.toThrow();
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow KITCHEN for any product management", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow BAR for any product management", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow MEMBER for any product management", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("exception details", () => {
    it("should include the role in the exception message", () => {
      try {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
      }
    });

    it("should include the action in the exception message", () => {
      try {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("create products");
      }
    });

    it("should include different actions for different methods", () => {
      try {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect((error as ForbiddenActionException).message).toContain("update products");
      }

      try {
        ProductAccessControlService.assertCanDelete(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect((error as ForbiddenActionException).message).toContain("delete products");
      }

      try {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect((error as ForbiddenActionException).message).toContain("manage product stock");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle role with whitespace", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(" ADMIN " as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with special characters", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate("ADMIN!@#" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with lowercase", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate("admin" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with uppercase and lowercase mix", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate("Admin" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle numeric role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(1 as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle empty object as role", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate({} as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("performance", () => {
    it("should execute quickly for valid roles", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        ProductAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle many assertions efficiently", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        ProductAccessControlService.assertCanCreate(UserRoleType.ADMIN);
        ProductAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
        ProductAccessControlService.assertCanDelete(UserRoleType.ADMIN);
        ProductAccessControlService.assertCanManageStock(UserRoleType.CASHIER);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("integration scenarios", () => {
    it("should correctly handle all allowed operations for ADMIN", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.ADMIN);
        ProductAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
        ProductAccessControlService.assertCanDelete(UserRoleType.ADMIN);
        ProductAccessControlService.assertCanManageStock(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should correctly handle allowed operations for MANAGER", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MANAGER);
        ProductAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
        ProductAccessControlService.assertCanManageStock(UserRoleType.MANAGER);
      }).not.toThrow();

      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle allowed operations for CASHIER", () => {
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.CASHIER);
      }).not.toThrow();

      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for KITCHEN (none allowed)", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for BAR (none allowed)", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for MEMBER (none allowed)", () => {
      expect(() => {
        ProductAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductAccessControlService.assertCanManageStock(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });
  });
});
