import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";
import { UserRoleType } from "@/domain/types/user.type";

describe("ProductCategoryAccessControlService", () => {
  describe("assertCanCreate", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should not throw for MANAGER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MANAGER);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("create product categories");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for empty string role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate("" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle case sensitivity - ADMIN works", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should handle case sensitivity - lowercase admin throws", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate("admin" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertCanUpdate", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should not throw for MANAGER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("update product categories");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for empty string role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate("" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertCanDelete", () => {
    it("should not throw for ADMIN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should throw ForbiddenActionException for MANAGER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for CASHIER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for KITCHEN role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for BAR role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for MEMBER role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException with correct message", () => {
      try {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
        expect((error as ForbiddenActionException).message).toContain("delete product categories");
      }
    });

    it("should throw ForbiddenActionException for undefined role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(undefined as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for null role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(null as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw ForbiddenActionException for empty string role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete("" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("assertRole (private method)", () => {
    it("should allow ADMIN for all operations", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }).not.toThrow();
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
      }).not.toThrow();
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should allow MANAGER for create and update but not delete", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MANAGER);
      }).not.toThrow();
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
      }).not.toThrow();
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow CASHIER for any category management", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow KITCHEN for any category management", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow BAR for any category management", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should not allow MEMBER for any category management", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("exception details", () => {
    it("should include the role in the exception message", () => {
      try {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MEMBER");
      }
    });

    it("should include the action in the exception message", () => {
      try {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("create product categories");
      }
    });

    it("should include different actions for different methods", () => {
      try {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect((error as ForbiddenActionException).message).toContain("update product categories");
      }

      try {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MEMBER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect((error as ForbiddenActionException).message).toContain("delete product categories");
      }
    });

    it("should include the role in exception for assertCanDelete", () => {
      try {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MANAGER);
        fail("Expected ForbiddenActionException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenActionException);
        expect((error as ForbiddenActionException).message).toContain("MANAGER");
        expect((error as ForbiddenActionException).message).toContain("delete product categories");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle role with whitespace", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(" ADMIN " as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with special characters", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate("ADMIN!@#" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with lowercase", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate("admin" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle role with uppercase and lowercase mix", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate("Admin" as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle numeric role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(1 as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle empty object as role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate({} as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });

    it("should handle array as role", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate([] as unknown as UserRoleType);
      }).toThrow(ForbiddenActionException);
    });
  });

  describe("performance", () => {
    it("should execute quickly for valid roles", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle many assertions efficiently", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("integration scenarios", () => {
    it("should correctly handle all allowed operations for ADMIN", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.ADMIN);
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.ADMIN);
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.ADMIN);
      }).not.toThrow();
    });

    it("should correctly handle allowed operations for MANAGER", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MANAGER);
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MANAGER);
      }).not.toThrow();

      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MANAGER);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for CASHIER (none allowed)", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.CASHIER);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for KITCHEN (none allowed)", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.KITCHEN);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for BAR (none allowed)", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.BAR);
      }).toThrow(ForbiddenActionException);
    });

    it("should correctly handle all operations for MEMBER (none allowed)", () => {
      expect(() => {
        ProductCategoryAccessControlService.assertCanCreate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanUpdate(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
      expect(() => {
        ProductCategoryAccessControlService.assertCanDelete(UserRoleType.MEMBER);
      }).toThrow(ForbiddenActionException);
    });

    it("should throw the correct exception type for all unauthorized operations", () => {
      const unauthorizedRoles = [UserRoleType.CASHIER, UserRoleType.KITCHEN, UserRoleType.BAR, UserRoleType.MEMBER];

      for (const role of unauthorizedRoles) {
        expect(() => {
          ProductCategoryAccessControlService.assertCanCreate(role);
        }).toThrow(ForbiddenActionException);

        expect(() => {
          ProductCategoryAccessControlService.assertCanUpdate(role);
        }).toThrow(ForbiddenActionException);

        expect(() => {
          ProductCategoryAccessControlService.assertCanDelete(role);
        }).toThrow(ForbiddenActionException);
      }
    });
  });

  describe("permission matrix", () => {
    it("should have correct permissions for all roles", () => {
      const roles = [
        { role: UserRoleType.ADMIN, canCreate: true, canUpdate: true, canDelete: true },
        { role: UserRoleType.MANAGER, canCreate: true, canUpdate: true, canDelete: false },
        { role: UserRoleType.CASHIER, canCreate: false, canUpdate: false, canDelete: false },
        { role: UserRoleType.KITCHEN, canCreate: false, canUpdate: false, canDelete: false },
        { role: UserRoleType.BAR, canCreate: false, canUpdate: false, canDelete: false },
        { role: UserRoleType.MEMBER, canCreate: false, canUpdate: false, canDelete: false },
      ];

      for (const { role, canCreate, canUpdate, canDelete } of roles) {
        if (canCreate) {
          expect(() => ProductCategoryAccessControlService.assertCanCreate(role)).not.toThrow();
        } else {
          expect(() => ProductCategoryAccessControlService.assertCanCreate(role)).toThrow(ForbiddenActionException);
        }

        if (canUpdate) {
          expect(() => ProductCategoryAccessControlService.assertCanUpdate(role)).not.toThrow();
        } else {
          expect(() => ProductCategoryAccessControlService.assertCanUpdate(role)).toThrow(ForbiddenActionException);
        }

        if (canDelete) {
          expect(() => ProductCategoryAccessControlService.assertCanDelete(role)).not.toThrow();
        } else {
          expect(() => ProductCategoryAccessControlService.assertCanDelete(role)).toThrow(ForbiddenActionException);
        }
      }
    });
  });
});
