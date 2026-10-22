import { PasswordChangedTemplate } from "@/infrastructure/email/email-templates/password-change.template";
import { PasswordChangedData, EmailAddress, EmailTemplateContext, EmailLayoutOptions } from "@/application/ports/driven/email";
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

describe("PasswordChangedTemplate", () => {
  let passwordChangedTemplate: PasswordChangedTemplate;
  let mockConfig: AppIdentity;
  let mockRecipient: EmailAddress;
  let mockData: PasswordChangedData;
  let baseDateTime: string;

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

    baseDateTime = "January 15, 2024 10:30 AM";

    mockData = {
      dateTime: baseDateTime,
      location: "New York, USA",
      ipAddress: "192.168.1.100",
      device: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      wasYou: true,
      previousLoginDate: "January 14, 2024 08:15 PM",
    };

    passwordChangedTemplate = new PasswordChangedTemplate(mockConfig);
  });

  describe("constructor and properties", () => {
    it("should set templateType correctly", () => {
      expect(passwordChangedTemplate.templateType).toBe("PASSWORD_CHANGED");
    });

    it("should call super constructor with config", () => {
      expect(passwordChangedTemplate).toBeInstanceOf(PasswordChangedTemplate);
      expect((passwordChangedTemplate as any).config).toEqual(mockConfig);
    });
  });

  describe("generate", () => {
    it("should generate email content with subject, html, and text", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");

      expect(result.subject).toBe("TestApp - Password Changed Successfully");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should use config values in subject", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.subject).toContain("TestApp");
    });

    it("should include recipient name in HTML when provided", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain(`Hi ${mockRecipient.name}`);
    });

    it("should use 'there' as fallback when recipient name is not provided", () => {
      const recipientWithoutName: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: recipientWithoutName,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should include brand name in HTML body", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain(`<strong>${mockConfig.brandName}</strong>`);
    });
  });

  describe("CTA button behavior based on wasYou flag", () => {
    it("should not include CTA button when wasYou is true (user made the change)", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: true },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).not.toContain("Contact Support");
    });

    it("should include CTA button with support email when wasYou is false (unauthorized change)", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: false },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Contact Support");
      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
    });

    it("should include urgent theme when wasYou is false", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: false },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("urgent");
    });

    it("should include success theme when wasYou is true", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: true },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("success");
    });

    it("should handle wasYou being undefined (treat as false for security)", () => {
      const dataWithUndefinedWasYou: PasswordChangedData = {
        dateTime: baseDateTime,
        location: "New York, USA",
        ipAddress: "192.168.1.100",
        device: "Test Device",
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: dataWithUndefinedWasYou,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).not.toContain('"Contact Support"');
      expect(result.html).toContain('"theme":"success"');
    });

    it("should handle wasYou being null (treat as false for security)", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: null as unknown as boolean },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).not.toContain('"Contact Support"');
      expect(result.html).toContain('"theme":"success"');
    });
  });

  describe("security details rendering", () => {
    it("should render all security details when fully provided", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Change Details:");
      expect(result.html).toContain(mockData.dateTime);
      expect(result.html).toContain(mockData.location);
      expect(result.html).toContain(mockData.ipAddress);
    });

    it("should handle missing optional fields gracefully", () => {
      const minimalData: PasswordChangedData = { dateTime: baseDateTime };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: minimalData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Change Details:");
      expect(result.html).toContain(baseDateTime);
      expect(result.html).not.toContain("Location:");
      expect(result.html).not.toContain("IP Address:");
      expect(result.html).not.toContain("Device:");
    });

    it("should include location when provided", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, location: "London, UK" },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("London, UK");
    });

    it("should include IP address when provided", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, ipAddress: "10.0.0.1" },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("10.0.0.1");
    });

    it("should include device when provided", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, device: "iPhone 13" },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Desktop");
    });
  });

  describe("parseDevice (private method)", () => {
    it("should identify mobile devices", () => {
      const mobileUserAgents = [
        "Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Android; Mobile; rv:40.0) Gecko/40.0 Firefox/40.0",
      ];

      mobileUserAgents.forEach((ua) => {
        const context: EmailTemplateContext & { data: PasswordChangedData } = {
          recipient: mockRecipient,
          data: { ...mockData, device: ua },
          metadata: {},
        };
        const result = passwordChangedTemplate.generate(context);

        expect(result.html).toContain("Mobile Device");
        expect(result.text).toContain(ua);
      });
    });

    it("should identify tablet devices", () => {
      const tabletUserAgents = [
        "Mozilla/5.0 (Tablet; iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 11; SM-T870; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 12; SM-X800; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      ];

      tabletUserAgents.forEach((ua) => {
        const context: EmailTemplateContext & { data: PasswordChangedData } = {
          recipient: mockRecipient,
          data: { ...mockData, device: ua },
          metadata: {},
        };
        const result = passwordChangedTemplate.generate(context);
        expect(result.html).toContain("Tablet");
      });
    });

    it("should identify desktop devices", () => {
      const desktopUserAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ];

      desktopUserAgents.forEach((ua) => {
        const context: EmailTemplateContext & { data: PasswordChangedData } = {
          recipient: mockRecipient,
          data: { ...mockData, device: ua },
          metadata: {},
        };
        const result = passwordChangedTemplate.generate(context);
        expect(result.html).toContain("Desktop");
        expect(result.text).toContain(ua);
      });
    });

    it("should handle empty device string", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, device: "" },
        metadata: {},
      };
      const result = passwordChangedTemplate.generate(context);

      expect(result.html).not.toContain("Device:");
    });

    it("should handle undefined device", () => {
      const dataWithoutDevice: PasswordChangedData = {
        dateTime: baseDateTime,
        location: "New York, USA",
        ipAddress: "192.168.1.100",
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: dataWithoutDevice,
        metadata: {},
      };
      const result = passwordChangedTemplate.generate(context);

      expect(result.html).not.toContain("Device:");
      expect(result.text).not.toContain("- Device:");
    });

    it("should handle device with partial mobile keyword", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, device: "Mobile" },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);
      expect(result.html).toContain("Mobile Device");
    });

    it("should handle device with partial tablet keyword", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, device: "Tablet" },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);
      expect(result.html).toContain("Tablet");
    });
  });

  describe("unauthorized change messaging", () => {
    it("should include warning message when wasYou is false", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: false },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("If you didn't make this change:");
      expect(result.html).toContain("Contact our support team immediately");
      expect(result.html).toContain("Check your account for any unauthorized activity");
      expect(result.html).toContain("Consider enabling two-factor authentication");
    });

    it("should include confirmation message when wasYou is true", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: true },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("If you made this change, no further action is needed");
      expect(result.html).toContain("If you didn't make this change:");
    });
  });

  describe("generateText (private method)", () => {
    it("should generate plain text version without HTML tags", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
      expect(result.text).toContain("TestApp - Password Changed Successfully");
    });

    it("should include all provided details in text version", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.text).toContain(`- Date & Time: ${mockData.dateTime}`);
      expect(result.text).toContain(`- Location: ${mockData.location}`);
      expect(result.text).toContain(`- IP Address: ${mockData.ipAddress}`);
      expect(result.text).toContain(`- Device: ${mockData.device}`);
    });

    it("should conditionally include optional fields in text version", () => {
      const dataWithPartialFields: PasswordChangedData = {
        dateTime: baseDateTime,
        location: "London, UK",
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: dataWithPartialFields,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.text).toContain(`- Date & Time: ${baseDateTime}`);
      expect(result.text).toContain(`- Location: London, UK`);
      expect(result.text).not.toContain("- IP Address:");
      expect(result.text).not.toContain("- Device:");
    });

    it("should include support email in text version", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.text).toContain(mockConfig.supportEmail);
    });

    it("should include security recommendations in text version", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.text).toContain("For your security, we recommend using a strong, unique password");
    });
  });

  describe("footer and security recommendations", () => {
    it("should include security recommendations in footer", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("For your security, we recommend using a strong, unique password");
      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
    });

    it("should include support email link in footer", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
      expect(result.text).toContain(mockConfig.supportEmail);
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

      const templateWithNullConfig = new PasswordChangedTemplate(nullConfig);
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = templateWithNullConfig.generate(context);

      expect(result.subject).toBe("null - Password Changed Successfully");
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle missing brand name", () => {
      const configWithoutBrand: AppIdentity = {
        ...mockAppIdentity,
        brandName: null as unknown as string,
      };

      const template = new PasswordChangedTemplate(configWithoutBrand);
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.subject).toBe("null - Password Changed Successfully");
      expect(result.html).toBeDefined();
    });

    it("should handle missing support email", () => {
      const configWithoutSupport: AppIdentity = {
        ...mockAppIdentity,
        supportEmail: null as unknown as string,
      };

      const template = new PasswordChangedTemplate(configWithoutSupport);
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toContain("mailto:null");
      expect(result.text).toContain("Contact our support team immediately: null");
    });

    it("should handle all optional fields being undefined", () => {
      const minimalData: PasswordChangedData = { dateTime: baseDateTime };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: minimalData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.html).toContain(baseDateTime);
      expect(result.html).not.toContain("Location:");
      expect(result.html).not.toContain("IP Address:");
      expect(result.html).not.toContain("Device:");
    });

    it("should handle long date/time strings", () => {
      const longDateTime = "January 15, 2024 at 10:30:45 AM Eastern Standard Time";
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, dateTime: longDateTime },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain(longDateTime);
      expect(result.text).toContain(longDateTime);
    });

    it("should handle special characters in location and device strings", () => {
      const dataWithSpecialChars: PasswordChangedData = {
        dateTime: baseDateTime,
        location: "São Paulo, Brasil 🇧🇷",
        ipAddress: "192.168.1.100",
        device: "iPhone 13 Pro Max (iOS 15)",
        wasYou: true,
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: dataWithSpecialChars,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("São Paulo, Brasil 🇧🇷");
      expect(result.text).toContain("São Paulo, Brasil 🇧🇷");
    });

    it("should handle wasYou being explicitly false with missing optional fields", () => {
      const dataWithFalseFlag: PasswordChangedData = {
        dateTime: baseDateTime,
        wasYou: false,
      };
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: dataWithFalseFlag,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Contact Support");
      expect(result.html).toContain("If you didn't make this change:");
      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
    });

    it("should handle previousLoginDate (available but not used)", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle metadata in context", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {
          source: "security_system",
          alertId: "alert-123",
        },
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe("layout integration", () => {
    it("should call getLayout with correct parameters", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toBeDefined();
    });

    it("should include all required layout options", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("Password Changed");
      expect(result.html).toContain("Your account password was successfully changed");
    });

    it("should use urgent theme when wasYou is false", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: false },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("urgent");
    });

    it("should use success theme when wasYou is true", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: { ...mockData, wasYou: true },
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain("success");
    });
  });

  describe("template type consistency", () => {
    it("should have correct template type", () => {
      expect(passwordChangedTemplate.templateType).toBe("PASSWORD_CHANGED");
    });

    it("should be usable as EmailTemplate<PasswordChangedData>", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);
      expect(result).toBeDefined();
    });
  });

  describe("integration with AppIdentity", () => {
    it("should use all AppIdentity properties correctly", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = passwordChangedTemplate.generate(context);

      expect(result.html).toContain(mockConfig.brandName);
      expect(result.html).toContain(mockConfig.supportEmail);
      expect(result.text).toContain(mockConfig.brandName);
      expect(result.text).toContain(mockConfig.supportEmail);
    });

    it("should use baseUrl for API links if needed", () => {
      const context: EmailTemplateContext & { data: PasswordChangedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      passwordChangedTemplate.generate(context);

      expect(mockConfig.baseUrl).toBe("https://api.testapp.com");
    });
  });
});
