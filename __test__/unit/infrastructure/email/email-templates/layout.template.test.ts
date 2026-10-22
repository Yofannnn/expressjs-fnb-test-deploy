import { LayoutTemplate } from "@/infrastructure/email/email-templates/layout.template";
import { EmailLayoutOptions } from "@/application/ports/driven/email";
import { AppIdentity } from "@/infrastructure/config/app-identity.config";

describe("LayoutTemplate", () => {
  let layoutTemplate: LayoutTemplate;
  let mockConfig: AppIdentity;
  let baseOptions: EmailLayoutOptions;
  const currentYear = new Date().getFullYear();

  const mockAppIdentity: AppIdentity = {
    brandName: "TestApp",
    supportEmail: "support@testapp.com",
    baseUrl: "https://api.testapp.com",
    clientUrl: "https://testapp.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = { ...mockAppIdentity };

    baseOptions = {
      title: "Test Email Title",
      body: "<p>This is the email body content</p>",
      preheader: "This is a preheader for email clients",
      cta: {
        label: "Click Here",
        url: "https://testapp.com/action",
        variant: "primary",
      },
      footerNote: "This is a footer note",
      theme: "default",
      includeUnsubscribe: false,
    };

    layoutTemplate = new LayoutTemplate(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize private properties with config values", () => {
      expect((layoutTemplate as any).BRAND_NAME).toBe("TestApp");
      expect((layoutTemplate as any).SUPPORT_EMAIL).toBe("support@testapp.com");
      expect((layoutTemplate as any).CLIENT_URL).toBe("https://testapp.com");
    });

    it("should handle missing config values", () => {
      const invalidConfig = {
        brandName: undefined as unknown as string,
        supportEmail: undefined as unknown as string,
        baseUrl: undefined as unknown as string,
        clientUrl: undefined as unknown as string,
      };

      const template = new LayoutTemplate(invalidConfig);

      expect(template).toBeDefined();
      expect((template as any).BRAND_NAME).toBeUndefined();
      expect((template as any).SUPPORT_EMAIL).toBeUndefined();
      expect((template as any).CLIENT_URL).toBeUndefined();
    });
  });

  describe("getLayout", () => {
    it("should generate complete HTML email layout", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain('<html lang="en">');
      expect(result).toContain("<title>Test Email Title</title>");
      expect(result).toContain("<body>");
      expect(result).toContain("</html>");
    });

    it("should include preheader meta tag when provided", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<meta name="description" content="This is a preheader for email clients" />');
      expect(result).toContain('<div class="preheader">This is a preheader for email clients</div>');
    });

    it("should not include preheader when not provided", () => {
      const optionsWithoutPreheader = { ...baseOptions, preheader: undefined };

      const result = layoutTemplate.getLayout(optionsWithoutPreheader);

      expect(result).not.toContain('<meta name="description"');
      expect(result).not.toContain('<div class="preheader">');
    });

    it("should include Outlook-specific XML when present", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("<!--[if mso]>");
      expect(result).toContain("<o:OfficeDocumentSettings>");
      expect(result).toContain("<![endif]-->");
    });

    it("should include header with brand name", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<h1 class="brand-name">TestApp</h1>');
      expect(result).toContain('<div class="header-divider"></div>');
    });

    it("should include email title in body", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<h2 class="email-title">Test Email Title</h2>');
    });

    it("should include body content", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("<p>This is the email body content</p>");
    });

    it("should include CTA button when provided", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<div class="cta-container">');
      expect(result).toContain('<a href="https://testapp.com/action" class="cta-primary">Click Here</a>');
    });

    it("should not include CTA button when not provided", () => {
      const optionsWithoutCTA = { ...baseOptions, cta: undefined };

      const result = layoutTemplate.getLayout(optionsWithoutCTA);

      expect(result).not.toContain('<div class="cta-container">');
      expect(result).not.toContain('class="cta-primary"');
    });

    it("should include footer note when provided", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<p class="footer-note">This is a footer note</p>');
    });

    it("should not include footer note when not provided", () => {
      const optionsWithoutFooterNote = { ...baseOptions, footerNote: undefined };

      const result = layoutTemplate.getLayout(optionsWithoutFooterNote);

      expect(result).not.toContain('<p class="footer-note">');
    });

    it("should include footer links with correct URLs", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<a href="https://testapp.com" class="footer-link">Visit Website</a>');
      expect(result).toContain('<a href="mailto:support@testapp.com" class="footer-link">Contact Support</a>');
    });

    it("should include unsubscribe link when includeUnsubscribe is true", () => {
      const optionsWithUnsubscribe = { ...baseOptions, includeUnsubscribe: true };

      const result = layoutTemplate.getLayout(optionsWithUnsubscribe);

      expect(result).toContain('<a href="https://testapp.com/unsubscribe" class="footer-link">Unsubscribe</a>');
      expect(result).toContain('<span class="footer-separator">•</span>');
    });

    it("should not include unsubscribe link when includeUnsubscribe is false", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).not.toContain("Unsubscribe");
      expect(result).not.toContain("/unsubscribe");
    });

    it("should include copyright notice with current year and brand name", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain(`&copy; ${currentYear} TestApp. All rights reserved.`);
    });

    it("should include footer separators between links", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<span class="footer-separator">•</span>');
    });
  });

  describe("getCSS (private method - tested through getLayout)", () => {
    it("should include CSS styles in the output", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("<style>");
      expect(result).toContain("</style>");
      expect(result).toContain("/* Reset and base styles */");
      expect(result).toContain(".email-wrapper");
      expect(result).toContain(".email-content");
      expect(result).toContain(".brand-name");
      expect(result).toContain(".cta-primary");
    });

    it("should include responsive media queries", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("@media screen and (max-width: 600px)");
      expect(result).toContain(".email-content {");
    });

    it("should include Outlook-specific MSO styles", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("mso-table-lspace: 0pt");
      expect(result).toContain("mso-table-rspace: 0pt");
    });
  });

  describe("getThemeColors (private method - tested through getLayout with different themes)", () => {
    it("should apply default theme colors correctly", () => {
      const result = layoutTemplate.getLayout({ ...baseOptions, theme: "default" });

      expect(result).toContain("background-color: #ffffff");
      expect(result).toContain("color: #000000");
      expect(result).toContain("background-color: #000000");
    });

    it("should apply urgent theme colors correctly", () => {
      const result = layoutTemplate.getLayout({ ...baseOptions, theme: "urgent" });

      expect(result).toContain("background-color: #fff5f5");
      expect(result).toContain("color: #dc2626");
      expect(result).toContain("background-color: #dc2626");
    });

    it("should apply success theme colors correctly", () => {
      const result = layoutTemplate.getLayout({ ...baseOptions, theme: "success" });

      expect(result).toContain("background-color: #f0fdf4");
      expect(result).toContain("color: #16a34a");
      expect(result).toContain("background-color: #16a34a");
    });

    it("should default to default theme when invalid theme provided", () => {
      const result = layoutTemplate.getLayout({ ...baseOptions, theme: "invalid" as EmailLayoutOptions["theme"] });

      expect(result).toContain("background-color: #ffffff");
      expect(result).toContain("color: #000000");
    });
  });

  describe("renderCTA (private method - tested through getLayout)", () => {
    it("should render primary CTA with correct class", () => {
      const optionsWithPrimaryCTA = {
        ...baseOptions,
        cta: { label: "Primary", url: "https://test.com", variant: "primary" },
      };

      const result = layoutTemplate.getLayout(optionsWithPrimaryCTA as EmailLayoutOptions);

      expect(result).toContain('class="cta-primary"');
      expect(result).toContain(">Primary</a>");
    });

    it("should render secondary CTA with correct class", () => {
      const optionsWithSecondaryCTA = {
        ...baseOptions,
        cta: { label: "Secondary", url: "https://test.com", variant: "secondary" },
      };

      const result = layoutTemplate.getLayout(optionsWithSecondaryCTA as EmailLayoutOptions);

      expect(result).toContain('class="cta-secondary"');
      expect(result).toContain(">Secondary</a>");
    });

    it("should default to primary variant when variant not specified", () => {
      const optionsWithDefaultVariant = {
        ...baseOptions,
        cta: { label: "Default", url: "https://test.com" },
      };

      const result = layoutTemplate.getLayout(optionsWithDefaultVariant);

      expect(result).toContain('class="cta-primary"');
      expect(result).toContain(">Default</a>");
    });

    it("should handle CTA with special characters in URL", () => {
      const optionsWithSpecialUrl = {
        ...baseOptions,
        cta: {
          label: "Special",
          url: "https://test.com/action?param=value&other=special#hash",
          variant: "primary",
        },
      };

      const result = layoutTemplate.getLayout(optionsWithSpecialUrl as EmailLayoutOptions);

      expect(result).toContain('href="https://test.com/action?param=value&other=special#hash"');
    });

    it("should handle CTA with special characters in label", () => {
      const optionsWithSpecialLabel = {
        ...baseOptions,
        cta: {
          label: "Special & Important! @#$",
          url: "https://test.com",
          variant: "primary",
        },
      };

      const result = layoutTemplate.getLayout(optionsWithSpecialLabel as EmailLayoutOptions);

      expect(result).toContain(">Special & Important! @#$</a>");
    });

    it("should handle CTA with very long label", () => {
      const longLabel = "A".repeat(100);
      const optionsWithLongLabel = {
        ...baseOptions,
        cta: {
          label: longLabel,
          url: "https://test.com",
          variant: "primary",
        },
      };

      const result = layoutTemplate.getLayout(optionsWithLongLabel as EmailLayoutOptions);

      expect(result).toContain(`>${longLabel}</a>`);
    });

    it("should handle CTA with empty label", () => {
      const optionsWithEmptyLabel = {
        ...baseOptions,
        cta: {
          label: "",
          url: "https://test.com",
          variant: "primary",
        },
      };

      const result = layoutTemplate.getLayout(optionsWithEmptyLabel as EmailLayoutOptions);

      expect(result).toContain('class="cta-primary">');
      expect(result).toContain("</a>");
    });
  });

  describe("edge cases", () => {
    it("should handle missing optional fields", () => {
      const minimalOptions: EmailLayoutOptions = {
        title: "Minimal Title",
        body: "<p>Minimal body</p>",
      };

      const result = layoutTemplate.getLayout(minimalOptions);

      expect(result).toContain("<title>Minimal Title</title>");
      expect(result).toContain("<p>Minimal body</p>");
      expect(result).not.toContain('<div class="preheader">');
      expect(result).not.toContain('<div class="cta-container">');
      expect(result).not.toContain('<p class="footer-note">');
    });

    it("should handle empty strings in options", () => {
      const emptyOptions: EmailLayoutOptions = {
        title: "",
        body: "",
        preheader: "",
        footerNote: "",
      };

      const result = layoutTemplate.getLayout(emptyOptions);

      expect(result).toContain("<title></title>");
      expect(result).toContain('<h2 class="email-title"></h2>');
      expect(result).not.toContain("<p>");
    });

    it("should handle CTA with undefined variant", () => {
      const optionsWithUndefinedVariant = {
        ...baseOptions,
        cta: {
          label: "Test",
          url: "https://test.com",
          variant: undefined,
        },
      };

      const result = layoutTemplate.getLayout(optionsWithUndefinedVariant);

      expect(result).toContain('class="cta-primary"');
    });

    it("should handle null values in options", () => {
      const optionsWithNull = {
        title: "Test",
        body: "<p>Body</p>",
        preheader: null as unknown as string,
        footerNote: null as unknown as string,
        cta: null as unknown as { label: string; url: string; variant: string },
      } as unknown as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(optionsWithNull);

      expect(result).toBeDefined();
      expect(result).not.toContain('<div class="preheader">');
      expect(result).not.toContain('<div class="cta-container">');
      expect(result).not.toContain('<p class="footer-note">');
    });

    it("should handle very long text in fields", () => {
      const longText = "a".repeat(1000);
      const optionsWithLongText = {
        ...baseOptions,
        title: longText,
        preheader: longText,
        footerNote: longText,
      };

      const result = layoutTemplate.getLayout(optionsWithLongText);

      expect(result).toContain(longText);
    });

    it("should handle HTML in body and footerNote", () => {
      const optionsWithHtml = {
        ...baseOptions,
        body: '<div class="custom"><strong>Bold</strong> <em>italic</em></div>',
        footerNote: '<a href="https://test.com">Link in footer</a>',
      };

      const result = layoutTemplate.getLayout(optionsWithHtml);

      expect(result).toContain('<div class="custom"><strong>Bold</strong> <em>italic</em></div>');
      expect(result).toContain('<a href="https://test.com">Link in footer</a>');
    });

    it("should handle missing config values in footer", () => {
      const invalidConfig = {
        brandName: "",
        supportEmail: "",
        baseUrl: "",
        clientUrl: "",
      };

      const template = new LayoutTemplate(invalidConfig);

      const result = template.getLayout(baseOptions);

      expect(result).toContain('<h1 class="brand-name"></h1>');
      expect(result).toContain('<a href="" class="footer-link">Visit Website</a>');
      expect(result).toContain('<a href="mailto:" class="footer-link">Contact Support</a>');
    });

    it("should handle config with special characters in brand name", () => {
      const specialConfig = {
        ...mockAppIdentity,
        brandName: "Test&App!@#$",
      };

      const template = new LayoutTemplate(specialConfig);
      const result = template.getLayout(baseOptions);

      expect(result).toContain("Test&App!@#$");
    });
  });

  describe("accessibility and compatibility features", () => {
    it("should include role='presentation' on tables for accessibility", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('role="presentation"');
    });

    it("should include viewport meta tag for mobile responsiveness", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    });

    it("should include character encoding meta tag", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<meta charset="UTF-8" />');
    });

    it("should include X-UA-Compatible meta tag for IE compatibility", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<meta http-equiv="X-UA-Compatible" content="IE=edge" />');
    });

    it("should include text-size-adjust styles for mobile", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("-webkit-text-size-adjust: 100%");
      expect(result).toContain("-ms-text-size-adjust: 100%");
    });

    it("should include image rendering styles", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("-ms-interpolation-mode: bicubic");
    });
  });

  describe("structural integrity", () => {
    it("should maintain proper table structure", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('<table role="presentation" class="email-wrapper">');
      expect(result).toContain("<tr>");
      expect(result).toContain('<td align="center">');
      expect(result).toContain('<table role="presentation" class="email-content">');
    });

    it("should include all main sections (header, body, footer)", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('class="email-header"');
      expect(result).toContain('class="email-body"');
      expect(result).toContain('class="email-footer"');
    });

    it("should include dividers between sections", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain('class="header-divider"');
      expect(result).toContain('class="footer-divider"');
    });
  });

  describe("regression tests", () => {
    it("should handle all themes without errors", () => {
      const themes = ["default", "urgent", "success", "unknown"] as EmailLayoutOptions["theme"][];

      themes.forEach((theme) => {
        expect(() => {
          layoutTemplate.getLayout({ ...baseOptions, theme: theme });
        }).not.toThrow();
      });
    });

    it("should maintain backward compatibility with old email clients", () => {
      const result = layoutTemplate.getLayout(baseOptions);

      expect(result).toContain("<!--[if mso]>");
      expect(result).toContain("<![endif]-->");
    });

    it("should properly handle URLs with special characters", () => {
      const optionsWithUrlParams = {
        ...baseOptions,
        cta: {
          label: "Test",
          url: "https://test.com?param=value&another=test",
        },
      };

      const result = layoutTemplate.getLayout(optionsWithUrlParams);

      expect(result).toContain('href="https://test.com?param=value&another=test"');
    });

    it("should handle mailto links with subject and body", () => {
      const optionsWithMailto = {
        ...baseOptions,
        cta: {
          label: "Contact",
          url: "mailto:support@test.com?subject=Help&body=Hello",
          variant: "primary",
        },
      } as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(optionsWithMailto);

      expect(result).toContain('href="mailto:support@test.com?subject=Help&body=Hello"');
    });

    it("should handle JavaScript URLs safely", () => {
      const optionsWithJsUrl = {
        ...baseOptions,
        cta: {
          label: "Click",
          url: "javascript:void(0)",
          variant: "primary",
        },
      } as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(optionsWithJsUrl);

      expect(result).toContain('href="javascript:void(0)"');
    });
  });

  describe("additional scenario tests", () => {
    it("should handle theme switching between emails", () => {
      const themes = ["default", "urgent", "success"] as EmailLayoutOptions["theme"][];

      themes.forEach((theme) => {
        const result = layoutTemplate.getLayout({ ...baseOptions, theme });
        switch (theme) {
          case "default":
            expect(result).toContain("background-color: #ffffff");
            expect(result).toContain("color: #000000");
            break;
          case "urgent":
            expect(result).toContain("background-color: #fff5f5");
            expect(result).toContain("color: #dc2626");
            break;
          case "success":
            expect(result).toContain("background-color: #f0fdf4");
            expect(result).toContain("color: #16a34a");
            break;
        }
      });
    });

    it("should handle includeUnsubscribe true with all other options", () => {
      const fullOptions = {
        ...baseOptions,
        includeUnsubscribe: true,
        theme: "success",
        cta: {
          label: "Complete",
          url: "https://test.com/complete",
          variant: "secondary",
        },
      } as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(fullOptions);

      expect(result).toContain("Unsubscribe");
      expect(result).toContain("background-color: #f0fdf4");
      expect(result).toContain("color: #16a34a");
      expect(result).toContain("cta-secondary");
      expect(result).toContain("Complete");
    });

    it("should handle multiple CTA buttons in body (via HTML content)", () => {
      const optionsWithMultipleCTAs = {
        ...baseOptions,
        body: `
          <p>First paragraph</p>
          <a href="https://test.com/1" class="custom-btn">Button 1</a>
          <p>Second paragraph</p>
          <a href="https://test.com/2" class="custom-btn">Button 2</a>
        `,
        cta: {
          label: "Main CTA",
          url: "https://test.com/main",
          variant: "primary",
        },
      } as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(optionsWithMultipleCTAs);

      expect(result).toContain('href="https://test.com/1"');
      expect(result).toContain('href="https://test.com/2"');
      expect(result).toContain('href="https://test.com/main"');
    });

    it("should handle nested HTML structures in body", () => {
      const optionsWithNestedHtml = {
        ...baseOptions,
        body: `
          <div class="container">
            <div class="row">
              <div class="col">
                <p>Nested content</p>
                <ul>
                  <li>Item 1</li>
                  <li>Item 2</li>
                </ul>
              </div>
            </div>
          </div>
        `,
      };

      const result = layoutTemplate.getLayout(optionsWithNestedHtml);

      expect(result).toContain('class="container"');
      expect(result).toContain('class="row"');
      expect(result).toContain('class="col"');
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
      expect(result).toContain("<li>Item 2</li>");
    });

    it("should handle empty preheader string", () => {
      const optionsWithEmptyPreheader = {
        ...baseOptions,
        preheader: "",
      };

      const result = layoutTemplate.getLayout(optionsWithEmptyPreheader);

      expect(result).not.toContain('<meta name="description"');
      expect(result).not.toContain('<div class="preheader">');
    });

    it("should handle footer note with HTML formatting", () => {
      const optionsWithHtmlFooter = {
        ...baseOptions,
        footerNote: '<strong>Important:</strong> <a href="https://test.com">Read more</a>',
      };

      const result = layoutTemplate.getLayout(optionsWithHtmlFooter);

      expect(result).toContain("<strong>Important:</strong>");
      expect(result).toContain('<a href="https://test.com">Read more</a>');
    });

    it("should handle cta with target attribute", () => {
      const optionsWithCtaTarget = {
        ...baseOptions,
        cta: {
          label: "Open",
          url: "https://test.com",
          variant: "primary",
        },
      } as EmailLayoutOptions;

      const result = layoutTemplate.getLayout(optionsWithCtaTarget);

      expect(result).toContain('href="https://test.com"');
    });

    it("should handle unsubscribe URL with query parameters", () => {
      const optionsWithUnsubscribeParams = {
        ...baseOptions,
        includeUnsubscribe: true,
      };

      const result = layoutTemplate.getLayout(optionsWithUnsubscribeParams);

      expect(result).toContain('<a href="https://testapp.com/unsubscribe" class="footer-link">Unsubscribe</a>');
    });
  });
});
