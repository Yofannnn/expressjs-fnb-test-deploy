import { EmailTemplateFactoryAdapter } from "@/infrastructure/email/email-template-factory";
import { AppIdentity } from "@/infrastructure/config/app-identity.config";
import { EmailTemplateFactory } from "@/application/ports/driven/email";

jest.mock("@/infrastructure/email/email-templates/verification-email.template", () => ({
  VerificationEmailTemplate: jest.fn().mockImplementation(() => ({
    templateType: "VERIFICATION_EMAIL",
    generate: jest.fn(),
  })),
}));

jest.mock("@/infrastructure/email/email-templates/account-locked.template", () => ({
  AccountLockedTemplate: jest.fn().mockImplementation(() => ({
    templateType: "ACCOUNT_LOCKED",
    generate: jest.fn(),
  })),
}));

jest.mock("@/infrastructure/email/email-templates/password-reset.template", () => ({
  PasswordResetTemplate: jest.fn().mockImplementation(() => ({
    templateType: "PASSWORD_RESET",
    generate: jest.fn(),
  })),
}));

jest.mock("@/infrastructure/email/email-templates/password-change.template", () => ({
  PasswordChangedTemplate: jest.fn().mockImplementation(() => ({
    templateType: "PASSWORD_CHANGED",
    generate: jest.fn(),
  })),
}));

jest.mock("@/infrastructure/email/email-templates/email-verified.template", () => ({
  EmailVerifiedTemplate: jest.fn().mockImplementation(() => ({
    templateType: "EMAIL_VERIFIED",
    generate: jest.fn(),
  })),
}));

import { VerificationEmailTemplate } from "@/infrastructure/email/email-templates/verification-email.template";
import { AccountLockedTemplate } from "@/infrastructure/email/email-templates/account-locked.template";
import { PasswordResetTemplate } from "@/infrastructure/email/email-templates/password-reset.template";
import { PasswordChangedTemplate } from "@/infrastructure/email/email-templates/password-change.template";
import { EmailVerifiedTemplate } from "@/infrastructure/email/email-templates/email-verified.template";

