import { AccountLockedTemplate } from "@/infrastructure/email/email-templates/account-locked.template";
import { AccountLockedData, EmailAddress, EmailLayoutOptions, EmailTemplateContext } from "@/application/ports/driven/email";
import { AppIdentity } from "@/infrastructure/config/app-identity.config";

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

describe("AccountLockedTemplate", () => {
  let accountLockedTemplate: AccountLockedTemplate;
  let mockConfig: AppIdentity;
  let mockRecipient: EmailAddress;
  let mockData: AccountLockedData;
  let baseDate: Date;

  const mockAppIdentity: AppIdentity = {
    brandName: "TestApp",
    supportEmail: "support@testapp.com",
    baseUrl: "https://api.testapp.com",
    clientUrl: "https://testapp.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = { ...mockAppIdentity };

    mockRecipient = {
      address: "user@test.com",
      name: "John Doe",
    };

    baseDate = new Date("2024-01-15T10:30:00Z");

    mockData = {
      lockedAt: baseDate,
      reason: "multiple_failed_attempts",
      unlockInstructions: "Please wait 30 minutes or contact support",
    };

    accountLockedTemplate = new AccountLockedTemplate(mockConfig);
  });

  describe("constructor and properties", () => {
    it("should set templateType correctly", () => {
      expect(accountLockedTemplate.templateType).toBe("ACCOUNT_LOCKED");
    });

    it("should call super constructor with config", () => {
      expect(accountLockedTemplate).toBeInstanceOf(AccountLockedTemplate);
    });

    it("should store config reference", () => {
      expect((accountLockedTemplate as any).config).toEqual(mockConfig);
    });
  });

  describe("generate", () => {
    it("should generate email content with subject, html, and text", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");

      expect(result.subject).toBe("TestApp - Account Security Alert");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should use config values in subject", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.subject).toContain("TestApp");
    });

    it("should include recipient name in HTML when provided", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(`Hi ${mockRecipient.name}`);
    });

    it("should use 'there' as fallback when recipient name is not provided", () => {
      const recipientWithoutName: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: recipientWithoutName,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should include lockedAt date in HTML and text", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(baseDate.toLocaleString());
      expect(result.text).toContain(baseDate.toLocaleString());
    });

    it("should include unlock instructions in HTML when provided", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(mockData.unlockInstructions);
      expect(result.text).toContain(mockData.unlockInstructions);
    });

    it("should use default unlock message when instructions not provided", () => {
      const dataWithoutInstructions: AccountLockedData = {
        lockedAt: baseDate,
        reason: "multiple_failed_attempts",
      };
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: dataWithoutInstructions,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      const htmlDefaultMessage = "To unlock your account, please reset your password using the link below or contact our support team.";
      const textDefaultMessage = "To unlock your account, please reset your password or contact our support team.";

      expect(result.html).toContain(htmlDefaultMessage);
      expect(result.text).toContain(textDefaultMessage);
    });

    it("should include reset password link in HTML using clientUrl", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(`${mockConfig.clientUrl}/reset-password`);
    });

    it("should include support email in footer", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
      expect(result.text).toContain(mockConfig.supportEmail);
    });
  });

  describe("getReasonText (private method - tested through generate)", () => {
    it("should return correct reason text for multiple_failed_attempts", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, reason: "multiple_failed_attempts" },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("due to multiple failed login attempts to protect your security");
      expect(result.text).toContain("due to multiple failed login attempts to protect your security");
    });

    it("should return correct reason text for suspicious_activity", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, reason: "suspicious_activity" },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("due to suspicious activity detected on your account");
      expect(result.text).toContain("due to suspicious activity detected on your account");
    });

    it("should return correct reason text for admin_action", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, reason: "admin_action" },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("by our security team");
      expect(result.text).toContain("by our security team");
    });

    it("should handle unknown reason with default message", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, reason: "unknown_reason" as AccountLockedData["reason"] },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("for security reasons");
      expect(result.text).toContain("for security reasons");
    });
  });

  describe("generateHTML (private method - tested through generate)", () => {
    it("should call getLayout with correct parameters", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("Layout HTML with:");
    });

    it("should include all layout options correctly", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("Account Temporarily Locked");
      expect(result.html).toContain("Your account has been locked for security reasons");
      expect(result.html).toContain("Reset Password");
      expect(result.html).toContain("urgent");
    });

    it("should use 'urgent' theme for account locked emails", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("urgent");
    });
  });

  describe("generateText (private method - tested through generate)", () => {
    it("should generate plain text version without HTML tags", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
      expect(result.text).toContain("TestApp - Account Security Alert");
    });

    it("should include all relevant information in text version", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.text).toContain("Hi John Doe");
      expect(result.text).toContain(baseDate.toLocaleString());
      expect(result.text).toContain("due to multiple failed login attempts");
      expect(result.text).toContain("Please wait 30 minutes or contact support");
      expect(result.text).toContain("https://testapp.com/reset-password");
      expect(result.text).toContain("support@testapp.com");
    });

    it("should format text version with proper line breaks", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.text).toContain("\n");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined recipient name", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: { address: "user@test.com" },
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle empty unlock instructions", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, unlockInstructions: "" },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("To unlock your account, please reset your password");
      expect(result.text).toContain("To unlock your account, please reset your password");
    });

    it("should handle all reason types", () => {
      const reasons: Array<"multiple_failed_attempts" | "suspicious_activity" | "admin_action"> = [
        "multiple_failed_attempts",
        "suspicious_activity",
        "admin_action",
      ];

      reasons.forEach((reason) => {
        const context: EmailTemplateContext & { data: AccountLockedData } = {
          recipient: mockRecipient,
          data: { ...mockData, reason },
          metadata: {},
        };

        const result = accountLockedTemplate.generate(context);

        expect(result.html).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.html).toContain("Account Temporarily Locked");
      });
    });

    it("should handle null config values gracefully", () => {
      const nullConfig: AppIdentity = {
        brandName: null as unknown as string,
        supportEmail: null as unknown as string,
        baseUrl: null as unknown as string,
        clientUrl: null as unknown as string,
      };

      const templateWithNullConfig = new AccountLockedTemplate(nullConfig);
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = templateWithNullConfig.generate(context);

      expect(result.subject).toBe("null - Account Security Alert");
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle future dates correctly", () => {
      const futureDate = new Date("2025-12-31T23:59:59Z");
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, lockedAt: futureDate },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(futureDate.toLocaleString());
      expect(result.text).toContain(futureDate.toLocaleString());
    });

    it("should handle metadata in context", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {
          source: "security_system",
          alertId: "alert-123",
        },
      };

      const result = accountLockedTemplate.generate(context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle recipient with empty name string", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: { address: "user@test.com", name: "" },
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle recipient with special characters in name", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: { address: "user@test.com", name: "John O'Brien-Smith Jr. 🚀" },
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain("John O'Brien-Smith Jr. 🚀");
      expect(result.text).toContain("John O'Brien-Smith Jr. 🚀");
    });

    it("should handle very long unlock instructions", () => {
      const longInstructions = "A".repeat(1000);
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: { ...mockData, unlockInstructions: longInstructions },
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(longInstructions);
      expect(result.text).toContain(longInstructions);
    });
  });

  describe("integration with AppIdentity", () => {
    it("should use all AppIdentity properties correctly", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);

      expect(result.html).toContain(mockConfig.brandName);
      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.html).toContain(mockConfig.supportEmail);
    });

    it("should use baseUrl for API links if needed", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      accountLockedTemplate.generate(context);

      expect(mockConfig.baseUrl).toBe("https://api.testapp.com");
    });

    it("should handle missing brand name", () => {
      const configWithoutBrand: AppIdentity = {
        ...mockAppIdentity,
        brandName: null as unknown as string,
      };

      const template = new AccountLockedTemplate(configWithoutBrand);
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.subject).toBe("null - Account Security Alert");
      expect(result.html).toBeDefined();
    });

    it("should handle missing client URL", () => {
      const configWithoutClientUrl: AppIdentity = {
        ...mockAppIdentity,
        clientUrl: null as unknown as string,
      };

      const template = new AccountLockedTemplate(configWithoutClientUrl);
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toContain("null/reset-password");
      expect(result.text).toContain("null/reset-password");
    });

    it("should handle missing support email", () => {
      const configWithoutSupport: AppIdentity = {
        ...mockAppIdentity,
        supportEmail: null as unknown as string,
      };

      const template = new AccountLockedTemplate(configWithoutSupport);
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toContain("mailto:null");
      expect(result.text).toContain("null");
    });
  });

  describe("template type consistency", () => {
    it("should have correct template type", () => {
      expect(accountLockedTemplate.templateType).toBe("ACCOUNT_LOCKED");
    });

    it("should be usable as EmailTemplate<AccountLockedData>", () => {
      const context: EmailTemplateContext & { data: AccountLockedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = accountLockedTemplate.generate(context);
      expect(result).toBeDefined();
    });
  });
});
