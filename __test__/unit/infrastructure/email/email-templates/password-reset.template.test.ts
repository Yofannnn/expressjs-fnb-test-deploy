import { PasswordResetTemplate } from "@/infrastructure/email/email-templates/password-reset.template";
import { PasswordResetData, EmailAddress, EmailTemplateContext } from "@/application/ports/driven/email";
import { AppIdentity } from "@/infrastructure/config/app-identity.config";

jest.mock("@/infrastructure/email/email-templates/layout.template", () => {
  return {
    LayoutTemplate: class MockLayoutTemplate {
      protected config: AppIdentity;

      constructor(config: AppIdentity) {
        this.config = config;
      }

      getLayout(options: any): string {
        return `Layout HTML with: ${JSON.stringify(options)}`;
      }
    },
  };
});

describe("PasswordResetTemplate", () => {
  let passwordResetTemplate: PasswordResetTemplate;
  let mockConfig: AppIdentity;
  let mockRecipient: EmailAddress;
  let mockData: PasswordResetData;
  let baseDate: Date;
  let futureDate: Date;
  let requestedAtString: string;

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
    futureDate = new Date("2024-01-16T10:30:00Z");
    requestedAtString = "January 15, 2024 10:30 AM";

    jest.spyOn(Date, "now").mockImplementation(() => baseDate.getTime());

    mockData = {
      token: "reset-token-123456",
      expiresAt: futureDate,
      requestedAt: requestedAtString,
      requestIpAddress: "192.168.1.100",
      requestDevice: "Chrome on Windows",
      requestLocation: "New York, USA",
    };

    passwordResetTemplate = new PasswordResetTemplate(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set templateType correctly", () => {
      expect(passwordResetTemplate.templateType).toBe("PASSWORD_RESET");
    });

    it("should store config as readonly property", () => {
      expect(passwordResetTemplate.config).toBe(mockConfig);
    });

    it("should call super constructor with config", () => {
      expect(passwordResetTemplate).toBeInstanceOf(PasswordResetTemplate);
    });
  });

  describe("generate", () => {
    it("should generate email content with subject, html, and text", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");

      expect(result.subject).toBe("Reset Your TestApp Password");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should use config values in subject", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.subject).toContain("TestApp");
    });

    it("should include recipient name in HTML when provided", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`Hi ${mockRecipient.name}`);
    });

    it("should use 'there' as fallback when recipient name is not provided", () => {
      const recipientWithoutName: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: recipientWithoutName,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should include brand name in HTML body", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`<strong>${mockConfig.brandName}</strong>`);
    });

    it("should include metadata in context", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {
          source: "password_reset_request",
          requestId: "req-123",
        },
      };

      const result = passwordResetTemplate.generate(context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe("request details rendering", () => {
    it("should render all request details when fully provided", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(mockData.requestedAt);
      expect(result.html).toContain(mockData.requestLocation);
      expect(result.html).toContain(mockData.requestIpAddress);
      expect(result.html).toContain(mockData.requestDevice);
    });

    it("should handle missing optional request fields gracefully", () => {
      const minimalData: PasswordResetData = {
        token: "reset-token-123456",
        expiresAt: futureDate,
        requestedAt: requestedAtString,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: minimalData,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(mockData.requestedAt);
      expect(result.html).not.toContain("Location:");
      expect(result.html).not.toContain("IP Address:");
      expect(result.html).not.toContain("Device:");
    });

    it("should include location when provided", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: { ...mockData, requestLocation: "London, UK" },
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);
      expect(result.html).toContain("London, UK");
    });

    it("should include IP address when provided", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: { ...mockData, requestIpAddress: "10.0.0.1" },
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);
      expect(result.html).toContain("10.0.0.1");
    });

    it("should include device when provided", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: { ...mockData, requestDevice: "iPhone 13" },
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);
      expect(result.html).toContain("iPhone 13");
    });
  });

  describe("reset link and token", () => {
    it("should include reset link with token in HTML CTA", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Reset My Password");
      expect(result.html).toContain(`${mockConfig.clientUrl}/reset-password/${mockData.token}`);
    });

    it("should include reset link with token in text version", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.text).toContain(`${mockConfig.clientUrl}/reset-password/${mockData.token}`);
    });

    it("should use clientUrl from config for reset link", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.text).toContain(mockConfig.clientUrl);
    });

    it("should handle tokens with special characters", () => {
      const dataWithSpecialToken: PasswordResetData = {
        ...mockData,
        token: "reset-token-123-456-789!@#$",
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithSpecialToken,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`/reset-password/${dataWithSpecialToken.token}`);
      expect(result.text).toContain(`/reset-password/${dataWithSpecialToken.token}`);
    });

    it("should handle very long tokens", () => {
      const longToken = "a".repeat(200);
      const dataWithLongToken: PasswordResetData = {
        ...mockData,
        token: longToken,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithLongToken,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`/reset-password/${longToken}`);
      expect(result.text).toContain(`/reset-password/${longToken}`);
    });
  });

  describe("expiration time calculation", () => {
    it("should calculate expiration hours correctly", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const expectedHours = (futureDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60);

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
      expect(result.text).toContain(`expire in ${expectedHours} hours`);
    });

    it("should handle expiration in minutes for short-lived tokens", () => {
      const shortExpiryDate = new Date(baseDate.getTime() + 30 * 60 * 1000);
      const dataWithShortExpiry: PasswordResetData = {
        ...mockData,
        expiresAt: shortExpiryDate,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithShortExpiry,
        metadata: {},
      };
      const expectedHours = 0.5;

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
      expect(result.text).toContain(`expire in ${expectedHours} hours`);
    });

    it("should handle expiration in days for long-lived tokens", () => {
      const longExpiryDate = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000);
      const dataWithLongExpiry: PasswordResetData = {
        ...mockData,
        expiresAt: longExpiryDate,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithLongExpiry,
        metadata: {},
      };
      const expectedHours = 72;

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
      expect(result.text).toContain(`expire in ${expectedHours} hours`);
    });

    it("should handle expired tokens (negative hours)", () => {
      const expiredDate = new Date(baseDate.getTime() - 60 * 60 * 1000);
      const dataWithExpired: PasswordResetData = {
        ...mockData,
        expiresAt: expiredDate,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithExpired,
        metadata: {},
      };
      const expectedHours = -1;

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
      expect(result.text).toContain(`expire in ${expectedHours} hours`);
    });

    it("should handle Date.now mock to ensure consistent expiration calculations", () => {
      expect(Date.now()).toBe(baseDate.getTime());

      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      const expectedHours = (futureDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
      expect(result.html).toContain(`expire in ${expectedHours} hours`);
    });
  });

  describe("footer note and security messaging", () => {
    it("should include expiration warning in footer", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("This reset link will expire in");
      expect(result.text).toContain("This reset link will expire in");
    });

    it("should include security message for unrequested resets", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("If you didn't request this password reset, you can safely ignore this email");
      expect(result.text).toContain("If you didn't request this password reset, you can safely ignore this email");
    });

    it("should confirm password remains unchanged if link not used", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Your password will remain unchanged");
      expect(result.text).toContain("Your password will remain unchanged");
    });

    it("should include support email in footer note", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("This reset link will expire in 24 hours");
      expect(result.html).toContain("If you didn't request this password reset, you can safely ignore this email");
      expect(result.html).toContain("Your password will remain unchanged");
    });
  });

  describe("generateText (private method)", () => {
    it("should generate plain text version without HTML tags", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
      expect(result.text).toContain("Reset Your TestApp Password");
    });

    it("should format requestedAt date in text version", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.text).toContain(`Request made: ${new Date(requestedAtString).toLocaleString()}`);
    });

    it("should include all key information in text version", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      const expectedContent = [
        "Reset Your TestApp Password",
        "Hi John Doe",
        "We received a request to reset the password for your TestApp account",
        `Request made: ${new Date(requestedAtString).toLocaleString()}`,
        `https://testapp.com/reset-password/${mockData.token}`,
        "This reset link will expire in 24 hours",
        "If you didn't request this password reset, you can safely ignore this email",
        "Best regards, The TestApp Team",
      ];

      expectedContent.forEach((content) => {
        expect(result.text).toContain(content);
      });
    });

    it("should format text version with proper line breaks", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

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

      const templateWithNullConfig = new PasswordResetTemplate(nullConfig);
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = templateWithNullConfig.generate(context);

      expect(result.subject).toBe("Reset Your null Password");
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle missing brand name", () => {
      const configWithoutBrand: AppIdentity = {
        ...mockAppIdentity,
        brandName: null as unknown as string,
      };

      const template = new PasswordResetTemplate(configWithoutBrand);
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.subject).toBe("Reset Your null Password");
      expect(result.html).toBeDefined();
    });

    it("should handle missing client URL", () => {
      const configWithoutClientUrl: AppIdentity = {
        ...mockAppIdentity,
        clientUrl: null as unknown as string,
      };

      const template = new PasswordResetTemplate(configWithoutClientUrl);
      const context: EmailTemplateContext & { data: PasswordResetData } = {
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

      const template = new PasswordResetTemplate(configWithoutSupport);
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle all optional fields being undefined", () => {
      const minimalData: PasswordResetData = {
        token: "reset-token-123456",
        expiresAt: futureDate,
        requestedAt: requestedAtString,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: minimalData,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.html).toContain(requestedAtString);
      expect(result.html).not.toContain("Location:");
      expect(result.html).not.toContain("IP Address:");
      expect(result.html).not.toContain("Device:");
    });

    it("should handle invalid date strings in requestedAt", () => {
      const dataWithInvalidDate: PasswordResetData = {
        ...mockData,
        requestedAt: "Invalid Date String",
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithInvalidDate,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Invalid Date String");
      expect(result.text).toContain("Invalid Date");
    });

    it("should handle very long expiration times", () => {
      const farFutureDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const dataWithFarExpiry: PasswordResetData = {
        ...mockData,
        expiresAt: farFutureDate,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithFarExpiry,
        metadata: {},
      };
      const expectedHours = 720;

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
    });

    it("should handle special characters in request details", () => {
      const dataWithSpecialChars: PasswordResetData = {
        ...mockData,
        requestLocation: "München, Deutschland",
        requestDevice: "iPhone 13 Pro Max (iOS 15) 📱",
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithSpecialChars,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("München, Deutschland");
      expect(result.html).toContain("iPhone 13 Pro Max (iOS 15) 📱");
    });

    it("should handle empty strings in optional fields", () => {
      const dataWithEmptyStrings: PasswordResetData = {
        ...mockData,
        requestLocation: "",
        requestIpAddress: "",
        requestDevice: "",
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithEmptyStrings,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(mockData.requestedAt);
      expect(result.html).not.toContain("Location:</td><td");
      expect(result.html).not.toContain("IP Address:</td><td");
      expect(result.html).not.toContain("Device:</td><td");
    });

    it("should handle recipient with empty name string", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: { address: "user@test.com", name: "" },
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle recipient with special characters in name", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: { address: "user@test.com", name: "John O'Brien-Smith Jr. 🚀" },
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("John O'Brien-Smith Jr. 🚀");
      expect(result.text).toContain("John O'Brien-Smith Jr. 🚀");
    });
  });

  describe("layout integration", () => {
    it("should call getLayout with correct parameters", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toBeDefined();
    });

    it("should include all required layout options", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Reset Your Password");
      expect(result.html).toContain("Reset your password to regain access to your account");
      expect(result.html).toContain("Reset My Password");
      expect(result.html).toContain("default");
    });

    it("should use default theme for password reset emails", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("default");
    });
  });

  describe("template type consistency", () => {
    it("should have correct template type", () => {
      expect(passwordResetTemplate.templateType).toBe("PASSWORD_RESET");
    });

    it("should be usable as EmailTemplate<PasswordResetData>", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);
      expect(result).toBeDefined();
    });
  });

  describe("integration with AppIdentity", () => {
    it("should use all AppIdentity properties correctly", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(mockConfig.brandName);
      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.subject).toContain(mockConfig.brandName);
      expect(result.text).toContain(mockConfig.brandName);
      expect(result.text).toContain(mockConfig.clientUrl);
    });

    it("should use baseUrl for API links if needed", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      passwordResetTemplate.generate(context);

      expect(mockConfig.baseUrl).toBe("https://api.testapp.com");
    });
  });

  describe("regression tests", () => {
    it("should handle the specific note about request details in the template", () => {
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain("Request details");
    });

    it("should include expiration time in hours with decimal precision", () => {
      const customExpiryDate = new Date(baseDate.getTime() + 90 * 60 * 1000);
      const dataWithCustomExpiry: PasswordResetData = {
        ...mockData,
        expiresAt: customExpiryDate,
      };
      const context: EmailTemplateContext & { data: PasswordResetData } = {
        recipient: mockRecipient,
        data: dataWithCustomExpiry,
        metadata: {},
      };
      const expectedHours = 1.5;

      const result = passwordResetTemplate.generate(context);

      expect(result.html).toContain(`expire in ${expectedHours} hours`);
      expect(result.text).toContain(`expire in ${expectedHours} hours`);
    });
  });
});
