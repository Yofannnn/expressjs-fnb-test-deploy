import { VerificationEmailTemplate } from "@/infrastructure/email/email-templates/verification-email.template";
import { VerificationEmailData, EmailAddress, EmailTemplateContext, EmailLayoutOptions } from "@/application/ports/driven/email";
import { AppIdentity } from "@/infrastructure/config/app-identity.config";
import { TimeUtil } from "@/utils/time.util";

jest.mock("@/infrastructure/email/email-templates/layout.template", () => {
  return {
    LayoutTemplate: class MockLayoutTemplate {
      protected config: AppIdentity;

      constructor(config: AppIdentity) {
        this.config = config;
      }

      getLayout(options: EmailLayoutOptions): string {
        return `Layout HTML with: ${JSON.stringify(options)}`;
      }
    },
  };
});

jest.mock("@/utils/time.util", () => ({
  TimeUtil: {
    getTimeUntilExpirationInMs: jest.fn(),
    formatDuration: jest.fn(),
  },
}));

describe("VerificationEmailTemplate", () => {
  let verificationEmailTemplate: VerificationEmailTemplate;
  let mockConfig: AppIdentity;
  let mockRecipient: EmailAddress;
  let mockData: VerificationEmailData;
  let futureDate: Date;

  const mockAppIdentity: AppIdentity = {
    brandName: "TestFood",
    supportEmail: "support@testfood.com",
    baseUrl: "https://api.testfood.com",
    clientUrl: "https://testfood.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = { ...mockAppIdentity };

    mockRecipient = {
      address: "user@test.com",
      name: "John Doe",
    };

    futureDate = new Date("2024-01-16T10:30:00Z");

    (TimeUtil.getTimeUntilExpirationInMs as jest.Mock).mockReturnValue(24 * 60 * 60 * 1000);
    (TimeUtil.formatDuration as jest.Mock).mockReturnValue("24 hours");

    mockData = {
      token: "verification-token-123456",
      expiresAt: futureDate,
      userName: "John",
    };

    verificationEmailTemplate = new VerificationEmailTemplate(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set templateType correctly", () => {
      expect(verificationEmailTemplate.templateType).toBe("VERIFICATION_EMAIL");
    });

    it("should call super constructor with config", () => {
      expect(verificationEmailTemplate).toBeInstanceOf(VerificationEmailTemplate);
    });

    it("should store config reference", () => {
      expect((verificationEmailTemplate as any).config).toEqual(mockConfig);
    });
  });

  describe("generate", () => {
    it("should generate email content with subject, html, and text", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");

      expect(result.subject).toBe("Welcome to TestFood - Verify Your Email");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should use config values in subject", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.subject).toContain("TestFood");
    });

    it("should include metadata in context", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {
          source: "user_registration",
          registrationDate: new Date().toISOString(),
        },
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe("userName handling", () => {
    it("should use data.userName when provided", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi John");
      expect(result.text).toContain("Hi John");
    });

    it("should use recipient.name when data.userName is not provided", () => {
      const dataWithoutUserName: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: futureDate,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithoutUserName,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi John Doe");
      expect(result.text).toContain("Hi John Doe");
    });

    it("should use 'there' as fallback when neither data.userName nor recipient.name is provided", () => {
      const dataWithoutUserName: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: futureDate,
      };
      const recipientWithoutName: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: recipientWithoutName,
        data: dataWithoutUserName,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should prioritize data.userName over recipient.name when both are provided", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: { ...mockData, userName: "Priority" },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi Priority");
      expect(result.text).toContain("Hi Priority");
      expect(result.html).not.toContain("Hi John Doe");
    });

    it("should handle empty string in userName", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: { ...mockData, userName: "" },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi John Doe");
      expect(result.text).toContain("Hi John Doe");
    });

    it("should handle empty string in both userName and recipient.name", () => {
      const recipientWithEmptyName: EmailAddress = {
        address: "user@test.com",
        name: "",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: recipientWithEmptyName,
        data: { ...mockData, userName: "" },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle special characters in userName", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: { ...mockData, userName: "John O'Brien-Smith 🚀" },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("John O'Brien-Smith 🚀");
      expect(result.text).toContain("John O'Brien-Smith 🚀");
    });

    it("should handle very long userName", () => {
      const longName = "A".repeat(100);
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: { ...mockData, userName: longName },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(longName);
      expect(result.text).toContain(longName);
    });
  });

  describe("verification link and token", () => {
    it("should include verification link with token in HTML CTA", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Verify My Email");
      expect(result.html).toContain(`${mockConfig.clientUrl}/verify-email/${mockData.token}`);
    });

    it("should include verification link with token in text version", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.text).toContain(`${mockConfig.clientUrl}/verify-email/${mockData.token}`);
    });

    it("should use clientUrl from config for verification link", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.text).toContain(mockConfig.clientUrl);
    });

    it("should handle tokens with special characters", () => {
      const dataWithSpecialToken: VerificationEmailData = {
        ...mockData,
        token: "verify-123-456-789!@#$",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithSpecialToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/${dataWithSpecialToken.token}`);
      expect(result.text).toContain(`/verify-email/${dataWithSpecialToken.token}`);
    });

    it("should handle tokens with URL-unsafe characters", () => {
      const dataWithUrlUnsafeToken: VerificationEmailData = {
        ...mockData,
        token: "verify/token?with=special&chars",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithUrlUnsafeToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/${dataWithUrlUnsafeToken.token}`);
      expect(result.text).toContain(`/verify-email/${dataWithUrlUnsafeToken.token}`);
    });

    it("should handle very long tokens", () => {
      const longToken = "a".repeat(200);
      const dataWithLongToken: VerificationEmailData = {
        ...mockData,
        token: longToken,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithLongToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/${longToken}`);
      expect(result.text).toContain(`/verify-email/${longToken}`);
    });
  });

  describe("expiration time handling", () => {
    it("should call TimeUtil methods with correct parameters", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalledWith(mockData.expiresAt);
      expect(TimeUtil.formatDuration).toHaveBeenCalledWith(24 * 60 * 60 * 1000);
    });

    it("should include formatted expiration time in HTML footer", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      (TimeUtil.formatDuration as jest.Mock).mockReturnValue("24 hours");

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("This verification link will expire in 24 hours");
    });

    it("should include formatted expiration time in text version", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      (TimeUtil.formatDuration as jest.Mock).mockReturnValue("24 hours");

      const result = verificationEmailTemplate.generate(context);

      expect(result.text).toContain("This link will expire in 24 hours");
    });

    it("should handle different duration formats", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const durationFormats = ["30 minutes", "1 hour", "2 days", "1 week"];

      durationFormats.forEach((format) => {
        (TimeUtil.formatDuration as jest.Mock).mockReturnValue(format);

        const result = verificationEmailTemplate.generate(context);

        expect(result.html).toContain(`expire in ${format}`);
        expect(result.text).toContain(`expire in ${format}`);
      });
    });

    it("should handle zero milliseconds until expiration", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      (TimeUtil.getTimeUntilExpirationInMs as jest.Mock).mockReturnValue(0);
      (TimeUtil.formatDuration as jest.Mock).mockReturnValue("0 minutes");

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("expire in 0 minutes");
      expect(result.text).toContain("expire in 0 minutes");
    });

    it("should handle negative milliseconds (already expired)", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      (TimeUtil.getTimeUntilExpirationInMs as jest.Mock).mockReturnValue(-3600000);
      (TimeUtil.formatDuration as jest.Mock).mockReturnValue("-1 hour");

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("expire in -1 hour");
      expect(result.text).toContain("expire in -1 hour");
    });

    it("should handle undefined expiresAt", () => {
      const dataWithoutExpiry: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: undefined as unknown as Date,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithoutExpiry,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalledWith(undefined);
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle null expiresAt", () => {
      const dataWithNullExpiry: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: null as unknown as Date,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithNullExpiry,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalledWith(null);
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle invalid Date objects in expiresAt", () => {
      const dataWithInvalidDate: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: new Date("invalid"),
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithInvalidDate,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalled();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle TimeUtil throwing errors", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      (TimeUtil.getTimeUntilExpirationInMs as jest.Mock).mockImplementation(() => {
        throw new Error("Time calculation failed");
      });

      expect(() => verificationEmailTemplate.generate(context)).toThrow();
    });
  });

  describe("security messaging", () => {
    it("should include security message for unrequested accounts", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("If you didn't create an account with us, you can safely ignore this email");
      expect(result.text).toContain("If you didn't create an account with us, you can safely ignore this email");
    });
  });

  describe("generateText (private method)", () => {
    it("should generate plain text version without HTML tags", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
      expect(result.text).toContain("Welcome to TestFood!");
    });

    it("should include all key information in text version", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      const expectedContent = [
        "Welcome to TestFood!",
        "Hi John",
        "Welcome to TestFood! We're excited to have you join our community of food lovers",
        `${mockConfig.clientUrl}/verify-email/${mockData.token}`,
        "This link will expire in 24 hours",
        "If you didn't create an account with us, you can safely ignore this email",
        "Best regards,The TestFood Team",
      ];

      expectedContent.forEach((content) => {
        expect(result.text).toContain(content);
      });
    });

    it("should format text version with proper line breaks", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.text).toContain("\n");
      const lines = result.text?.split("\n");
      expect(lines?.length).toBeGreaterThan(5);
    });
  });

  describe("edge cases", () => {
    it("should handle null config values gracefully", () => {
      const nullConfig: AppIdentity = {
        brandName: null as unknown as string,
        supportEmail: null as unknown as string,
        baseUrl: null as unknown as string,
        clientUrl: null as unknown as string,
      };

      const templateWithNullConfig = new VerificationEmailTemplate(nullConfig);
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = templateWithNullConfig.generate(context);

      expect(result.subject).toBe("Welcome to null - Verify Your Email");
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle missing brand name", () => {
      const configWithoutBrand: AppIdentity = {
        ...mockAppIdentity,
        brandName: null as unknown as string,
      };

      const template = new VerificationEmailTemplate(configWithoutBrand);
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.subject).toBe("Welcome to null - Verify Your Email");
      expect(result.html).toBeDefined();
    });

    it("should handle missing client URL", () => {
      const configWithoutClientUrl: AppIdentity = {
        ...mockAppIdentity,
        clientUrl: null as unknown as string,
      };

      const template = new VerificationEmailTemplate(configWithoutClientUrl);
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toContain("null/verify-email");
      expect(result.text).toContain("null/verify-email");
    });

    it("should handle empty recipient object", () => {
      const emptyRecipient = {} as EmailAddress;
      const dataWithoutUserName: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: futureDate,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: emptyRecipient,
        data: dataWithoutUserName,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle all optional fields being undefined", () => {
      const minimalData: VerificationEmailData = {
        token: "verification-token-123456",
        expiresAt: futureDate,
      };
      const minimalRecipient: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: minimalRecipient,
        data: minimalData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.html).toContain("Hi there");
    });

    it("should handle recipient with empty name string", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: { address: "user@test.com", name: "" },
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi John");
      expect(result.text).toContain("Hi John");
    });

    it("should handle recipient with special characters in name", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: {
          address: "user@test.com",
          name: "John O'Brien-Smith Jr. 🚀",
        },
        data: {
          ...mockData,
          userName: undefined,
        },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("John O'Brien-Smith Jr. 🚀");
      expect(result.text).toContain("John O'Brien-Smith Jr. 🚀");
    });
  });

  describe("layout integration", () => {
    it("should call getLayout with correct parameters", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Layout HTML with:");
    });

    it("should include all required layout options", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Welcome!");
      expect(result.html).toContain(`Verify your email to start ordering from ${mockConfig.brandName}`);
      expect(result.html).toContain("Verify My Email");
      expect(result.html).toContain("success");
    });

    it("should use 'success' theme for verification emails", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("success");
    });
  });

  describe("template type consistency", () => {
    it("should have correct template type", () => {
      expect(verificationEmailTemplate.templateType).toBe("VERIFICATION_EMAIL");
    });

    it("should be usable as EmailTemplate<VerificationEmailData>", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);
      expect(result).toBeDefined();
    });
  });

  describe("integration with AppIdentity", () => {
    it("should use all AppIdentity properties correctly", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(mockConfig.brandName);
      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.subject).toContain(mockConfig.brandName);
      expect(result.text).toContain(mockConfig.brandName);
      expect(result.text).toContain(mockConfig.clientUrl);
    });

    it("should use baseUrl for API links if needed", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      verificationEmailTemplate.generate(context);

      expect(mockConfig.baseUrl).toBe("https://api.testfood.com");
    });
  });

  describe("regression tests", () => {
    it("should handle the specific formatting in the text template", () => {
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.text).toContain("Best regards,The TestFood Team");
    });

    it("should work with all mocks properly configured", () => {
      expect(jest.isMockFunction(TimeUtil.getTimeUntilExpirationInMs)).toBe(true);
      expect(jest.isMockFunction(TimeUtil.formatDuration)).toBe(true);

      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalled();
      expect(TimeUtil.formatDuration).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("additional scenario tests", () => {
    it("should handle token with only numbers", () => {
      const dataWithNumericToken: VerificationEmailData = {
        ...mockData,
        token: "1234567890",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithNumericToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/1234567890`);
      expect(result.text).toContain(`/verify-email/1234567890`);
    });

    it("should handle token with UUID format", () => {
      const uuidToken = "550e8400-e29b-41d4-a716-446655440000";
      const dataWithUuidToken: VerificationEmailData = {
        ...mockData,
        token: uuidToken,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithUuidToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/${uuidToken}`);
      expect(result.text).toContain(`/verify-email/${uuidToken}`);
    });

    it("should handle case-sensitive token", () => {
      const caseSensitiveToken = "AbCdEf123456";
      const dataWithCaseSensitiveToken: VerificationEmailData = {
        ...mockData,
        token: caseSensitiveToken,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithCaseSensitiveToken,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain(`/verify-email/${caseSensitiveToken}`);
      expect(result.text).toContain(`/verify-email/${caseSensitiveToken}`);
    });

    it("should handle recipient with only email and no name", () => {
      const recipientOnlyEmail: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: recipientOnlyEmail,
        data: mockData,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi John");
      expect(result.text).toContain("Hi John");
    });

    it("should handle recipient with only name and no email", () => {
      const recipientOnlyName: EmailAddress = {
        address: "user@test.com",
        name: "Jane Doe",
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: recipientOnlyName,
        data: { ...mockData, userName: undefined },
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(result.html).toContain("Hi Jane Doe");
      expect(result.text).toContain("Hi Jane Doe");
    });

    it("should handle expiration with milliseconds precision", () => {
      const preciseExpiry = new Date(Date.now() + 1234567);
      const dataWithPreciseExpiry: VerificationEmailData = {
        ...mockData,
        expiresAt: preciseExpiry,
      };
      const context: EmailTemplateContext & { data: VerificationEmailData } = {
        recipient: mockRecipient,
        data: dataWithPreciseExpiry,
        metadata: {},
      };

      const result = verificationEmailTemplate.generate(context);

      expect(TimeUtil.getTimeUntilExpirationInMs).toHaveBeenCalledWith(preciseExpiry);
      expect(result).toBeDefined();
    });
  });
});
