import { AccountLockedData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { TimeUtil } from "@/utils/time.util";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class AccountLockedTemplate extends LayoutTemplate implements EmailTemplate<AccountLockedData> {
  readonly templateType = "ACCOUNT_LOCKED";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<AccountLockedData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `${this.config.brandName} - Account Security Alert`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: AccountLockedData): string {
    const reasonText = this.getReasonText(data.reason);

    return this.getLayout({
      title: "Account Temporarily Locked",
      preheader: "Your account has been locked for security reasons",
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>We've temporarily locked your ${this.config.brandName} account ${reasonText}.</p>
        <p><strong>Locked until:</strong> ${TimeUtil.formatDate(data.lockedUntil, "en-US", "long")}</p>
        <p>${data.unlockInstructions || "To unlock your account, please reset your password using the link below or contact our support team."}</p>
      `,
      cta: {
        label: "Reset Password",
        url: `${this.config.clientUrl}/reset-password`,
        variant: "primary",
      },
      footerNote: `If you believe this is a mistake or need immediate assistance, please contact our support team at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a>.`,
      theme: "urgent",
    });
  }

  private generateText(recipient: Recipient, data: AccountLockedData): string {
    const reasonText = this.getReasonText(data.reason);

    return `
      ${this.config.brandName} - Account Security Alert
      Hi ${recipient.name || "there"},
      We've temporarily locked your ${this.config.brandName} account ${reasonText}.
      Locked until: ${TimeUtil.formatDate(data.lockedUntil, "en-US", "long")} ${data.unlockInstructions || "To unlock your account, please reset your password or contact our support team."}
      Reset your password: ${this.config.clientUrl}/reset-password
      If you believe this is a mistake, contact us at ${this.config.supportEmail}
      Best regards, The ${this.config.brandName} Team
    `.trim();
  }

  private getReasonText(reason: AccountLockedData["reason"]): string {
    switch (reason) {
      case "multiple_failed_attempts":
        return "due to multiple failed login attempts to protect your security";
      case "suspicious_activity":
        return "due to suspicious activity detected on your account";
      case "admin_action":
        return "by our security team";
      default:
        return "for security reasons";
    }
  }
}
