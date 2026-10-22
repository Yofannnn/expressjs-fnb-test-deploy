import { VerificationEmailData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { TimeUtil } from "@/utils/time.util";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class VerificationEmailTemplate extends LayoutTemplate implements EmailTemplate<VerificationEmailData> {
  readonly templateType = "VERIFICATION_EMAIL";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<VerificationEmailData>): EmailContent {
    const { recipient, data } = context;
    const userName = data.userName || recipient.name || "there";

    return {
      subject: data.isResend ? `Your New Verification Link - ${this.config.brandName}` : `Welcome to ${this.config.brandName} - Verify Your Email`,
      html: this.generateHTML(recipient, data, userName),
      text: this.generateText(recipient, data, userName),
    };
  }

  private generateHTML(recipient: Recipient, data: VerificationEmailData, userName: string): string {
    const expiresIn = TimeUtil.formatDate(data.expiresAt, "en-US", "long");

    return this.getLayout({
      title: data.isResend ? "Verify Your Email" : "Welcome!",
      preheader: data.isResend
        ? `Here's your new verification link for ${this.config.brandName}`
        : `Verify your email to start ordering from ${this.config.brandName}`,
      body: data.isResend
        ? `
        <p>Hi ${userName},</p>
        <p>Here's the new verification link you requested for your <strong>${this.config.brandName}</strong> account.</p>
        <p>Your previous link is no longer valid — please use the button below:</p>
      `
        : `
        <p>Hi ${userName},</p>
        <p>Welcome to <strong>${this.config.brandName}</strong>! We're excited to have you join our community of food lovers.</p>
        <p>To get started with ordering delicious meals and managing your account, please verify your email address by clicking the button below:</p>
      `,
      cta: {
        label: "Verify My Email",
        url: `${this.config.clientUrl}/verify-email?token=${data.token}`,
        variant: "primary",
      },
      footerNote: `This verification link will expire in ${expiresIn}. If you didn't ${data.isResend ? "request this" : "create an account with us"}, you can safely ignore this email.`,
      theme: "success",
    });
  }

  private generateText(recipient: Recipient, data: VerificationEmailData, userName: string): string {
    const expiresIn = TimeUtil.formatDate(data.expiresAt, "en-US", "long");

    if (data.isResend) {
      return `
        Verify Your Email - ${this.config.brandName}
        Hi ${userName},
        Here's the new verification link you requested. Your previous link is no longer valid.
        ${this.config.clientUrl}/verify-email?token=${data.token}
        This link will expire in ${expiresIn}.
        If you didn't request this, you can safely ignore this email.
        Best regards,The ${this.config.brandName} Team
      `.trim();
    }

    return `
      Welcome to ${this.config.brandName}!
      Hi ${userName},
      Welcome to ${this.config.brandName}! We're excited to have you join our community of food lovers.
      To get started, please verify your email address by visiting: 
      ${this.config.clientUrl}/verify-email?token=${data.token}
      This link will expire in ${expiresIn}.
      If you didn't create an account with us, you can safely ignore this email.
      Best regards,The ${this.config.brandName} Team
    `.trim();
  }
}
