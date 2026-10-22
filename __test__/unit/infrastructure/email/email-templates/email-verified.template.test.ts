import { EmailVerifiedTemplate } from "@/infrastructure/email/email-templates/email-verified.template";
import { EmailVerifiedData, EmailAddress, EmailTemplateContext, EmailLayoutOptions } from "@/application/ports/driven/email";
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

describe("EmailVerifiedTemplate", () => {
  let emailVerifiedTemplate: EmailVerifiedTemplate;
  let mockConfig: AppIdentity;
  let mockRecipient: EmailAddress;
  let mockData: EmailVerifiedData;
  let baseDate: Date;

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

    baseDate = new Date("2024-01-15T10:30:00Z");

    mockData = {
      verifiedAt: baseDate,
      hasCompletedProfile: false,
      welcomeOffer: "Get 20% off your first order with code WELCOME20",
      nextSteps: [
        {
          title: "Complete your profile",
          description: "Add your preferences for personalized recommendations",
          url: "https://testfood.com/profile",
        },
        {
          title: "Browse menu",
          description: "Explore our delicious offerings",
          url: "https://testfood.com/menu",
        },
      ],
    };

    emailVerifiedTemplate = new EmailVerifiedTemplate(mockConfig);
  });

  describe("constructor and properties", () => {
    it("should set templateType correctly", () => {
      expect(emailVerifiedTemplate.templateType).toBe("EMAIL_VERIFIED");
    });

    it("should call super constructor with config", () => {
      expect(emailVerifiedTemplate).toBeInstanceOf(EmailVerifiedTemplate);
    });

    it("should store config reference", () => {
      expect((emailVerifiedTemplate as any).config).toEqual(mockConfig);
    });
  });

  describe("generate", () => {
    it("should generate email content with subject, html, and text", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");

      expect(result.subject).toBe("Welcome to TestFood - Email Verified! 🎉");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should use config values in subject", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.subject).toContain("TestFood");
    });

    it("should include recipient name in HTML when provided", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(`Hi ${mockRecipient.name}`);
    });

    it("should use 'there' as fallback when recipient name is not provided", () => {
      const recipientWithoutName: EmailAddress = {
        address: "user@test.com",
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: recipientWithoutName,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should include brand name in HTML body", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(`<strong>${mockConfig.brandName}</strong>`);
    });

    it("should include support email in text version when no welcome offer", () => {
      const dataWithoutOffer: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithoutOffer,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.text).toContain(mockConfig.supportEmail);
    });
  });

  describe("CTA button behavior", () => {
    it("should show 'Complete Your Profile' CTA when profile is not completed", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, hasCompletedProfile: false },
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Complete Your Profile");
      expect(result.html).toContain(`${mockConfig.clientUrl}/profile/complete`);
      expect(result.text).toContain("Complete your profile");
      expect(result.text).toContain(`${mockConfig.clientUrl}/profile/complete`);
    });

    it("should show 'Browse Menu' CTA when profile is completed", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, hasCompletedProfile: true },
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Browse Menu");
      expect(result.html).toContain(`${mockConfig.clientUrl}/menu`);
      expect(result.text).toContain("Start exploring");
      expect(result.text).toContain(`${mockConfig.clientUrl}/menu`);
    });

    it("should use primary variant for CTA", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("primary");
    });
  });

  describe("welcome offer handling", () => {
    it("should include welcome offer in footer when provided", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(mockData.welcomeOffer);
      expect(result.html).toContain("Special Welcome Offer:");
      expect(result.text).toContain(`Special Welcome Offer: ${mockData.welcomeOffer}`);
      expect(result.html).not.toContain("Questions? We're here to help");
    });

    it("should show support email in footer when welcome offer is not provided", () => {
      const dataWithoutOffer: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithoutOffer,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
      expect(result.text).toContain(mockConfig.supportEmail);
      expect(result.html).not.toContain("Special Welcome Offer:");
    });

    it("should handle empty welcome offer string", () => {
      const dataWithEmptyOffer: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
        welcomeOffer: "",
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithEmptyOffer,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(`mailto:${mockConfig.supportEmail}`);
      expect(result.html).not.toContain("Special Welcome Offer:");
    });

    it("should handle welcome offer with special characters", () => {
      const offerWithSpecialChars = "Get 50% off! Use code: SALE@50 🎉";
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, welcomeOffer: offerWithSpecialChars },
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(offerWithSpecialChars);
      expect(result.text).toContain(offerWithSpecialChars);
    });
  });

  describe("renderWelcomeFeatures (private method)", () => {
    it("should render all four welcome features in HTML", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      const features = [
        { icon: "🍽️", text: "Delicious meals delivered to your door" },
        { icon: "⭐", text: "Exclusive member benefits and rewards" },
        { icon: "📦", text: "Easy order tracking and reordering" },
        { icon: "💝", text: "Personalized recommendations" },
      ];

      features.forEach((feature) => {
        expect(result.html).toContain(feature.icon);
        expect(result.html).toContain(feature.text);
      });

      expect(result.html).toContain("background-color: #f8f9fa");
      expect(result.html).toContain("border-left: 4px solid #16a34a");
    });

    it("should render features in a table structure", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("<table");
      expect(result.html).toContain("</table>");
      expect(result.html).toContain("<tr>");
      expect(result.html).toContain("</tr>");
      expect(result.html).toContain("<td");
    });

    it("should include feature section header", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Here's what you can enjoy:");
      expect(result.html).toContain("font-weight: bold");
    });
  });

  describe("generateText (private method)", () => {
    it("should generate plain text version without HTML tags", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
      expect(result.text).toContain("Welcome to TestFood - Email Verified!");
    });

    it("should include all key information in text version", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      const expectedContent = [
        "Welcome to TestFood - Email Verified!",
        "Hi John Doe",
        "Great news! Your email has been successfully verified",
        "Delicious meals delivered to your door",
        "Exclusive member benefits and rewards",
        "Easy order tracking and reordering",
        "Personalized recommendations",
        "Special Welcome Offer: Get 20% off your first order with code WELCOME20",
        "Complete your profile: https://testfood.com/profile/complete",
        "Contact us at support@testfood.com",
      ];

      expectedContent.forEach((content) => {
        expect(result.text).toContain(content);
      });

      expect(result.text).toMatch(/Best regards,\s*The TestFood Team/);
    });

    it("should format text version with proper line breaks", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.text).toContain("\n");
      const lines = result?.text?.split("\n");
      expect(lines?.length).toBeGreaterThan(5);
    });

    it("should include all four features in text version with proper formatting", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      const features = [
        "Delicious meals delivered to your door",
        "Exclusive member benefits and rewards",
        "Easy order tracking and reordering",
        "Personalized recommendations",
      ];

      features.forEach((feature) => {
        expect(result.text).toContain(`- ${feature}`);
      });
    });

    it("should conditionally include welcome offer in text version", () => {
      const contextWithOffer: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };
      const contextWithoutOffer: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, welcomeOffer: undefined },
        metadata: {},
      };

      const resultWithOffer = emailVerifiedTemplate.generate(contextWithOffer);
      const resultWithoutOffer = emailVerifiedTemplate.generate(contextWithoutOffer);

      expect(resultWithOffer.text).toContain("Special Welcome Offer:");
      expect(resultWithoutOffer.text).not.toContain("Special Welcome Offer:");
    });
  });

  describe("nextSteps handling", () => {
    it("should include next steps data in template (available but not used directly)", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle missing nextSteps array gracefully", () => {
      const dataWithoutNextSteps: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
        welcomeOffer: mockData.welcomeOffer,
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithoutNextSteps,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle empty nextSteps array", () => {
      const dataWithEmptyNextSteps: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
        nextSteps: [],
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithEmptyNextSteps,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle nextSteps with missing URL", () => {
      const dataWithMissingUrl: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
        nextSteps: [
          {
            title: "Step without URL",
            description: "This step has no URL",
          },
        ],
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithMissingUrl,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe("theme and styling", () => {
    it("should use 'success' theme for email verified emails", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      expect(() => emailVerifiedTemplate.generate(context)).not.toThrow();
    });

    it("should include success color in feature section", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("border-left: 4px solid #16a34a");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined recipient name", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: { address: "user@test.com" },
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle recipient with empty name string", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: { address: "user@test.com", name: "" },
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Hi there");
      expect(result.text).toContain("Hi there");
    });

    it("should handle recipient with special characters in name", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: { address: "user@test.com", name: "John O'Brien-Smith Jr. 🚀" },
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("John O'Brien-Smith Jr. 🚀");
      expect(result.text).toContain("John O'Brien-Smith Jr. 🚀");
    });

    it("should handle null config values gracefully", () => {
      const nullConfig: AppIdentity = {
        brandName: null as unknown as string,
        supportEmail: null as unknown as string,
        baseUrl: null as unknown as string,
        clientUrl: null as unknown as string,
      };

      const templateWithNullConfig = new EmailVerifiedTemplate(nullConfig);
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = templateWithNullConfig.generate(context);

      expect(result.subject).toBe("Welcome to null - Email Verified! 🎉");
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle missing brand name", () => {
      const configWithoutBrand: AppIdentity = {
        ...mockAppIdentity,
        brandName: null as unknown as string,
      };

      const template = new EmailVerifiedTemplate(configWithoutBrand);
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.subject).toBe("Welcome to null - Email Verified! 🎉");
      expect(result.html).toBeDefined();
    });

    it("should handle missing client URL", () => {
      const configWithoutClientUrl: AppIdentity = {
        ...mockAppIdentity,
        clientUrl: null as unknown as string,
      };

      const template = new EmailVerifiedTemplate(configWithoutClientUrl);
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toContain("null/profile/complete");
      expect(result.text).toContain("null/profile/complete");
    });

    it("should handle missing support email", () => {
      const configWithoutSupport: AppIdentity = {
        ...mockAppIdentity,
        supportEmail: null as unknown as string,
      };

      const template = new EmailVerifiedTemplate(configWithoutSupport);
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = template.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toContain("Contact us at null");
    });

    it("should handle all optional fields being undefined", () => {
      const minimalData: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: false,
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: minimalData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.html).toContain("Questions? We're here to help");
      expect(result.html).toContain("Complete Your Profile");
      expect(result.html).not.toContain("Special Welcome Offer:");
    });

    it("should handle hasCompletedProfile being undefined", () => {
      const dataWithUndefinedProfile: EmailVerifiedData = {
        verifiedAt: baseDate,
        hasCompletedProfile: undefined as unknown as boolean,
        welcomeOffer: mockData.welcomeOffer,
      };
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: dataWithUndefinedProfile,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Complete Your Profile");
      expect(result.text).toContain("Complete your profile");
    });

    it("should handle verifiedAt date correctly", () => {
      const futureDate = new Date("2025-12-31T23:59:59Z");
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, verifiedAt: futureDate },
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it("should handle metadata in context", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {
          source: "email_verification",
          timestamp: Date.now(),
        },
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe("layout integration", () => {
    it("should call getLayout with correct parameters", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Layout HTML with:");
    });

    it("should include all required layout options", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("Welcome Aboard!");
      expect(result.html).toContain("Your email is verified. Start exploring TestFood");
      expect(result.html).toContain("primary");
      expect(result.html).toContain("success");
    });

    it("should use 'success' theme", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain("success");
    });
  });

  describe("template type consistency", () => {
    it("should have correct template type", () => {
      expect(emailVerifiedTemplate.templateType).toBe("EMAIL_VERIFIED");
    });

    it("should be usable as EmailTemplate<EmailVerifiedData>", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);
      expect(result).toBeDefined();
    });
  });

  describe("integration with AppIdentity", () => {
    it("should use all AppIdentity properties correctly", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: { ...mockData, welcomeOffer: undefined },
        metadata: {},
      };

      const result = emailVerifiedTemplate.generate(context);

      expect(result.html).toContain(mockConfig.brandName);
      expect(result.html).toContain(mockConfig.clientUrl);
      expect(result.html).toContain(mockConfig.supportEmail);
      expect(result.subject).toContain(mockConfig.brandName);
    });

    it("should use baseUrl for API links if needed", () => {
      const context: EmailTemplateContext & { data: EmailVerifiedData } = {
        recipient: mockRecipient,
        data: mockData,
        metadata: {},
      };

      emailVerifiedTemplate.generate(context);

      expect(mockConfig.baseUrl).toBe("https://api.testfood.com");
    });
  });
});
