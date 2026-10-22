/* eslint-disable no-empty */
import { NodemailerAdapter } from "@/infrastructure/email/nodemailer.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { SERVER_EXCEPTIONS } from "@/application/exceptions/server.exception";
import { NodemailerTransportConfig } from "@/infrastructure/config/nodemailer.config";
import { createTransport } from "nodemailer";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

describe("NodemailerAdapter", () => {
  let nodemailerAdapter: NodemailerAdapter;
  let mockConfig: NodemailerTransportConfig;
  let mockLogger: jest.Mocked<Logger>;
  let mockTransporter: { sendMail: jest.Mock };

  const mockTransportConfig: NodemailerTransportConfig = {
    host: "smtp.gmail.com",
    port: 587,
    user: "test@test.com",
    password: "test-password",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = { ...mockTransportConfig };

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockTransporter = {
      sendMail: jest.fn(),
    };

    (createTransport as jest.Mock).mockReturnValue(mockTransporter);

    nodemailerAdapter = new NodemailerAdapter(mockConfig, mockLogger);
  });

  describe("constructor", () => {
    it("should store config and logger", () => {
      expect(nodemailerAdapter).toBeInstanceOf(NodemailerAdapter);
    });

    it("should accept NodemailerTransportConfig", () => {
      const adapter = new NodemailerAdapter(mockConfig, mockLogger);
      expect(adapter).toBeDefined();
    });
  });

  describe("sendEmail", () => {
    const emailOptions = {
      to: "recipient@test.com",
      subject: "Test Subject",
      html: "<p>Test HTML content</p>",
    };

    it("should successfully send an email", async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: "test-id" });

      await nodemailerAdapter.sendEmail(emailOptions);

      expect(createTransport).toHaveBeenCalledTimes(1);
      expect(createTransport).toHaveBeenCalledWith({
        host: "smtp.gmail.com",
        port: 587,
        secure: true,
        auth: {
          user: "test@test.com",
          pass: "test-password",
        },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "test@test.com",
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should create transporter with correct configuration", async () => {
      mockTransporter.sendMail.mockResolvedValue({});

      await nodemailerAdapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith({
        host: "smtp.gmail.com",
        port: 587,
        secure: true,
        auth: {
          user: "test@test.com",
          pass: "test-password",
        },
      });
    });

    it("should handle different email options correctly", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const differentOptions = {
        to: "another@test.com",
        subject: "Different Subject",
        html: "<div>Different content</div>",
      };

      await nodemailerAdapter.sendEmail(differentOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "test@test.com",
        to: differentOptions.to,
        subject: differentOptions.subject,
        html: differentOptions.html,
      });
    });

    it("should use config user as from address", async () => {
      mockTransporter.sendMail.mockResolvedValue({});

      await nodemailerAdapter.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "test@test.com",
        }),
      );
    });

    it("should handle email with special characters in subject", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithSpecialChars = {
        to: "test@test.com",
        subject: "Special chars: !@#$%^&*()",
        html: "<p>Content</p>",
      };

      await nodemailerAdapter.sendEmail(optionsWithSpecialChars);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Special chars: !@#$%^&*()",
        }),
      );
    });

    it("should handle HTML with inline styles", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithStyledHtml = {
        to: "test@test.com",
        subject: "Styled Email",
        html: '<div style="color: red; font-size: 16px;">Styled content</div>',
      };

      await nodemailerAdapter.sendEmail(optionsWithStyledHtml);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<div style="color: red; font-size: 16px;">Styled content</div>',
        }),
      );
    });

    it("should handle HTML with images", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithImages = {
        to: "test@test.com",
        subject: "Email with Image",
        html: '<img src="https://example.com/image.jpg" alt="Test Image" />',
      };

      await nodemailerAdapter.sendEmail(optionsWithImages);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<img src="https://example.com/image.jpg" alt="Test Image" />',
        }),
      );
    });
  });

  describe("error handling", () => {
    const emailOptions = {
      to: "recipient@test.com",
      subject: "Test Subject",
      html: "<p>Test HTML content</p>",
    };

    it("should throw INTERNAL_SERVER_ERROR when email sending fails", async () => {
      const networkError = new Error("Connection refused");
      mockTransporter.sendMail.mockRejectedValue(networkError);

      await expect(nodemailerAdapter.sendEmail(emailOptions)).rejects.toThrow(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("should log error with correct context when email fails", async () => {
      const networkError = new Error("Connection refused");
      mockTransporter.sendMail.mockRejectedValue(networkError);

      try {
        await nodemailerAdapter.sendEmail(emailOptions);
      } catch (error) {}

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "NodemailerEmailSender",
        event: "EMAIL_SEND_FAILURE",
        message: "Connection refused",
        stack: networkError.stack,
      });
    });

    it("should handle non-Error objects in error logging", async () => {
      const stringError = "String error message";
      mockTransporter.sendMail.mockRejectedValue(stringError);

      try {
        await nodemailerAdapter.sendEmail(emailOptions);
      } catch (error) {}

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "NodemailerEmailSender",
        event: "EMAIL_SEND_FAILURE",
        message: "Unknown email error",
        stack: undefined,
      });
    });

    it("should handle null/undefined error objects in error logging", async () => {
      mockTransporter.sendMail.mockRejectedValue(null);

      try {
        await nodemailerAdapter.sendEmail(emailOptions);
      } catch (error) {}

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "NodemailerEmailSender",
        event: "EMAIL_SEND_FAILURE",
        message: "Unknown email error",
        stack: undefined,
      });
    });

    it("should handle transporter creation failure", async () => {
      (createTransport as jest.Mock).mockImplementation(() => {
        throw new Error("Failed to create transporter");
      });

      await expect(nodemailerAdapter.sendEmail(emailOptions)).rejects.toThrow(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle sendMail timeout error", async () => {
      const timeoutError = new Error("Timeout");
      mockTransporter.sendMail.mockRejectedValue(timeoutError);

      await expect(nodemailerAdapter.sendEmail(emailOptions)).rejects.toThrow(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Timeout",
        }),
      );
    });

    it("should handle authentication error", async () => {
      const authError = new Error("Invalid credentials");
      mockTransporter.sendMail.mockRejectedValue(authError);

      await expect(nodemailerAdapter.sendEmail(emailOptions)).rejects.toThrow(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid credentials",
        }),
      );
    });
  });

  describe("createTransporter (private method testing via sendEmail)", () => {
    it("should create transporter with secure flag set to true", async () => {
      mockTransporter.sendMail.mockResolvedValue({});

      await nodemailerAdapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: true,
        }),
      );
    });

    it("should use config values for transporter configuration", async () => {
      mockTransporter.sendMail.mockResolvedValue({});

      await nodemailerAdapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith({
        host: "smtp.gmail.com",
        port: 587,
        secure: true,
        auth: {
          user: "test@test.com",
          pass: "test-password",
        },
      });
    });

    it("should use host from config", async () => {
      const customConfig = {
        ...mockTransportConfig,
        host: "smtp.office365.com",
      };

      const adapter = new NodemailerAdapter(customConfig, mockLogger);
      mockTransporter.sendMail.mockResolvedValue({});

      await adapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.office365.com",
        }),
      );
    });

    it("should use port from config", async () => {
      const customConfig = {
        ...mockTransportConfig,
        port: 465,
      };

      const adapter = new NodemailerAdapter(customConfig, mockLogger);
      mockTransporter.sendMail.mockResolvedValue({});

      await adapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
        }),
      );
    });

    it("should use user from config for auth", async () => {
      const customConfig = {
        ...mockTransportConfig,
        user: "custom@test.com",
      };

      const adapter = new NodemailerAdapter(customConfig, mockLogger);
      mockTransporter.sendMail.mockResolvedValue({});

      await adapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            user: "custom@test.com",
            pass: "test-password",
          },
        }),
      );
    });

    it("should use password from config for auth", async () => {
      const customConfig = {
        ...mockTransportConfig,
        password: "custom-password",
      };

      const adapter = new NodemailerAdapter(customConfig, mockLogger);
      mockTransporter.sendMail.mockResolvedValue({});

      await adapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            user: "test@test.com",
            pass: "custom-password",
          },
        }),
      );
    });
  });

  describe("logError (private method testing via sendEmail failures)", () => {
    it("should include all context fields in error log", async () => {
      const error = new Error("Test error");
      mockTransporter.sendMail.mockRejectedValue(error);

      try {
        await nodemailerAdapter.sendEmail({
          to: "test@test.com",
          subject: "Test",
          html: "<p>Test</p>",
        });
      } catch (e) {}

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "NodemailerEmailSender",
          event: "EMAIL_SEND_FAILURE",
          message: "Test error",
        }),
      );
    });

    it("should handle undefined context properties gracefully", async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error("Test error"));

      try {
        await nodemailerAdapter.sendEmail({
          to: "test@test.com",
          subject: "Test",
          html: "<p>Test</p>",
        });
      } catch (e) {}

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "NodemailerEmailSender",
          event: "EMAIL_SEND_FAILURE",
        }),
      );
    });

    it("should include stack trace for Error objects", async () => {
      const error = new Error("Test error");
      mockTransporter.sendMail.mockRejectedValue(error);

      try {
        await nodemailerAdapter.sendEmail({
          to: "test@test.com",
          subject: "Test",
          html: "<p>Test</p>",
        });
      } catch (e) {}

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: error.stack,
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty HTML content", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithEmptyHtml = {
        to: "test@test.com",
        subject: "Empty HTML",
        html: "",
      };

      await nodemailerAdapter.sendEmail(optionsWithEmptyHtml);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: "",
        }),
      );
    });

    it("should handle extremely long subject lines", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const longSubject = "A".repeat(1000);
      const optionsWithLongSubject = {
        to: "test@test.com",
        subject: longSubject,
        html: "<p>Content</p>",
      };

      await nodemailerAdapter.sendEmail(optionsWithLongSubject);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: longSubject,
        }),
      );
    });

    it("should handle extremely long HTML content", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const longHtml = "<p>" + "A".repeat(10000) + "</p>";
      const optionsWithLongHtml = {
        to: "test@test.com",
        subject: "Long HTML",
        html: longHtml,
      };

      await nodemailerAdapter.sendEmail(optionsWithLongHtml);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: longHtml,
        }),
      );
    });

    it("should handle email with Unicode characters", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithUnicode = {
        to: "test@test.com",
        subject: "测试邮件",
        html: "<p>测试内容 🎉</p>",
      };

      await nodemailerAdapter.sendEmail(optionsWithUnicode);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "测试邮件",
          html: "<p>测试内容 🎉</p>",
        }),
      );
    });

    it("should handle email with multiple recipients", async () => {
      mockTransporter.sendMail.mockResolvedValue({});
      const optionsWithMultipleRecipients = {
        to: "test1@test.com, test2@test.com, test3@test.com",
        subject: "Multiple Recipients",
        html: "<p>Content</p>",
      };

      await nodemailerAdapter.sendEmail(optionsWithMultipleRecipients);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test1@test.com, test2@test.com, test3@test.com",
        }),
      );
    });

    it("should handle config with empty values", async () => {
      const emptyConfig = {
        host: "",
        port: 0,
        user: "",
        password: "",
      };

      const adapter = new NodemailerAdapter(emptyConfig, mockLogger);
      mockTransporter.sendMail.mockResolvedValue({});

      await adapter.sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(createTransport).toHaveBeenCalledWith({
        host: "",
        port: 0,
        secure: true,
        auth: {
          user: "",
          pass: "",
        },
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple email sends", async () => {
      mockTransporter.sendMail.mockResolvedValue({});

      const email1 = {
        to: "user1@test.com",
        subject: "Email 1",
        html: "<p>Content 1</p>",
      };

      const email2 = {
        to: "user2@test.com",
        subject: "Email 2",
        html: "<p>Content 2</p>",
      };

      await nodemailerAdapter.sendEmail(email1);
      await nodemailerAdapter.sendEmail(email2);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "test@test.com",
        to: email1.to,
        subject: email1.subject,
        html: email1.html,
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "test@test.com",
        to: email2.to,
        subject: email2.subject,
        html: email2.html,
      });
    });

    it("should handle mixed success and failure scenarios", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "success-id" }).mockRejectedValueOnce(new Error("Failed"));

      const email1 = {
        to: "user1@test.com",
        subject: "Email 1",
        html: "<p>Content 1</p>",
      };

      const email2 = {
        to: "user2@test.com",
        subject: "Email 2",
        html: "<p>Content 2</p>",
      };

      await nodemailerAdapter.sendEmail(email1);
      await expect(nodemailerAdapter.sendEmail(email2)).rejects.toThrow(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });
  });
});