describe("EmailTemplateFactoryAdapter", () => {
  let emailTemplateFactory: EmailTemplateFactoryAdapter;
  let mockConfig: AppIdentity;

  const mockAppIdentity: AppIdentity = {
    brandName: "TestApp",
    supportEmail: "support@testapp.com",
    baseUrl: "https://api.testapp.com",
    clientUrl: "https://testapp.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = { ...mockAppIdentity };

    emailTemplateFactory = new EmailTemplateFactoryAdapter(mockConfig);
  });

  describe("constructor", () => {
    it("should store config for later use", () => {
      expect(emailTemplateFactory).toBeDefined();
      emailTemplateFactory.createVerificationEmailTemplate();
      expect(VerificationEmailTemplate).toHaveBeenCalledWith(mockConfig);
    });

    it("should not call any template constructors during initialization", () => {
      expect(VerificationEmailTemplate).not.toHaveBeenCalled();
      expect(AccountLockedTemplate).not.toHaveBeenCalled();
      expect(PasswordResetTemplate).not.toHaveBeenCalled();
      expect(PasswordChangedTemplate).not.toHaveBeenCalled();
      expect(EmailVerifiedTemplate).not.toHaveBeenCalled();
    });

    it("should accept AppIdentity config", () => {
      const factory = new EmailTemplateFactoryAdapter(mockConfig);
      expect(factory).toBeInstanceOf(EmailTemplateFactoryAdapter);
    });
  });

  describe("createVerificationEmailTemplate", () => {
    it("should create a verification email template with config", () => {
      const template = emailTemplateFactory.createVerificationEmailTemplate();

      expect(VerificationEmailTemplate).toHaveBeenCalledTimes(1);
      expect(VerificationEmailTemplate).toHaveBeenCalledWith(mockConfig);
      expect(template).toBeDefined();
      expect(template.templateType).toBe("VERIFICATION_EMAIL");
    });

    it("should create independent instances on each call", () => {
      const template1 = emailTemplateFactory.createVerificationEmailTemplate();
      const template2 = emailTemplateFactory.createVerificationEmailTemplate();

      expect(VerificationEmailTemplate).toHaveBeenCalledTimes(2);
      expect(template1).not.toBe(template2);
    });

    it("should pass the same config instance to all templates", () => {
      emailTemplateFactory.createVerificationEmailTemplate();
      emailTemplateFactory.createVerificationEmailTemplate();

      expect(VerificationEmailTemplate).toHaveBeenNthCalledWith(1, mockConfig);
      expect(VerificationEmailTemplate).toHaveBeenNthCalledWith(2, mockConfig);
    });

    it("should return EmailTemplate<VerificationEmailData> type", () => {
      const template = emailTemplateFactory.createVerificationEmailTemplate();
      expect(template).toHaveProperty("generate");
      expect(template).toHaveProperty("templateType");
    });
  });

  describe("createEmailVerifiedTemplate", () => {
    it("should create an email verified template with config", () => {
      const template = emailTemplateFactory.createEmailVerifiedTemplate();

      expect(EmailVerifiedTemplate).toHaveBeenCalledTimes(1);
      expect(EmailVerifiedTemplate).toHaveBeenCalledWith(mockConfig);
      expect(template).toBeDefined();
      expect(template.templateType).toBe("EMAIL_VERIFIED");
    });

    it("should create independent instances on each call", () => {
      const template1 = emailTemplateFactory.createEmailVerifiedTemplate();
      const template2 = emailTemplateFactory.createEmailVerifiedTemplate();

      expect(EmailVerifiedTemplate).toHaveBeenCalledTimes(2);
      expect(template1).not.toBe(template2);
    });

    it("should pass the same config instance to all templates", () => {
      emailTemplateFactory.createEmailVerifiedTemplate();
      emailTemplateFactory.createEmailVerifiedTemplate();

      expect(EmailVerifiedTemplate).toHaveBeenNthCalledWith(1, mockConfig);
      expect(EmailVerifiedTemplate).toHaveBeenNthCalledWith(2, mockConfig);
    });

    it("should return EmailTemplate<EmailVerifiedData> type", () => {
      const template = emailTemplateFactory.createEmailVerifiedTemplate();
      expect(template).toHaveProperty("generate");
      expect(template).toHaveProperty("templateType");
    });
  });

  describe("createPasswordResetTemplate", () => {
    it("should create a password reset template with config", () => {
      const template = emailTemplateFactory.createPasswordResetTemplate();

      expect(PasswordResetTemplate).toHaveBeenCalledTimes(1);
      expect(PasswordResetTemplate).toHaveBeenCalledWith(mockConfig);
      expect(template).toBeDefined();
      expect(template.templateType).toBe("PASSWORD_RESET");
    });

    it("should create independent instances on each call", () => {
      const template1 = emailTemplateFactory.createPasswordResetTemplate();
      const template2 = emailTemplateFactory.createPasswordResetTemplate();

      expect(PasswordResetTemplate).toHaveBeenCalledTimes(2);
      expect(template1).not.toBe(template2);
    });

    it("should pass the same config instance to all templates", () => {
      emailTemplateFactory.createPasswordResetTemplate();
      emailTemplateFactory.createPasswordResetTemplate();

      expect(PasswordResetTemplate).toHaveBeenNthCalledWith(1, mockConfig);
      expect(PasswordResetTemplate).toHaveBeenNthCalledWith(2, mockConfig);
    });

    it("should return EmailTemplate<PasswordResetData> type", () => {
      const template = emailTemplateFactory.createPasswordResetTemplate();
      expect(template).toHaveProperty("generate");
      expect(template).toHaveProperty("templateType");
    });
  });

  describe("createPasswordChangedTemplate", () => {
    it("should create a password changed template with config", () => {
      const template = emailTemplateFactory.createPasswordChangedTemplate();

      expect(PasswordChangedTemplate).toHaveBeenCalledTimes(1);
      expect(PasswordChangedTemplate).toHaveBeenCalledWith(mockConfig);
      expect(template).toBeDefined();
      expect(template.templateType).toBe("PASSWORD_CHANGED");
    });

    it("should create independent instances on each call", () => {
      const template1 = emailTemplateFactory.createPasswordChangedTemplate();
      const template2 = emailTemplateFactory.createPasswordChangedTemplate();

      expect(PasswordChangedTemplate).toHaveBeenCalledTimes(2);
      expect(template1).not.toBe(template2);
    });

    it("should pass the same config instance to all templates", () => {
      emailTemplateFactory.createPasswordChangedTemplate();
      emailTemplateFactory.createPasswordChangedTemplate();

      expect(PasswordChangedTemplate).toHaveBeenNthCalledWith(1, mockConfig);
      expect(PasswordChangedTemplate).toHaveBeenNthCalledWith(2, mockConfig);
    });

    it("should return EmailTemplate<PasswordChangedData> type", () => {
      const template = emailTemplateFactory.createPasswordChangedTemplate();
      expect(template).toHaveProperty("generate");
      expect(template).toHaveProperty("templateType");
    });
  });

  describe("createAccountLockedTemplate", () => {
    it("should create an account locked template with config", () => {
      const template = emailTemplateFactory.createAccountLockedTemplate();

      expect(AccountLockedTemplate).toHaveBeenCalledTimes(1);
      expect(AccountLockedTemplate).toHaveBeenCalledWith(mockConfig);
      expect(template).toBeDefined();
      expect(template.templateType).toBe("ACCOUNT_LOCKED");
    });

    it("should create independent instances on each call", () => {
      const template1 = emailTemplateFactory.createAccountLockedTemplate();
      const template2 = emailTemplateFactory.createAccountLockedTemplate();

      expect(AccountLockedTemplate).toHaveBeenCalledTimes(2);
      expect(template1).not.toBe(template2);
    });

    it("should pass the same config instance to all templates", () => {
      emailTemplateFactory.createAccountLockedTemplate();
      emailTemplateFactory.createAccountLockedTemplate();

      expect(AccountLockedTemplate).toHaveBeenNthCalledWith(1, mockConfig);
      expect(AccountLockedTemplate).toHaveBeenNthCalledWith(2, mockConfig);
    });

    it("should return EmailTemplate<AccountLockedData> type", () => {
      const template = emailTemplateFactory.createAccountLockedTemplate();
      expect(template).toHaveProperty("generate");
      expect(template).toHaveProperty("templateType");
    });
  });

  describe("integration with templates", () => {
    it("should create all template types correctly", () => {
      const templates = {
        verification: emailTemplateFactory.createVerificationEmailTemplate(),
        verified: emailTemplateFactory.createEmailVerifiedTemplate(),
        passwordReset: emailTemplateFactory.createPasswordResetTemplate(),
        passwordChanged: emailTemplateFactory.createPasswordChangedTemplate(),
        accountLocked: emailTemplateFactory.createAccountLockedTemplate(),
      };

      expect(templates.verification.templateType).toBe("VERIFICATION_EMAIL");
      expect(templates.verified.templateType).toBe("EMAIL_VERIFIED");
      expect(templates.passwordReset.templateType).toBe("PASSWORD_RESET");
      expect(templates.passwordChanged.templateType).toBe("PASSWORD_CHANGED");
      expect(templates.accountLocked.templateType).toBe("ACCOUNT_LOCKED");
    });

    it("should pass the same config to all template types", () => {
      emailTemplateFactory.createVerificationEmailTemplate();
      emailTemplateFactory.createEmailVerifiedTemplate();
      emailTemplateFactory.createPasswordResetTemplate();
      emailTemplateFactory.createPasswordChangedTemplate();
      emailTemplateFactory.createAccountLockedTemplate();

      expect(VerificationEmailTemplate).toHaveBeenCalledWith(mockConfig);
      expect(EmailVerifiedTemplate).toHaveBeenCalledWith(mockConfig);
      expect(PasswordResetTemplate).toHaveBeenCalledWith(mockConfig);
      expect(PasswordChangedTemplate).toHaveBeenCalledWith(mockConfig);
      expect(AccountLockedTemplate).toHaveBeenCalledWith(mockConfig);
    });

    it("should create all templates with proper types", () => {
      const factory: EmailTemplateFactory = emailTemplateFactory;

      expect(factory.createVerificationEmailTemplate()).toBeDefined();
      expect(factory.createEmailVerifiedTemplate()).toBeDefined();
      expect(factory.createPasswordResetTemplate()).toBeDefined();
      expect(factory.createPasswordChangedTemplate()).toBeDefined();
      expect(factory.createAccountLockedTemplate()).toBeDefined();
    });
  });

  describe("config handling", () => {
    it("should work with minimal config", () => {
      const minimalConfig: AppIdentity = {
        brandName: "",
        supportEmail: "",
        baseUrl: "",
        clientUrl: "",
      };

      const factory = new EmailTemplateFactoryAdapter(minimalConfig);
      const template = factory.createVerificationEmailTemplate();
      expect(template).toBeDefined();
    });

    it("should handle config with missing values", () => {
      const incompleteConfig: AppIdentity = {
        brandName: "Test",
        supportEmail: undefined as unknown as string,
        baseUrl: undefined as unknown as string,
        clientUrl: undefined as unknown as string,
      };

      const factory = new EmailTemplateFactoryAdapter(incompleteConfig);
      const template = factory.createVerificationEmailTemplate();
      expect(template).toBeDefined();
    });

    it("should preserve config reference", () => {
      const customConfig: AppIdentity = {
        brandName: "CustomApp",
        supportEmail: "custom@test.com",
        baseUrl: "https://api.custom.com",
        clientUrl: "https://custom.com",
      };

      const factory = new EmailTemplateFactoryAdapter(customConfig);
      const template = factory.createVerificationEmailTemplate();

      expect(template).toBeDefined();
      expect(VerificationEmailTemplate).toHaveBeenCalledWith(customConfig);
    });

    it("should pass config to all templates when called", () => {
      const customConfig: AppIdentity = {
        brandName: "TestBrand",
        supportEmail: "test@test.com",
        baseUrl: "https://api.test.com",
        clientUrl: "https://test.com",
      };

      const factory = new EmailTemplateFactoryAdapter(customConfig);

      factory.createVerificationEmailTemplate();
      factory.createAccountLockedTemplate();
      factory.createPasswordResetTemplate();

      expect(VerificationEmailTemplate).toHaveBeenCalledWith(customConfig);
      expect(AccountLockedTemplate).toHaveBeenCalledWith(customConfig);
      expect(PasswordResetTemplate).toHaveBeenCalledWith(customConfig);
    });
  });

  describe("type safety", () => {
    it("should return templates with correct generic types", () => {
      const verificationTemplate = emailTemplateFactory.createVerificationEmailTemplate();
      const verifiedTemplate = emailTemplateFactory.createEmailVerifiedTemplate();
      const passwordResetTemplate = emailTemplateFactory.createPasswordResetTemplate();
      const passwordChangedTemplate = emailTemplateFactory.createPasswordChangedTemplate();
      const accountLockedTemplate = emailTemplateFactory.createAccountLockedTemplate();

      expect(verificationTemplate.generate).toBeDefined();
      expect(verifiedTemplate.generate).toBeDefined();
      expect(passwordResetTemplate.generate).toBeDefined();
      expect(passwordChangedTemplate.generate).toBeDefined();
      expect(accountLockedTemplate.generate).toBeDefined();
    });

    it("should have correct templateType for each template", () => {
      const templates = [
        emailTemplateFactory.createVerificationEmailTemplate(),
        emailTemplateFactory.createEmailVerifiedTemplate(),
        emailTemplateFactory.createPasswordResetTemplate(),
        emailTemplateFactory.createPasswordChangedTemplate(),
        emailTemplateFactory.createAccountLockedTemplate(),
      ];

      const expectedTypes = ["VERIFICATION_EMAIL", "EMAIL_VERIFIED", "PASSWORD_RESET", "PASSWORD_CHANGED", "ACCOUNT_LOCKED"];

      templates.forEach((template, index) => {
        expect(template.templateType).toBe(expectedTypes[index]);
      });
    });

    it("should implement EmailTemplateFactory interface", () => {
      const factory: EmailTemplateFactory = emailTemplateFactory;

      expect(factory.createVerificationEmailTemplate).toBeDefined();
      expect(factory.createEmailVerifiedTemplate).toBeDefined();
      expect(factory.createPasswordResetTemplate).toBeDefined();
      expect(factory.createPasswordChangedTemplate).toBeDefined();
      expect(factory.createAccountLockedTemplate).toBeDefined();
    });
  });

  describe("performance considerations", () => {
    it("should create templates lazily (only when requested)", () => {
      expect(emailTemplateFactory).toBeDefined();

      const template = emailTemplateFactory.createVerificationEmailTemplate();
      expect(template).toBeDefined();
    });

    it("should create new instances each time (no caching)", () => {
      const template1 = emailTemplateFactory.createVerificationEmailTemplate();
      const template2 = emailTemplateFactory.createVerificationEmailTemplate();
      expect(template1).not.toBe(template2);
    });

    it("should create separate instances for different template types", () => {
      const template1 = emailTemplateFactory.createVerificationEmailTemplate();
      const template2 = emailTemplateFactory.createAccountLockedTemplate();

      expect(template1).not.toBe(template2);
      expect(template1.templateType).toBe("VERIFICATION_EMAIL");
      expect(template2.templateType).toBe("ACCOUNT_LOCKED");
    });
  });

  describe("error handling", () => {
    it("should handle null config gracefully", () => {
      const factory = new EmailTemplateFactoryAdapter(null as unknown as AppIdentity);
      const template = factory.createVerificationEmailTemplate();

      expect(template).toBeDefined();
    });

    it("should handle undefined config gracefully", () => {
      const factory = new EmailTemplateFactoryAdapter(undefined as unknown as AppIdentity);
      const template = factory.createVerificationEmailTemplate();

      expect(template).toBeDefined();
    });

    it("should propagate template constructor errors", () => {
      const error = new Error("Template constructor failed");
      (VerificationEmailTemplate as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => emailTemplateFactory.createVerificationEmailTemplate()).toThrow(error);
    });

    it("should handle template constructor throwing non-Error objects", () => {
      (VerificationEmailTemplate as jest.Mock).mockImplementationOnce(() => {
        throw "string error";
      });

      expect(() => emailTemplateFactory.createVerificationEmailTemplate()).toThrow("string error");
    });
  });

  describe("additional scenario tests", () => {
    it("should create templates in sequence without interference", () => {
      const templates = [];

      for (let i = 0; i < 3; i++) {
        templates.push(emailTemplateFactory.createVerificationEmailTemplate());
        templates.push(emailTemplateFactory.createAccountLockedTemplate());
      }

      expect(templates).toHaveLength(6);
      expect(VerificationEmailTemplate).toHaveBeenCalledTimes(3);
      expect(AccountLockedTemplate).toHaveBeenCalledTimes(3);
    });

    it("should work with config containing special characters", () => {
      const specialConfig: AppIdentity = {
        brandName: "Test&App!@#$",
        supportEmail: "support+test@example.com",
        baseUrl: "https://api.test.com",
        clientUrl: "https://test.com",
      };

      const factory = new EmailTemplateFactoryAdapter(specialConfig);
      const template = factory.createVerificationEmailTemplate();

      expect(template).toBeDefined();
      expect(VerificationEmailTemplate).toHaveBeenCalledWith(specialConfig);
    });

    it("should handle config with empty strings", () => {
      const emptyConfig: AppIdentity = {
        brandName: "",
        supportEmail: "",
        baseUrl: "",
        clientUrl: "",
      };

      const factory = new EmailTemplateFactoryAdapter(emptyConfig);

      factory.createVerificationEmailTemplate();
      factory.createAccountLockedTemplate();
      factory.createPasswordResetTemplate();

      expect(VerificationEmailTemplate).toHaveBeenCalledWith(emptyConfig);
      expect(AccountLockedTemplate).toHaveBeenCalledWith(emptyConfig);
      expect(PasswordResetTemplate).toHaveBeenCalledWith(emptyConfig);
    });

    it("should handle config with only brand name", () => {
      const minimalConfig: AppIdentity = {
        brandName: "MinimalApp",
        supportEmail: "",
        baseUrl: "",
        clientUrl: "",
      };

      const factory = new EmailTemplateFactoryAdapter(minimalConfig);
      const template = factory.createVerificationEmailTemplate();

      expect(template).toBeDefined();
      expect(VerificationEmailTemplate).toHaveBeenCalledWith(minimalConfig);
    });

    it("should handle config with only support email", () => {
      const minimalConfig: AppIdentity = {
        brandName: "",
        supportEmail: "support@test.com",
        baseUrl: "",
        clientUrl: "",
      };

      const factory = new EmailTemplateFactoryAdapter(minimalConfig);
      const template = factory.createAccountLockedTemplate();

      expect(template).toBeDefined();
      expect(AccountLockedTemplate).toHaveBeenCalledWith(minimalConfig);
    });
  });
});
