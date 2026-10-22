import { EmailSenderAdapter } from "@/infrastructure/email/nodemailer-email-sender.adapter";
import {
  EmailClient,
  EmailTemplateFactory,
  VerificationEmailData,
  EmailVerifiedData,
  PasswordResetData,
  PasswordChangedData,
  AccountLockedData,
  EmailTemplate,
  EmailContent,
} from "@/application/ports/driven/email";

describe("EmailSenderAdapter", () => {
  let emailSenderAdapter: EmailSenderAdapter;
  let mockEmailClient: jest.Mocked<EmailClient>;
  let mockTemplateFactory: jest.Mocked<EmailTemplateFactory>;
  let mockVerificationTemplate: jest.Mocked<EmailTemplate<VerificationEmailData>>;
  let mockEmailVerifiedTemplate: jest.Mocked<EmailTemplate<EmailVerifiedData>>;
  let mockPasswordResetTemplate: jest.Mocked<EmailTemplate<PasswordResetData>>;
  let mockPasswordChangedTemplate: jest.Mocked<EmailTemplate<PasswordChangedData>>;
  let mockAccountLockedTemplate: jest.Mocked<EmailTemplate<AccountLockedData>>;

  const defaultTemplateContent: EmailContent = {
    subject: "Test Subject",
    html: "<p>Test HTML</p>",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmailClient = {
      sendEmail: jest.fn(),
    } as jest.Mocked<EmailClient>;

    mockVerificationTemplate = {
      templateType: "verification",
      generate: jest.fn().mockReturnValue(defaultTemplateContent),
    } as jest.Mocked<EmailTemplate<VerificationEmailData>>;

    mockEmailVerifiedTemplate = {
      templateType: "email-verified",
      generate: jest.fn().mockReturnValue(defaultTemplateContent),
    } as jest.Mocked<EmailTemplate<EmailVerifiedData>>;

    mockPasswordResetTemplate = {
      templateType: "password-reset",
      generate: jest.fn().mockReturnValue(defaultTemplateContent),
    } as jest.Mocked<EmailTemplate<PasswordResetData>>;

    mockPasswordChangedTemplate = {
      templateType: "password-changed",
      generate: jest.fn().mockReturnValue(defaultTemplateContent),
    } as jest.Mocked<EmailTemplate<PasswordChangedData>>;

    mockAccountLockedTemplate = {
      templateType: "account-locked",
      generate: jest.fn().mockReturnValue(defaultTemplateContent),
    } as jest.Mocked<EmailTemplate<AccountLockedData>>;

    mockTemplateFactory = {
      createVerificationEmailTemplate: jest.fn().mockReturnValue(mockVerificationTemplate),
      createEmailVerifiedTemplate: jest.fn().mockReturnValue(mockEmailVerifiedTemplate),
      createPasswordResetTemplate: jest.fn().mockReturnValue(mockPasswordResetTemplate),
      createPasswordChangedTemplate: jest.fn().mockReturnValue(mockPasswordChangedTemplate),
      createAccountLockedTemplate: jest.fn().mockReturnValue(mockAccountLockedTemplate),
    } as jest.Mocked<EmailTemplateFactory>;

    emailSenderAdapter = new EmailSenderAdapter(mockEmailClient, mockTemplateFactory);
  });

  describe("sendVerificationEmail", () => {
    const email = "user@test.com";
    const verificationData: VerificationEmailData = {
      token: "verification-token-123",
      expiresAt: new Date("2024-12-31T23:59:59Z"),
      userName: "Test User",
    };

    beforeEach(() => {
      mockEmailClient.sendEmail.mockResolvedValue();
    });

    it("should generate verification email template and send email", async () => {
      await emailSenderAdapter.sendVerificationEmail(email, verificationData);

      expect(mockTemplateFactory.createVerificationEmailTemplate).toHaveBeenCalledTimes(1);
      expect(mockVerificationTemplate.generate).toHaveBeenCalledTimes(1);
      expect(mockVerificationTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: email },
        data: verificationData,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: defaultTemplateContent.subject,
        html: defaultTemplateContent.html,
      });
    });
  });

  describe("sendEmailVerified", () => {
    const email = "user@test.com";
    const emailVerifiedData: EmailVerifiedData = {
      verifiedAt: new Date("2024-01-01T10:00:00Z"),
      hasCompletedProfile: true,
      welcomeOffer: "Get 10% off your first order with code WELCOME10",
      nextSteps: [
        {
          title: "Complete your profile",
          description: "Add more details to your profile",
          url: "https://test.com/profile",
        },
      ],
    };

    beforeEach(() => {
      mockEmailClient.sendEmail.mockResolvedValue();
    });

    it("should generate email verified template and send email", async () => {
      await emailSenderAdapter.sendEmailVerified(email, emailVerifiedData);

      expect(mockTemplateFactory.createEmailVerifiedTemplate).toHaveBeenCalledTimes(1);
      expect(mockEmailVerifiedTemplate.generate).toHaveBeenCalledTimes(1);
      expect(mockEmailVerifiedTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: email },
        data: emailVerifiedData,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: defaultTemplateContent.subject,
        html: defaultTemplateContent.html,
      });
    });
  });

  describe("sendPasswordReset", () => {
    const email = "user@test.com";
    const passwordResetData: PasswordResetData = {
      token: "reset-token-456",
      expiresAt: new Date("2024-12-31T23:59:59Z"),
      requestedAt: new Date().toISOString(),
      requestIpAddress: "192.168.1.1",
      requestDevice: "Chrome on Windows",
      requestLocation: "New York, USA",
    };

    beforeEach(() => {
      mockEmailClient.sendEmail.mockResolvedValue();
    });

    it("should generate password reset template and send email", async () => {
      await emailSenderAdapter.sendPasswordReset(email, passwordResetData);

      expect(mockTemplateFactory.createPasswordResetTemplate).toHaveBeenCalledTimes(1);
      expect(mockPasswordResetTemplate.generate).toHaveBeenCalledTimes(1);
      expect(mockPasswordResetTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: email },
        data: passwordResetData,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: defaultTemplateContent.subject,
        html: defaultTemplateContent.html,
      });
    });
  });

  describe("sendPasswordChanged", () => {
    const email = "user@test.com";
    const passwordChangedData: PasswordChangedData = {
      dateTime: new Date().toISOString(),
      location: "New York, USA",
      ipAddress: "192.168.1.1",
      device: "Chrome on Windows",
      wasYou: true,
      previousLoginDate: new Date(Date.now() - 86400000).toISOString(),
    };

    beforeEach(() => {
      mockEmailClient.sendEmail.mockResolvedValue();
    });

    it("should generate password changed template and send email", async () => {
      await emailSenderAdapter.sendPasswordChanged(email, passwordChangedData);

      expect(mockTemplateFactory.createPasswordChangedTemplate).toHaveBeenCalledTimes(1);
      expect(mockPasswordChangedTemplate.generate).toHaveBeenCalledTimes(1);
      expect(mockPasswordChangedTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: email },
        data: passwordChangedData,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: defaultTemplateContent.subject,
        html: defaultTemplateContent.html,
      });
    });
  });

  describe("sendAccountLocked", () => {
    const email = "user@test.com";
    const accountLockedData: AccountLockedData = {
      lockedAt: new Date("2024-01-01T10:00:00Z"),
      reason: "multiple_failed_attempts",
      unlockInstructions: "Please wait 30 minutes or contact support",
    };

    beforeEach(() => {
      mockEmailClient.sendEmail.mockResolvedValue();
    });

    it("should generate account locked template and send email", async () => {
      await emailSenderAdapter.sendAccountLocked(email, accountLockedData);

      expect(mockTemplateFactory.createAccountLockedTemplate).toHaveBeenCalledTimes(1);
      expect(mockAccountLockedTemplate.generate).toHaveBeenCalledTimes(1);
      expect(mockAccountLockedTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: email },
        data: accountLockedData,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: defaultTemplateContent.subject,
        html: defaultTemplateContent.html,
      });
    });

    it("should handle different account lock reasons", async () => {
      const reasons: Array<"multiple_failed_attempts" | "suspicious_activity" | "admin_action"> = [
        "multiple_failed_attempts",
        "suspicious_activity",
        "admin_action",
      ];

      for (const reason of reasons) {
        const data: AccountLockedData = {
          ...accountLockedData,
          reason,
        };
        mockAccountLockedTemplate.generate.mockClear();
        mockEmailClient.sendEmail.mockClear();

        await emailSenderAdapter.sendAccountLocked(email, data);

        expect(mockAccountLockedTemplate.generate).toHaveBeenCalledWith({
          recipient: { address: email },
          data,
        });
      }
    });
  });

  describe("sendEmail (private method)", () => {
    it("should log info when email is sent successfully", async () => {
      mockEmailClient.sendEmail.mockResolvedValue();

      await emailSenderAdapter.sendVerificationEmail("test@test.com", {
        token: "test-token",
        expiresAt: new Date(),
        userName: "test",
      });
    });

    it("should handle undefined context properties in logging", async () => {
      mockVerificationTemplate.generate.mockReturnValue(defaultTemplateContent);
      mockEmailClient.sendEmail.mockRejectedValue(new Error("Test error"));

      await expect(
        emailSenderAdapter.sendVerificationEmail("test@test.com", {
          token: "test-token",
          expiresAt: new Date(),
          userName: "test",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle template generation returning content without text field", async () => {
      const contentWithoutText: EmailContent = {
        subject: "Test",
        html: "<p>Test</p>",
      };
      mockVerificationTemplate.generate.mockReturnValue(contentWithoutText);
      mockEmailClient.sendEmail.mockResolvedValue();

      await emailSenderAdapter.sendVerificationEmail("test@test.com", {
        token: "test-token",
        expiresAt: new Date(),
        userName: "test",
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
    });

    it("should handle template generation errors - the error propagates and is not caught", async () => {
      const templateError = new Error("Template generation failed");
      mockVerificationTemplate.generate.mockImplementation(() => {
        throw templateError;
      });

      await expect(
        emailSenderAdapter.sendVerificationEmail("test@test.com", {
          token: "test-token",
          expiresAt: new Date(),
          userName: "test",
        }),
      ).rejects.toThrow("Template generation failed");

      expect(mockEmailClient.sendEmail).not.toHaveBeenCalled();
    });

    it("should handle multiple email sends sequentially", async () => {
      mockEmailClient.sendEmail.mockResolvedValue();

      await emailSenderAdapter.sendVerificationEmail("test1@test.com", {
        token: "token1",
        expiresAt: new Date(),
        userName: "User1",
      });
      await emailSenderAdapter.sendEmailVerified("test2@test.com", {
        verifiedAt: new Date(),
        hasCompletedProfile: false,
      });

      expect(mockEmailClient.sendEmail).toHaveBeenCalledTimes(2);
    });

    it("should handle all optional fields being undefined", async () => {
      const minimalVerificationData: VerificationEmailData = {
        token: "token",
        expiresAt: new Date(),
      };
      mockEmailClient.sendEmail.mockResolvedValue();

      await emailSenderAdapter.sendVerificationEmail("test@test.com", minimalVerificationData);

      expect(mockVerificationTemplate.generate).toHaveBeenCalledWith({
        recipient: { address: "test@test.com" },
        data: minimalVerificationData,
      });
    });
  });
});
