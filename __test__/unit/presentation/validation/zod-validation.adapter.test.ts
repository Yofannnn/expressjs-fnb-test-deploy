import { ZodValidationAdapter } from "@/infrastructure/validation/zod-validation.adapter";
import { VALIDATION_EXCEPTIONS } from "@/application/exceptions/validation.exception";
import { ValidationExceptionDetails } from "@/application/types/exceptions/validation.exception.types";
import { ZodError, ZodType, z } from "zod";
import { AppException } from "@/application/exceptions/app.exception";

jest.mock("@/application/exceptions/validation.exception");
const mockedValidationErrors = VALIDATION_EXCEPTIONS as jest.Mocked<typeof VALIDATION_EXCEPTIONS>;

interface TestData {
  name: string;
  age: number;
  email?: string;
}

describe("ZodValidationAdapter", () => {
  let adapter: ZodValidationAdapter;
  let mockSchema: ZodType<TestData>;

  beforeEach(() => {
    adapter = new ZodValidationAdapter();

    mockSchema = z.object({
      name: z.string().min(1, "Name is required"),
      age: z.number().min(0, "Age must be positive"),
      email: z.string().email("Invalid email").optional(),
    });

    jest.clearAllMocks();
  });

  describe("Class structure", () => {
    it("should be defined", () => {
      expect(adapter).toBeDefined();
    });

    it("should implement IValidation interface", () => {
      expect(adapter).toBeInstanceOf(ZodValidationAdapter);
      expect(adapter.validate).toBeDefined();
    });
  });

  describe("validate method", () => {
    describe("successful validation", () => {
      it("should return validated data when input is valid", () => {
        const validData = {
          name: "John Doe",
          age: 30,
          email: "john@example.com",
        };

        const result = adapter.validate(mockSchema, validData);

        expect(result).toEqual(validData);
        expect(result.name).toBe("John Doe");
        expect(result.age).toBe(30);
        expect(result.email).toBe("john@example.com");
      });

      it("should return validated data when optional fields are missing", () => {
        const validData = {
          name: "Jane Doe",
          age: 25,
        };

        const result = adapter.validate(mockSchema, validData);

        expect(result).toEqual(validData);
        expect(result.name).toBe("Jane Doe");
        expect(result.age).toBe(25);
        expect(result.email).toBeUndefined();
      });

      it("should work with nested objects", () => {
        const nestedSchema = z.object({
          user: z.object({
            name: z.string(),
            address: z.object({
              street: z.string(),
              city: z.string(),
            }),
          }),
        });

        const validData = {
          user: {
            name: "John",
            address: {
              street: "123 Main St",
              city: "New York",
            },
          },
        };

        const result = adapter.validate(nestedSchema, validData);
        expect(result).toEqual(validData);
      });

      it("should work with arrays", () => {
        const arraySchema = z.object({
          ids: z.array(z.number()),
          tags: z.array(z.string()),
        });

        const validData = {
          ids: [1, 2, 3],
          tags: ["tag1", "tag2"],
        };

        const result = adapter.validate(arraySchema, validData);
        expect(result).toEqual(validData);
      });
    });

    describe("failed validation", () => {
      it("should throw validation error when data is invalid", () => {
        const invalidData = {
          name: "",
          age: -5,
        };

        const mockError = new Error("Validation failed");
        mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation(() => {
          throw mockError;
        });

        expect(() => {
          adapter.validate(mockSchema, invalidData);
        }).toThrow(mockError);
      });

      it("should pass correct requestId to validation error", () => {
        const invalidData = { name: "", age: -5 };
        const requestId = "test-123";

        mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation((reqId) => {
          expect(reqId).toBe(requestId);
          throw new Error("Validation error");
        });

        expect(() => {
          adapter.validate(mockSchema, invalidData);
        }).toThrow();
      });

      it("should pass normalized details to validation error", () => {
        const invalidData = { name: "", age: -5 };
        let capturedDetails: ValidationExceptionDetails;

        mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation((details) => {
          capturedDetails = details;
          throw new Error("Validation error");
        });

        try {
          adapter.validate(mockSchema, invalidData);
        } catch (error) {
          expect(error).toBeDefined();
        }

        expect(capturedDetails!).toBeDefined();
        expect(capturedDetails!.issues).toHaveLength(2);
        expect(capturedDetails!.totalIssues).toBe(2);
        expect(capturedDetails!.issues[0].field).toBe("name");
        expect(capturedDetails!.issues[0].message).toContain("Name is required");
        expect(capturedDetails!.issues[0].code).toBe("too_small");
        expect(capturedDetails!.issues[1].field).toBe("age");
        expect(capturedDetails!.issues[1].message).toContain("Age must be positive");
        expect(capturedDetails!.issues[1].code).toBe("too_small");
      });

      it("should handle root-level validation errors", () => {
        const rootSchema = z.string().min(5, "Too short");
        const invalidData = "abc";

        mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation(() => {
          throw new Error("Validation error");
        });

        expect(() => {
          adapter.validate(rootSchema, invalidData);
        }).toThrow();
      });

      it("should handle complex nested validation errors", () => {
        const complexSchema = z.object({
          users: z
            .array(
              z.object({
                name: z.string(),
                age: z.number(),
              }),
            )
            .min(1, "At least one user required"),
        });

        const invalidData = {
          users: [],
        };

        mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation(() => {
          throw new Error("Validation error");
        });

        expect(() => {
          adapter.validate(complexSchema, invalidData);
        }).toThrow();
      });
    });
  });

  describe("normalizeValidationDetails method", () => {
    it("should normalize ZodError details correctly", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["user", "name"],
          message: "Expected string, received number",
        },
        {
          code: "too_small",
          minimum: 0,
          type: "number",
          inclusive: true,
          path: ["user", "age"],
          message: "Age must be positive",
        },
        {
          code: "invalid_string",
          validation: "email",
          path: ["email"],
          message: "Invalid email",
        },
      ] as any);

      const result = adapter["normalizeValidationDetails"](zodError);

      expect(result.totalIssues).toBe(3);
      expect(result.issues).toHaveLength(3);
      expect(result.issues[0]).toEqual({
        field: "user.name",
        message: "Expected string, received number",
        code: "invalid_type",
        received: undefined,
        expected: "string",
      });

      expect(result.issues[1]).toEqual({
        field: "user.age",
        message: "Age must be positive",
        code: "too_small",
        received: undefined,
      });

      expect(result.issues[2]).toEqual({
        field: "email",
        message: "Invalid email",
        code: "invalid_string",
        received: undefined,
      });
    });

    it("should handle root-level errors", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "object",
          received: "string",
          path: [],
          message: "Expected object, received string",
        },
      ] as any);

      const result = adapter["normalizeValidationDetails"](zodError);

      expect(result.issues[0].field).toBe("root");
      expect(result.issues[0].message).toBe("Expected object, received string");
    });

    it("should include input data when available", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Expected string, received number",
          input: 123,
        },
      ] as any);

      const result = adapter["normalizeValidationDetails"](zodError);

      expect(result.issues[0].received).toBe(123);
    });

    it("should not add expected property for non-invalid_type errors", () => {
      const zodError = new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          path: ["name"],
          message: "Too short",
        },
      ] as any);

      const result = adapter["normalizeValidationDetails"](zodError);

      expect(result.issues[0].field).toBe("name");
      expect(result.issues[0].code).toBe("too_small");
      expect(result.issues[0]).not.toHaveProperty("expected");
    });
  });

  describe("createValidationError method", () => {
    it("should create validation error with normalized details", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Expected string, received number",
        },
      ] as any);

      const normalizeSpy = jest.spyOn(adapter as any, "normalizeValidationDetails");

      normalizeSpy.mockReturnValue({
        issues: [
          {
            field: "name",
            message: "Expected string, received number",
            code: "invalid_type",
          },
        ],
        totalIssues: 1,
      });

      const expectedError = AppException.create({
        name: "ValidationException",
        message: "Validation failed with 1 issue(s)",
        statusCode: 400,
        details: {
          issues: [
            {
              field: "name",
              message: "Expected string, received number",
              code: "invalid_type",
            },
          ],
          totalIssues: 1,
        },
      });

      mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation((details) => {
        expect(details.issues).toHaveLength(1);
        expect(details.totalIssues).toBe(1);

        return expectedError;
      });

      const error = adapter["createValidationError"](zodError);

      expect(error).toBe(expectedError);
      expect(normalizeSpy).toHaveBeenCalledWith(zodError);
      expect(mockedValidationErrors.SCHEMA_VALIDATION).toHaveBeenCalledWith(
        expect.objectContaining({
          totalIssues: 1,
          issues: expect.any(Array),
        }),
      );

      normalizeSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle empty path array as root", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "object",
          received: "array",
          path: [],
          message: "Expected object, received array",
        },
      ] as any);

      const result = adapter["normalizeValidationDetails"](zodError);
      expect(result.issues[0].field).toBe("root");
    });

    it("should handle null or undefined data", () => {
      const nullData = null;
      const undefinedData = undefined;

      mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation(() => {
        throw new Error("Validation error");
      });

      expect(() => {
        adapter.validate(mockSchema, nullData);
      }).toThrow();

      expect(() => {
        adapter.validate(mockSchema, undefinedData);
      }).toThrow();
    });

    it("should handle multiple validation errors in one field", () => {
      const strictSchema = z.object({
        password: z.string().min(8, "Password too short").regex(/[A-Z]/, "Must contain uppercase").regex(/[0-9]/, "Must contain number"),
      });

      const invalidData = { password: "weak" };

      mockedValidationErrors.SCHEMA_VALIDATION.mockImplementation(() => {
        throw new Error("Validation error");
      });

      expect(() => {
        adapter.validate(strictSchema, invalidData);
      }).toThrow();
    });
  });

  describe("type safety", () => {
    it("should return typed data after validation", () => {
      const typedSchema = z.object({
        id: z.number(),
        active: z.boolean(),
        timestamp: z.date(),
      });

      const rawData = {
        id: 123,
        active: true,
        timestamp: new Date("2024-01-01"),
      };

      const result = adapter.validate(typedSchema, rawData);

      expect(typeof result.id).toBe("number");
      expect(typeof result.active).toBe("boolean");
      expect(result.timestamp instanceof Date).toBe(true);
    });
  });
});
