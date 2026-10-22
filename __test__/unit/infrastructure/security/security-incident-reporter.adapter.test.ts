import { SecurityIncidentReporterAdapter } from "@/infrastructure/security/security-incident-reporter.adapter";
import { Severity } from "@/application/types/severity.enum";
import { SecurityIncidentType } from "@/application/ports/driven/security-incident-reporter";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { Logger } from "@/application/ports/driven/logger";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { RequestContext } from "@/application/ports/driven/request-context";

describe("SecurityIncidentReporterAdapter", () => {
  let mockDb: jest.Mocked<PrismaDatabaseClient>;
  let mockPrisma: jest.Mocked<any>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockRequestContext: jest.Mocked<RequestContext>;
  let mockLogger: jest.Mocked<Logger>;
  let reporter: SecurityIncidentReporterAdapter;

  const originalEnv = process.env.NODE_ENV;
  const mockId = "generated-id-123";
  const mockRequestId = "req-123";
  const mockIpAddress = "1.2.3.4";
  const mockUserAgent = "jest-agent";

  beforeEach(() => {
    process.env.NODE_ENV = "test-env";

    mockPrisma = {
      securityIncident: {
        create: jest.fn().mockResolvedValue({ id: "incident-123" }),
      },
    };

    mockDb = {
      getPrismaClient: jest.fn().mockResolvedValue(mockPrisma),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockId),
    } as jest.Mocked<IdGenerator>;

    mockRequestContext = {
      get: jest.fn().mockReturnValue({
        requestId: mockRequestId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      }),
    } as jest.Mocked<RequestContext>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    reporter = new SecurityIncidentReporterAdapter(mockDb, mockIdGenerator, mockRequestContext, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  const baseIncident = {
    incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
    severity: Severity.MEDIUM,
    userId: "user-1",
    email: "test@example.com",
    reason: "test reason",
    metadata: { x: 1 },
    attemptCount: 2,
  };

  describe("capture - successful incident reporting", () => {
    it("should insert a formatted incident into the database", async () => {
      await reporter.capture(baseIncident);

      expect(mockDb.getPrismaClient).toHaveBeenCalled();
      expect(mockPrisma.securityIncident.create).toHaveBeenCalledTimes(1);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;

      expect(createdData.environment).toBe("test-env");
      expect(createdData.alert).toBe(false);
      expect(createdData.occurredAt).toBeInstanceOf(Date);
      expect(createdData.incidentType).toBe(baseIncident.incidentType);
      expect(createdData.requestId).toBe(mockRequestId);
      expect(createdData.ipAddress).toBe(mockIpAddress);
      expect(createdData.userAgent).toBe(mockUserAgent);
      expect(createdData.email).toBe("test@example.com");
      expect(createdData.user).toEqual({ connect: { id: "user-1" } });
    });

    it("should use request context data for IP, userAgent, and requestId", async () => {
      const contextData = {
        requestId: "custom-req-456",
        ipAddress: "10.0.0.1",
        userAgent: "CustomAgent/1.0",
      };
      mockRequestContext.get.mockReturnValue(contextData);

      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.requestId).toBe("custom-req-456");
      expect(createdData.ipAddress).toBe("10.0.0.1");
      expect(createdData.userAgent).toBe("CustomAgent/1.0");
    });

    it("should log incident with correct severity level", async () => {
      await reporter.capture(baseIncident);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should use idGenerator to generate UUID", async () => {
      await reporter.capture(baseIncident);

      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(1);
    });

    it("should generate incident ID and include in log", async () => {
      await reporter.capture(baseIncident);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.data?.id).toBe(mockId);
    });

    it("should create incident with all required fields", async () => {
      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.incidentType).toBeDefined();
      expect(createdData.severity).toBeDefined();
      expect(createdData.environment).toBeDefined();
      expect(createdData.alert).toBeDefined();
      expect(createdData.occurredAt).toBeDefined();
    });
  });

  describe("logging by severity", () => {
    it("should log using 'info' for LOW severity", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.LOW,
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should log using 'warn' for MEDIUM severity", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.MEDIUM,
      });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it("should log using 'error' for HIGH severity", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.HIGH,
      });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("should log using 'error' for CRITICAL severity", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.CRITICAL,
      });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("should include logLevel in log data", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.HIGH,
      });

      const logCall = mockLogger.error.mock.calls[0][0];
      expect(logCall.data?.logLevel).toBe("error");
    });
  });

  describe("alert flag", () => {
    it("should mark alert=true for CRITICAL incidents", async () => {
      await reporter.capture({
        ...baseIncident,
        severity: Severity.CRITICAL,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.alert).toBe(true);
    });

    it("should mark alert=false for non-CRITICAL incidents", async () => {
      const severities = [Severity.LOW, Severity.MEDIUM, Severity.HIGH];

      for (const severity of severities) {
        await reporter.capture({
          ...baseIncident,
          severity,
        });

        const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
        expect(createdData.alert).toBe(false);
        mockPrisma.securityIncident.create.mockClear();
      }
    });
  });

  describe("user connection", () => {
    it("should connect user when userId is provided", async () => {
      await reporter.capture({
        ...baseIncident,
        userId: "user-123",
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.user).toEqual({ connect: { id: "user-123" } });
    });

    it("should not connect user when userId is missing", async () => {
      const payload = { ...baseIncident };
      const { userId, ...rest } = payload;

      await reporter.capture(rest);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.user).toBeUndefined();
    });

    it("should not connect user when userId is undefined", async () => {
      await reporter.capture({
        ...baseIncident,
        userId: undefined,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.user).toBeUndefined();
    });

    it("should not connect user when userId is null", async () => {
      await reporter.capture({
        ...baseIncident,
        userId: null as any,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.user).toBeUndefined();
    });
  });

  describe("environment handling", () => {
    it("should use NODE_ENV as environment", async () => {
      process.env.NODE_ENV = "production";

      const newReporter = new SecurityIncidentReporterAdapter(mockDb, mockIdGenerator, mockRequestContext, mockLogger);

      await newReporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.environment).toBe("production");
    });

    it("should use 'unknown' when NODE_ENV is not set", async () => {
      delete process.env.NODE_ENV;

      const newReporter = new SecurityIncidentReporterAdapter(mockDb, mockIdGenerator, mockRequestContext, mockLogger);

      await newReporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.environment).toBe("unknown");
    });

    it("should include environment in log data", async () => {
      process.env.NODE_ENV = "staging";

      const newReporter = new SecurityIncidentReporterAdapter(mockDb, mockIdGenerator, mockRequestContext, mockLogger);

      await newReporter.capture(baseIncident);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.data?.environment).toBe("staging");
    });
  });

  describe("metadata handling", () => {
    it("should handle metadata as Prisma InputJsonValue", async () => {
      const metadata = { nested: { value: "test", array: [1, 2, 3] } };

      await reporter.capture({
        ...baseIncident,
        metadata,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.metadata).toEqual(metadata);
    });

    it("should handle metadata with null values", async () => {
      const metadata = { key: null, nested: { value: null } };

      await reporter.capture({
        ...baseIncident,
        metadata,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.metadata).toEqual(metadata);
    });

    it("should handle metadata with undefined values (should be omitted)", async () => {
      const metadata = { key: undefined, nested: { value: "test" } };

      await reporter.capture({
        ...baseIncident,
        metadata,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.metadata).toEqual({ nested: { value: "test" } });
    });
  });

  describe("optional fields", () => {
    it("should include optional fields when provided", async () => {
      const incident = {
        ...baseIncident,
        reason: "Custom reason",
        attemptCount: 5,
        metadata: { key: "value" },
      };

      await reporter.capture(incident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.reason).toBe("Custom reason");
      expect(createdData.attemptCount).toBe(5);
      expect(createdData.metadata).toEqual({ key: "value" });
    });

    it("should omit optional fields when not provided", async () => {
      const incident = {
        incidentType: SecurityIncidentType.SUSPICIOUS_ACTIVITY,
        severity: Severity.LOW,
      };

      await reporter.capture(incident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.reason).toBeUndefined();
      expect(createdData.attemptCount).toBeUndefined();
      expect(createdData.metadata).toBeUndefined();
      expect(createdData.email).toBeUndefined();
      expect(createdData.user).toBeUndefined();
    });
  });

  describe("log structure", () => {
    it("should log with correct context and event", async () => {
      await reporter.capture(baseIncident);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.context).toBe("SecurityIncidentReporterAdapter");
      expect(logCall.event).toBe(baseIncident.incidentType);
      expect(logCall.message).toBe(`Security Incident: ${baseIncident.incidentType}`);
    });

    it("should include userId in log", async () => {
      await reporter.capture(baseIncident);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.userId).toBe("user-1");
    });

    it("should use 'anonymous' for userId when not provided", async () => {
      const incident = { ...baseIncident };
      const { userId, ...rest } = incident;

      await reporter.capture(rest);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.userId).toBe("anonymous");
    });

    it("should include all incident data in log", async () => {
      await reporter.capture(baseIncident);

      const logCall = mockLogger.warn.mock.calls[0][0];
      expect(logCall.data).toMatchObject({
        id: mockId,
        email: "test@example.com",
        severity: Severity.MEDIUM,
        alert: false,
        environment: "test-env",
        logLevel: "warn",
      });
    });
  });

  describe("error handling", () => {
    it("should handle database error and log it", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.securityIncident.create.mockRejectedValue(dbError);

      await expect(reporter.capture(baseIncident)).rejects.toThrow("Database connection failed");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "SecurityIncidentReporterAdapter",
        event: baseIncident.incidentType,
        message: "Failed to capture security incident",
        userId: "user-1",
        data: {
          id: mockId,
          email: "test@example.com",
          severity: baseIncident.severity,
          alert: false,
          environment: "test-env",
        },
        stack: expect.any(String),
      });
    });

    it("should handle database error with non-Error object", async () => {
      mockPrisma.securityIncident.create.mockRejectedValue("string error");

      await expect(reporter.capture(baseIncident)).rejects.toBe("string error");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "SecurityIncidentReporterAdapter",
        event: baseIncident.incidentType,
        message: "Failed to capture security incident",
        userId: "user-1",
        data: {
          id: mockId,
          email: "test@example.com",
          severity: baseIncident.severity,
          alert: false,
          environment: "test-env",
        },
        stack: undefined,
      });
    });

    it("should use 'anonymous' userId in error log when not provided", async () => {
      const incident = { ...baseIncident };
      const { userId, ...rest } = incident;
      mockPrisma.securityIncident.create.mockRejectedValue(new Error("DB error"));

      await expect(reporter.capture(rest)).rejects.toThrow("DB error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "anonymous",
        }),
      );
    });

    it("should use 'unknown-email' in error log when email not provided", async () => {
      const incident = { ...baseIncident };
      const { email, ...rest } = incident;
      mockPrisma.securityIncident.create.mockRejectedValue(new Error("DB error"));

      await expect(reporter.capture(rest)).rejects.toThrow("DB error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "unknown-email",
          }),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle request context with undefined values", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: undefined as unknown as string,
        ipAddress: undefined,
        userAgent: undefined,
      });

      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.requestId).toBeUndefined();
      expect(createdData.ipAddress).toBeUndefined();
      expect(createdData.userAgent).toBeUndefined();
    });

    it("should handle attemptCount as 0", async () => {
      await reporter.capture({
        ...baseIncident,
        attemptCount: 0,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.attemptCount).toBe(0);
    });

    it("should handle empty metadata", async () => {
      await reporter.capture({
        ...baseIncident,
        metadata: {},
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.metadata).toEqual({});
    });

    it("should handle very long reason string", async () => {
      const longReason = "a".repeat(10000);

      await reporter.capture({
        ...baseIncident,
        reason: longReason,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.reason).toBe(longReason);
    });

    it("should handle metadata with very large nested objects", async () => {
      const largeMetadata = { nested: { array: Array.from({ length: 1000 }, (_, i) => i) } };

      await reporter.capture({
        ...baseIncident,
        metadata: largeMetadata,
      });

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.metadata).toEqual(largeMetadata);
    });

    it("should handle all incident types", async () => {
      const incidentTypes = [
        SecurityIncidentType.AUTHENTICATION_FAILURE,
        SecurityIncidentType.AUTHENTICATION_SUCCESS,
        SecurityIncidentType.ACCOUNT_LOCKOUT,
        SecurityIncidentType.SESSION_HIJACKING,
        SecurityIncidentType.TOKEN_SECURITY_BREACH,
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        SecurityIncidentType.SUSPICIOUS_ACTIVITY,
        SecurityIncidentType.RATE_LIMIT_EXCEEDED,
        SecurityIncidentType.BRUTE_FORCE,
      ];

      for (const type of incidentTypes) {
        await reporter.capture({
          ...baseIncident,
          incidentType: type,
        });

        const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
        expect(createdData.incidentType).toBe(type);
        mockPrisma.securityIncident.create.mockClear();
      }
    });

    it("should handle all severity levels", async () => {
      const severities = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL];

      for (const severity of severities) {
        await reporter.capture({
          ...baseIncident,
          severity,
        });

        const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
        expect(createdData.severity).toBe(severity);
        mockPrisma.securityIncident.create.mockClear();
      }
    });
  });

  describe("Prisma data conversion", () => {
    it("should convert incidentType to Prisma enum", async () => {
      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.incidentType).toBe(baseIncident.incidentType);
    });

    it("should convert severity to Prisma enum", async () => {
      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.severity).toBe(baseIncident.severity);
    });

    it("should include occurredAt as Date", async () => {
      const fixedDate = new Date("2026-01-20T16:14:33.298Z");
      const originalDate = global.Date;

      global.Date = class extends Date {
        constructor() {
          super();
          return fixedDate;
        }
      } as any;

      await reporter.capture(baseIncident);

      const createdData = mockPrisma.securityIncident.create.mock.calls[0][0].data;
      expect(createdData.occurredAt).toEqual(fixedDate);

      global.Date = originalDate;
    });
  });

  describe("private method getLogLevelBySeverity", () => {
    it("should return 'info' for LOW severity", () => {
      const result = (reporter as any).getLogLevelBySeverity(Severity.LOW);
      expect(result).toBe("info");
    });

    it("should return 'warn' for MEDIUM severity", () => {
      const result = (reporter as any).getLogLevelBySeverity(Severity.MEDIUM);
      expect(result).toBe("warn");
    });

    it("should return 'error' for HIGH severity", () => {
      const result = (reporter as any).getLogLevelBySeverity(Severity.HIGH);
      expect(result).toBe("error");
    });

    it("should return 'error' for CRITICAL severity", () => {
      const result = (reporter as any).getLogLevelBySeverity(Severity.CRITICAL);
      expect(result).toBe("error");
    });
  });

  describe("private method createIncident", () => {
    it("should create incident with all required fields", () => {
      const data = {
        incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
        severity: Severity.MEDIUM,
        userId: "user-1",
        email: "test@example.com",
        reason: "test",
        metadata: { key: "value" },
        attemptCount: 1,
      };

      const result = (reporter as any).createIncident(data);

      expect(result).toHaveProperty("id", mockId);
      expect(result).toHaveProperty("environment", "test-env");
      expect(result).toHaveProperty("alert", false);
      expect(result).toHaveProperty("occurredAt");
      expect(result.occurredAt).toBeInstanceOf(Date);
    });

    it("should set alert to true for CRITICAL severity", () => {
      const data = {
        incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
        severity: Severity.CRITICAL,
      };

      const result = (reporter as any).createIncident(data);
      expect(result.alert).toBe(true);
    });
  });

  describe("private method toPrismaData", () => {
    it("should include request context data", () => {
      const incident = {
        id: mockId,
        incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
        severity: Severity.MEDIUM,
        environment: "test-env",
        alert: false,
        occurredAt: new Date(),
      };

      const result = (reporter as any).toPrismaData(incident);

      expect(result.requestId).toBe(mockRequestId);
      expect(result.ipAddress).toBe(mockIpAddress);
      expect(result.userAgent).toBe(mockUserAgent);
    });

    it("should include user connection when userId is provided", () => {
      const incident = {
        id: mockId,
        incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
        severity: Severity.MEDIUM,
        environment: "test-env",
        alert: false,
        occurredAt: new Date(),
        userId: "user-123",
      };

      const result = (reporter as any).toPrismaData(incident);
      expect(result.user).toEqual({ connect: { id: "user-123" } });
    });

    it("should omit user connection when userId is not provided", () => {
      const incident = {
        id: mockId,
        incidentType: SecurityIncidentType.AUTHENTICATION_FAILURE,
        severity: Severity.MEDIUM,
        environment: "test-env",
        alert: false,
        occurredAt: new Date(),
      };

      const result = (reporter as any).toPrismaData(incident);
      expect(result.user).toBeUndefined();
    });
  });
});
