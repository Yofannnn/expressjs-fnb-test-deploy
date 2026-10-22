import { OrderQuantityValidatorService } from "@/domain/services/order-quantity-validator.service";
import { OrderConstraintPolicy } from "@/domain/policies/order-constraint.policy";
import { MinimumOrderQuantityNotMetException } from "@/domain/exceptions/order.exceptions";

describe("OrderQuantityValidatorService", () => {
  let mockPolicy: jest.Mocked<OrderConstraintPolicy>;

  beforeEach(() => {
    mockPolicy = {
      minimumOrderQuantity: 1,
      maximumOrderQuantity: 100,
      getMinimumOrderQuantity: jest.fn(),
      getMaximumOrderQuantity: jest.fn(),
      validateQuantity: jest.fn(),
      isQuantityValid: jest.fn(),
    } as unknown as jest.Mocked<OrderConstraintPolicy>;
  });

  describe("assertMinimumQuantityMet", () => {
    describe("successful validation", () => {
      it("should not throw when total quantity equals minimum order quantity", () => {
        const minimumQuantity = 1;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(minimumQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should not throw when total quantity is greater than minimum order quantity", () => {
        const minimumQuantity = 1;
        const totalQuantity = 5;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should not throw with larger minimum quantity", () => {
        const minimumQuantity = 10;
        const totalQuantity = 10;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should not throw with very large quantities", () => {
        const minimumQuantity = 1000;
        const totalQuantity = 5000;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should not throw with zero minimum quantity", () => {
        const minimumQuantity = 0;
        const totalQuantity = 0;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should not throw when total quantity is exactly at minimum with large number", () => {
        const minimumQuantity = 99999;
        const totalQuantity = 99999;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });
    });

    describe("validation failures", () => {
      it("should throw MinimumOrderQuantityNotMetException when total quantity is less than minimum", () => {
        const minimumQuantity = 5;
        const totalQuantity = 3;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw MinimumOrderQuantityNotMetException with correct error message", () => {
        const minimumQuantity = 10;
        const totalQuantity = 4;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        try {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
          fail("Expected MinimumOrderQuantityNotMetException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(MinimumOrderQuantityNotMetException);
          expect((error as MinimumOrderQuantityNotMetException).message).toContain(minimumQuantity.toString());
          expect((error as MinimumOrderQuantityNotMetException).message).toContain(totalQuantity.toString());
        }
      });

      it("should throw when total quantity is 0 and minimum is greater than 0", () => {
        const minimumQuantity = 1;
        const totalQuantity = 0;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw when total quantity is negative and minimum is positive", () => {
        const minimumQuantity = 1;
        const totalQuantity = -5;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw when total quantity is negative and minimum is 0", () => {
        const minimumQuantity = 0;
        const totalQuantity = -1;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw when total quantity is just below minimum by 1", () => {
        const minimumQuantity = 10;
        const totalQuantity = 9;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw with large minimum quantity and small total", () => {
        const minimumQuantity = 10000;
        const totalQuantity = 1;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should throw with decimal quantities when minimum is integer", () => {
        const minimumQuantity = 5;
        const totalQuantity = 4.5;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });
    });

    describe("policy interactions", () => {
      it("should read minimumOrderQuantity from policy", () => {
        const minimumQuantity = 3;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        OrderQuantityValidatorService.assertMinimumQuantityMet(5, mockPolicy);

        expect(mockPolicy.minimumOrderQuantity).toBe(minimumQuantity);
      });

      it("should use different policy instances correctly", () => {
        const policy1: OrderConstraintPolicy = {
          minimumOrderQuantity: 1,
          maximumOrderQuantity: 10,
        } as unknown as OrderConstraintPolicy;

        const policy2: OrderConstraintPolicy = {
          minimumOrderQuantity: 5,
          maximumOrderQuantity: 20,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(3, policy1);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(3, policy2);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should work with policy that has minimumOrderQuantity as getter", () => {
        const policyWithGetter = {
          get minimumOrderQuantity() {
            return 5;
          },
          maximumOrderQuantity: 100,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(5, policyWithGetter);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(4, policyWithGetter);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should work with policy that has minimumOrderQuantity as method", () => {
        const policyWithMethod = {
          getMinimumOrderQuantity: jest.fn().mockReturnValue(5),
          getMaximumOrderQuantity: jest.fn(),
          validateQuantity: jest.fn(),
          isQuantityValid: jest.fn(),
        } as unknown as OrderConstraintPolicy;

        (policyWithMethod as unknown as { minimumOrderQuantity: number }).minimumOrderQuantity = 5;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(5, policyWithMethod);
        }).not.toThrow();
      });
    });

    describe("edge cases", () => {
      it("should handle minimum quantity of 0", () => {
        mockPolicy.minimumOrderQuantity = 0;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(0, mockPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(-1, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should handle minimum quantity of 1", () => {
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(1, mockPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(0, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should handle very large total quantity", () => {
        mockPolicy.minimumOrderQuantity = 1;
        const largeQuantity = Number.MAX_SAFE_INTEGER;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(largeQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should handle very large minimum quantity", () => {
        const largeMinimum = Number.MAX_SAFE_INTEGER - 1;
        mockPolicy.minimumOrderQuantity = largeMinimum;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(largeMinimum, mockPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(largeMinimum - 1, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should handle NaN total quantity", () => {
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(NaN, mockPolicy);
        }).not.toThrow();
      });

      it("should handle Infinity total quantity", () => {
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(Infinity, mockPolicy);
        }).not.toThrow();
      });

      it("should handle undefined total quantity", () => {
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(undefined as unknown as number, mockPolicy);
        }).not.toThrow();
      });

      it("should handle null total quantity", () => {
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(null as unknown as number, mockPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });
    });

    describe("exception details", () => {
      it("should include minimum quantity in exception", () => {
        const minimumQuantity = 7;
        const totalQuantity = 3;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        try {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(MinimumOrderQuantityNotMetException);
          const exception = error as MinimumOrderQuantityNotMetException;
          expect(exception.message).toContain(minimumQuantity.toString());
        }
      });

      it("should include total quantity in exception", () => {
        const minimumQuantity = 7;
        const totalQuantity = 3;
        mockPolicy.minimumOrderQuantity = minimumQuantity;

        try {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(MinimumOrderQuantityNotMetException);
          const exception = error as MinimumOrderQuantityNotMetException;
          expect(exception.message).toContain(totalQuantity.toString());
        }
      });
    });

    describe("performance considerations", () => {
      it("should execute validation quickly", () => {
        mockPolicy.minimumOrderQuantity = 1;

        const startTime = Date.now();
        OrderQuantityValidatorService.assertMinimumQuantityMet(5, mockPolicy);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should handle multiple validations efficiently", () => {
        mockPolicy.minimumOrderQuantity = 1;

        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          OrderQuantityValidatorService.assertMinimumQuantityMet(i + 1, mockPolicy);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe("type safety", () => {
      it("should accept number for totalQuantity", () => {
        const totalQuantity = 5;
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should accept OrderConstraintPolicy for policy", () => {
        const policy: OrderConstraintPolicy = {
          minimumOrderQuantity: 1,
          maximumOrderQuantity: 100,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(5, policy);
        }).not.toThrow();
      });

      it("should return void", () => {
        mockPolicy.minimumOrderQuantity = 1;
        const result = OrderQuantityValidatorService.assertMinimumQuantityMet(5, mockPolicy);

        expect(result).toBeUndefined();
      });
    });

    describe("integration scenarios", () => {
      it("should work with real OrderConstraintPolicy", () => {
        const realPolicy = {
          minimumOrderQuantity: 3,
          maximumOrderQuantity: 50,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(3, realPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(2, realPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should work with policy having min quantity from business rules", () => {
        const businessPolicy = {
          minimumOrderQuantity: 10,
          maximumOrderQuantity: 100,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(15, businessPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(9, businessPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should handle bulk order scenario", () => {
        const bulkPolicy = {
          minimumOrderQuantity: 50,
          maximumOrderQuantity: 1000,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(50, bulkPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(49, bulkPolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(100, bulkPolicy);
        }).not.toThrow();
      });

      it("should handle sample order scenario", () => {
        const samplePolicy = {
          minimumOrderQuantity: 1,
          maximumOrderQuantity: 5,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(1, samplePolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(0, samplePolicy);
        }).toThrow(MinimumOrderQuantityNotMetException);
      });

      it("should handle seasonal promotion scenario", () => {
        const promotionPolicy = {
          minimumOrderQuantity: 0,
          maximumOrderQuantity: 100,
        } as unknown as OrderConstraintPolicy;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(0, promotionPolicy);
        }).not.toThrow();

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(1, promotionPolicy);
        }).not.toThrow();
      });
    });

    describe("validation with different quantity types", () => {
      it("should handle total quantity as integer", () => {
        const totalQuantity = 5;
        mockPolicy.minimumOrderQuantity = 5;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should handle total quantity as float", () => {
        const totalQuantity = 5.5;
        mockPolicy.minimumOrderQuantity = 5;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should handle total quantity as string number", () => {
        const totalQuantity = "5" as unknown as number;
        mockPolicy.minimumOrderQuantity = 5;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });

      it("should handle total quantity as boolean", () => {
        const totalQuantity = true as unknown as number;
        mockPolicy.minimumOrderQuantity = 1;

        expect(() => {
          OrderQuantityValidatorService.assertMinimumQuantityMet(totalQuantity, mockPolicy);
        }).not.toThrow();
      });
    });
  });
});
