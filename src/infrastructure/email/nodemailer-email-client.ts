import { LoggerPort } from "@/application/ports/driven/logger.port";
import { createTransport, Transporter } from "nodemailer";
import { NodemailerTransportConfig } from "../configs/nodemailer.config";
import { ExternalServiceUnavailableException } from "../exceptions/infrastructure.exceptions";
import { EmailClient, SendEmailOptions } from "./email.type";

export class NodemailerEmailClient implements EmailClient {
  constructor(
    private readonly config: NodemailerTransportConfig,
    private readonly logger: LoggerPort,
  ) {}

  async sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
    try {
      const transporter = this.createTransporter();
      await transporter.sendMail({
        from: this.config.user,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logError(error);
      throw new ExternalServiceUnavailableException("Email service");
    }
  }

  private createTransporter(): Transporter {
    return createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: true,
      auth: { user: this.config.user, pass: this.config.password },
    });
  }

  private logError(error: unknown): void {
    this.logger.error({
      context: "NodemailerEmailSender",
      event: "EMAIL_SEND_FAILURE",
      message: error instanceof Error ? error.message : "Unknown email error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
