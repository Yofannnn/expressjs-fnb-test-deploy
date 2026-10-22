import { DeliveryFeeCalculatorService } from "@/domain/services/delivery-fee-calculator.service";
import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { Money } from "@/domain/value-objects/money.vo";
import { DeliveryDistanceExceededException } from "@/domain/exceptions/order.exceptions";

describe("DeliveryFeeCalculatorService", () => {
  const defaultPolicy: DeliveryFeePolicy = {
    freeDeliveryRadiusKm: 3,
    baseFee: 15000,
    perKmRateBeyondBase: 2000,
    baseFeeCoversUpToKm: 5,
    maxDeliveryDistanceKm: 20,
  };

  describe("calculate", () => {
    it("should return zero fee when distance is within free delivery radius", () => {
      const distances = [0, 1, 2, 3];

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        expect(result).toBeInstanceOf(Money);
        expect(result.isZero()).toBe(true);
        expect(result.getAmount()).toBe(0);
      }
    });

    it("should return base fee when distance is within base fee coverage", () => {
      const distances = [3.1, 4, 5];

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        expect(result).toBeInstanceOf(Money);
        expect(result.getAmount()).toBe(defaultPolicy.baseFee);
      }
    });

    it("should calculate fee for distances beyond base fee coverage", () => {
      const testCases = [
        { distance: 5.1, expected: 15000 + 1 * 2000 },
        { distance: 6, expected: 15000 + 1 * 2000 },
        { distance: 7, expected: 15000 + 2 * 2000 },
        { distance: 10, expected: 15000 + 5 * 2000 },
        { distance: 15, expected: 15000 + 10 * 2000 },
      ];

      for (const testCase of testCases) {
        const result = DeliveryFeeCalculatorService.calculate(testCase.distance, defaultPolicy);
        expect(result).toBeInstanceOf(Money);
        expect(result.getAmount()).toBe(testCase.expected);
      }
    });

    it("should round up extra kilometers using Math.ceil", () => {
      const testCases = [
        { distance: 5.1, expected: 6 },
        { distance: 5.9, expected: 6 },
        { distance: 6.0, expected: 6 },
        { distance: 6.1, expected: 7 },
        { distance: 6.9, expected: 7 },
      ];

      for (const testCase of testCases) {
        const result = DeliveryFeeCalculatorService.calculate(testCase.distance, defaultPolicy);
        const expectedFee = 15000 + (testCase.expected - 5) * 2000;
        expect(result.getAmount()).toBe(expectedFee);
      }
    });

    it("should throw DeliveryDistanceExceededException when distance exceeds max", () => {
      const distances = [20.1, 25, 100];

      for (const distance of distances) {
        expect(() => {
          DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        }).toThrow(DeliveryDistanceExceededException);
      }
    });

    it("should throw DeliveryDistanceExceededException with correct message", () => {
      const distance = 25;
      const maxDistance = 20;

      try {
        DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        fail("Expected DeliveryDistanceExceededException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DeliveryDistanceExceededException);
        expect((error as DeliveryDistanceExceededException).message).toContain(distance.toString());
        expect((error as DeliveryDistanceExceededException).message).toContain(maxDistance.toString());
      }
    });

    it("should handle exact max distance without throwing", () => {
      const result = DeliveryFeeCalculatorService.calculate(20, defaultPolicy);
      expect(result).toBeInstanceOf(Money);
      expect(result.getAmount()).toBe(15000 + 15 * 2000);
    });

    it("should handle distance exactly at free delivery radius", () => {
      const result = DeliveryFeeCalculatorService.calculate(3, defaultPolicy);
      expect(result.isZero()).toBe(true);
    });

    it("should handle distance exactly at base fee coverage limit", () => {
      const result = DeliveryFeeCalculatorService.calculate(5, defaultPolicy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee);
    });

    it("should handle distance just above free delivery radius", () => {
      const result = DeliveryFeeCalculatorService.calculate(3.01, defaultPolicy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee);
    });

    it("should handle distance just above base fee coverage", () => {
      const result = DeliveryFeeCalculatorService.calculate(5.01, defaultPolicy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee + 1 * defaultPolicy.perKmRateBeyondBase);
    });
  });

  describe("with different policy configurations", () => {
    it("should work with different free delivery radius", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        freeDeliveryRadiusKm: 5,
      };

      const result = DeliveryFeeCalculatorService.calculate(4, policy);
      expect(result.isZero()).toBe(true);

      const resultWithFee = DeliveryFeeCalculatorService.calculate(6, policy);
      const expectedFee = defaultPolicy.baseFee + (6 - defaultPolicy.baseFeeCoversUpToKm) * defaultPolicy.perKmRateBeyondBase;
      expect(resultWithFee.getAmount()).toBe(expectedFee);
    });

    it("should work with different base fee", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        baseFee: 25000,
      };

      const result = DeliveryFeeCalculatorService.calculate(4, policy);
      expect(result.getAmount()).toBe(25000);
    });

    it("should work with different per km rate", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        perKmRateBeyondBase: 3000,
      };

      const result = DeliveryFeeCalculatorService.calculate(7, policy);
      expect(result.getAmount()).toBe(15000 + 2 * 3000);
    });

    it("should work with different base fee coverage", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        baseFeeCoversUpToKm: 10,
      };

      const result = DeliveryFeeCalculatorService.calculate(8, policy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee);

      const resultWithExtra = DeliveryFeeCalculatorService.calculate(12, policy);
      expect(resultWithExtra.getAmount()).toBe(15000 + 2 * 2000);
    });

    it("should work with different max delivery distance", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        maxDeliveryDistanceKm: 10,
      };

      expect(() => {
        DeliveryFeeCalculatorService.calculate(11, policy);
      }).toThrow(DeliveryDistanceExceededException);

      const result = DeliveryFeeCalculatorService.calculate(10, policy);
      expect(result).toBeInstanceOf(Money);
    });

    it("should work with zero free delivery radius", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        freeDeliveryRadiusKm: 0,
      };

      const result = DeliveryFeeCalculatorService.calculate(0.1, policy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee);
    });

    it("should work with zero base fee", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        baseFee: 0,
        perKmRateBeyondBase: 1000,
        baseFeeCoversUpToKm: 0,
      };

      const result = DeliveryFeeCalculatorService.calculate(5, policy);
      expect(result.getAmount()).toBe(5 * 1000);
    });

    it("should work with zero per km rate", () => {
      const policy: DeliveryFeePolicy = {
        ...defaultPolicy,
        perKmRateBeyondBase: 0,
      };

      const result = DeliveryFeeCalculatorService.calculate(10, policy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee);
    });
  });

  describe("edge cases", () => {
    it("should handle zero distance", () => {
      const result = DeliveryFeeCalculatorService.calculate(0, defaultPolicy);
      expect(result.isZero()).toBe(true);
    });

    it("should handle negative distance (should still work logically)", () => {
      const result = DeliveryFeeCalculatorService.calculate(-1, defaultPolicy);
      expect(result.isZero()).toBe(true);
    });

    it("should handle very large distance", () => {
      const distance = 1000;
      expect(() => {
        DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
      }).toThrow(DeliveryDistanceExceededException);
    });

    it("should handle distance with many decimal places", () => {
      const result = DeliveryFeeCalculatorService.calculate(5.123456, defaultPolicy);
      expect(result.getAmount()).toBe(defaultPolicy.baseFee + 1 * defaultPolicy.perKmRateBeyondBase);
    });

    it("should handle policy with very small values", () => {
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 0.5,
        baseFee: 100,
        perKmRateBeyondBase: 50,
        baseFeeCoversUpToKm: 1,
        maxDeliveryDistanceKm: 10,
      };

      const result = DeliveryFeeCalculatorService.calculate(1.5, policy);
      expect(result.getAmount()).toBe(100 + 1 * 50);
    });

    it("should handle policy with very large values", () => {
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 100,
        baseFee: 100000,
        perKmRateBeyondBase: 50000,
        baseFeeCoversUpToKm: 200,
        maxDeliveryDistanceKm: 1000,
      };

      const result = DeliveryFeeCalculatorService.calculate(150, policy);
      expect(result.getAmount()).toBe(100000);

      const resultWithFee = DeliveryFeeCalculatorService.calculate(250, policy);
      expect(resultWithFee.getAmount()).toBe(100000 + 50 * 50000);
    });

    it("should handle distance exactly at max with fee calculation", () => {
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 3,
        baseFee: 15000,
        perKmRateBeyondBase: 2000,
        baseFeeCoversUpToKm: 5,
        maxDeliveryDistanceKm: 10,
      };

      const result = DeliveryFeeCalculatorService.calculate(10, policy);
      expect(result.getAmount()).toBe(15000 + 5 * 2000);
    });
  });

  describe("Money value object integration", () => {
    it("should return Money instance with correct amount", () => {
      const result = DeliveryFeeCalculatorService.calculate(7, defaultPolicy);
      expect(result).toBeInstanceOf(Money);
      expect(result.getAmount()).toBe(15000 + 2 * 2000);
    });

    it("should return Money instance that supports operations", () => {
      const fee = DeliveryFeeCalculatorService.calculate(7, defaultPolicy);
      const doubled = fee.multiply(2);
      expect(doubled.getAmount()).toBe(fee.getAmount() * 2);
    });

    it("should return Money instance that can be compared", () => {
      const fee1 = DeliveryFeeCalculatorService.calculate(4, defaultPolicy);
      const fee2 = DeliveryFeeCalculatorService.calculate(7, defaultPolicy);

      expect(fee1.isLessThan(fee2)).toBe(true);
      expect(fee2.isGreaterThan(fee1)).toBe(true);
    });

    it("should return Money zero for free delivery", () => {
      const result = DeliveryFeeCalculatorService.calculate(2, defaultPolicy);
      expect(result.isZero()).toBe(true);
      expect(result).toEqual(Money.zero());
    });
  });

  describe("integration scenarios", () => {
    it("should calculate fees for a range of distances correctly", () => {
      const expectedResults = [
        { distance: 0, expected: 0 },
        { distance: 1, expected: 0 },
        { distance: 3, expected: 0 },
        { distance: 3.5, expected: 15000 },
        { distance: 5, expected: 15000 },
        { distance: 5.5, expected: 17000 },
        { distance: 6, expected: 17000 },
        { distance: 7, expected: 19000 },
        { distance: 10, expected: 25000 },
        { distance: 15, expected: 35000 },
        { distance: 20, expected: 45000 },
      ];

      for (const testCase of expectedResults) {
        const result = DeliveryFeeCalculatorService.calculate(testCase.distance, defaultPolicy);
        expect(result.getAmount()).toBe(testCase.expected);
      }
    });

    it("should throw for distances beyond max in integration", () => {
      const distances = [20.1, 21, 25, 50, 100];

      for (const distance of distances) {
        expect(() => {
          DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        }).toThrow(DeliveryDistanceExceededException);
      }
    });

    it("should handle different policies in sequence", () => {
      const policies: DeliveryFeePolicy[] = [
        { freeDeliveryRadiusKm: 1, baseFee: 10000, perKmRateBeyondBase: 1000, baseFeeCoversUpToKm: 3, maxDeliveryDistanceKm: 10 },
        { freeDeliveryRadiusKm: 2, baseFee: 20000, perKmRateBeyondBase: 2000, baseFeeCoversUpToKm: 5, maxDeliveryDistanceKm: 15 },
        { freeDeliveryRadiusKm: 3, baseFee: 15000, perKmRateBeyondBase: 1500, baseFeeCoversUpToKm: 4, maxDeliveryDistanceKm: 20 },
      ];

      for (const policy of policies) {
        const result = DeliveryFeeCalculatorService.calculate(5, policy);
        expect(result).toBeInstanceOf(Money);
        expect(result.getAmount()).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle all edge cases with a single policy", () => {
      const distances = [0, 2.5, 3, 3.5, 5, 5.5, 10, 15, 20];
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 3,
        baseFee: 15000,
        perKmRateBeyondBase: 2000,
        baseFeeCoversUpToKm: 5,
        maxDeliveryDistanceKm: 20,
      };

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, policy);
        expect(result).toBeInstanceOf(Money);
        expect(result.getAmount()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("exception details", () => {
    it("should throw DeliveryDistanceExceededException with correct distance and max", () => {
      const distance = 25;
      const maxDistance = 20;

      try {
        DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        fail("Expected DeliveryDistanceExceededException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DeliveryDistanceExceededException);
        expect((error as DeliveryDistanceExceededException).message).toContain(distance.toString());
        expect((error as DeliveryDistanceExceededException).message).toContain(maxDistance.toString());
      }
    });

    it("should include distance in exception", () => {
      const distance = 30;

      try {
        DeliveryFeeCalculatorService.calculate(distance, defaultPolicy);
        fail("Expected DeliveryDistanceExceededException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DeliveryDistanceExceededException);
        expect((error as DeliveryDistanceExceededException).message).toContain(distance.toString());
      }
    });

    it("should include max delivery distance in exception", () => {
      const maxDistance = defaultPolicy.maxDeliveryDistanceKm;

      try {
        DeliveryFeeCalculatorService.calculate(maxDistance + 1, defaultPolicy);
        fail("Expected DeliveryDistanceExceededException was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DeliveryDistanceExceededException);
        expect((error as DeliveryDistanceExceededException).message).toContain(maxDistance.toString());
      }
    });
  });

  describe("Money result verification", () => {
    it("should always return Money instance", () => {
      const distances = [0, 1, 3, 3.5, 5, 7, 10, 15, 20];
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 3,
        baseFee: 15000,
        perKmRateBeyondBase: 2000,
        baseFeeCoversUpToKm: 5,
        maxDeliveryDistanceKm: 20,
      };

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, policy);
        expect(result).toBeInstanceOf(Money);
      }
    });

    it("should return Money with non-negative amount", () => {
      const distances = [0, 1, 3, 3.5, 5, 7, 10, 15, 20];
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 3,
        baseFee: 15000,
        perKmRateBeyondBase: 2000,
        baseFeeCoversUpToKm: 5,
        maxDeliveryDistanceKm: 20,
      };

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, policy);
        expect(result.getAmount()).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return Money with integer amount", () => {
      const distances = [3.5, 5.5, 7.5, 10.5];
      const policy: DeliveryFeePolicy = {
        freeDeliveryRadiusKm: 3,
        baseFee: 15000,
        perKmRateBeyondBase: 2000,
        baseFeeCoversUpToKm: 5,
        maxDeliveryDistanceKm: 20,
      };

      for (const distance of distances) {
        const result = DeliveryFeeCalculatorService.calculate(distance, policy);
        expect(Number.isInteger(result.getAmount())).toBe(true);
      }
    });
  });
});
