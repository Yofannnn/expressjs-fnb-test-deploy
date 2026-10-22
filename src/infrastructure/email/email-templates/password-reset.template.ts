import { PasswordResetData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { TimeUtil } from "@/utils/time.util";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class PasswordResetTemplate extends LayoutTemplate implements EmailTemplate<PasswordResetData> {
  readonly templateType = "PASSWORD_RESET";

  constructor(readonly config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<PasswordResetData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `Reset Your ${this.config.brandName} Password`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: PasswordResetData): string {
    return this.getLayout({
      title: "Reset Your Password",
      preheader: "Reset your password to regain access to your account",
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>We received a request to reset the password for your <strong>${this.config.brandName}</strong> account.</p>
        <p><strong>Request made:</strong>Request details</p>
        <table style="width: 100%; font-size: 14px; color: #333333;">
          <tr><td style="padding: 4px 0; font-weight: 500;">Date & Time:</td><td style="padding: 4px 0;">${TimeUtil.formatDate(data.requestedAt, "en-US", "long")}</td></tr>
          ${data.requestLocation ? `<tr><td style="padding: 4px 0; font-weight: 500;">Location:</td><td style="padding: 4px 0;">${data.requestLocation}</td></tr>` : ""}
          ${data.requestIpAddress ? `<tr><td style="padding: 4px 0; font-weight: 500;">IP Address:</td><td style="padding: 4px 0;">${data.requestIpAddress}</td></tr>` : ""}
          ${data.requestDevice ? `<tr><td style="padding: 4px 0; font-weight: 500;">Device:</td><td style="padding: 4px 0;">${data.requestDevice}</td></tr>` : ""}
        </table>
        <p>Click the button below to create a new password:</p>
      `,
      cta: {
        label: "Reset My Password",
        url: `${this.config.clientUrl}/reset-password?token=${data.token}`,
        variant: "primary",
      },
      footerNote: `This reset link will expire in ${Math.ceil(TimeUtil.msToMinutes(data.expiresAt.getTime() - Date.now()))} minutes. If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.`,
      theme: "default",
    });
  }

  private generateText(recipient: Recipient, data: PasswordResetData): string {
    const requestedTime = TimeUtil.formatDate(data.requestedAt, "en-US", "long");

    return `
      Reset Your ${this.config.brandName} Password
      Hi ${recipient.name || "there"}, We received a request to reset the password for your ${this.config.brandName} account.
      Request made: ${requestedTime}
      To reset your password, please visit: ${this.config.clientUrl}/reset-password?token=${data.token}
      This reset link will expire in ${Math.ceil(TimeUtil.msToMinutes(data.expiresAt.getTime() - Date.now()))} minutes.
      If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      Best regards, The ${this.config.brandName} Team
    `.trim();
  }
}
