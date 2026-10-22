import { PasswordChangedData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { TimeUtil } from "@/utils/time.util";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class PasswordChangedTemplate extends LayoutTemplate implements EmailTemplate<PasswordChangedData> {
  readonly templateType = "PASSWORD_CHANGED";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<PasswordChangedData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `${this.config.brandName} - Password Changed Successfully`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: PasswordChangedData): string {
    return this.getLayout({
      title: "Password Changed",
      preheader: "Your account password was successfully changed",
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>Your password for <strong>${this.config.brandName}</strong> was successfully changed.</p>
        
        ${this.renderSecurityDetails(data)}
        
        <p>If you made this change, no further action is needed. Your account is secure.</p>
        <p><strong>If you didn't make this change:</strong></p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Contact our support team immediately</li>
          <li>Check your account for any unauthorized activity</li>
          <li>Consider enabling two-factor authentication</li>
        </ul>
      `,
      cta:
        data.wasYou === false
          ? {
              label: "Contact Support",
              url: `mailto:${this.config.supportEmail}?subject=Unauthorized Password Change&body=I did not authorize a password change on my account. Please help secure my account immediately.`,
              variant: "primary",
            }
          : undefined,
      footerNote: `For your security, we recommend using a strong, unique password and enabling two-factor authentication. Need help? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a>.`,
      theme: data.wasYou === false ? "urgent" : "success",
    });
  }

  private generateText(recipient: Recipient, data: PasswordChangedData): string {
    return `
      ${this.config.brandName} - Password Changed Successfully

      Hi ${recipient.name || "there"}, Your password for ${this.config.brandName} was successfully changed.

      Change Details:
      - Date & Time: ${TimeUtil.formatDate(data.dateTime, "en-US", "long")}${data.location ? `\n- Location: ${data.location}` : ""}${data.ipAddress ? `\n- IP Address: ${data.ipAddress}` : ""}${data.device ? `\n- Device: ${data.device}` : ""}
      
      If you made this change, no further action is needed. Your account is secure.

      If you didn't make this change:
      - Contact our support team immediately: ${this.config.supportEmail}
      - Check your account for any unauthorized activity
      - Consider enabling two-factor authentication

      For your security, we recommend using a strong, unique password and enabling two-factor authentication.
      
      Best regards, The ${this.config.brandName} Team
    `.trim();
  }

  private renderSecurityDetails(data: PasswordChangedData): string {
    return `
      <div style="background-color: #f8f9fa; border-left: 4px solid #000000; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 14px;">Change Details:</p>
        <table style="width: 100%; font-size: 14px; color: #333333;">
          <tr><td style="padding: 4px 0; font-weight: 500;">Date & Time:</td><td style="padding: 4px 0;">${TimeUtil.formatDate(data.dateTime, "en-US", "long")}</td></tr>
          ${data.location ? `<tr><td style="padding: 4px 0; font-weight: 500;">Location:</td><td style="padding: 4px 0;">${data.location}</td></tr>` : ""}
          ${data.ipAddress ? `<tr><td style="padding: 4px 0; font-weight: 500;">IP Address:</td><td style="padding: 4px 0;">${data.ipAddress}</td></tr>` : ""}
          ${data.device ? `<tr><td style="padding: 4px 0; font-weight: 500;">Device:</td><td style="padding: 4px 0;">${this.parseDevice(data.device)}</td></tr>` : ""}
        </table>
      </div>
    `;
  }

  private parseDevice(userAgent: string): string {
    if (/tablet/i.test(userAgent)) return "Tablet";
    if (/mobile/i.test(userAgent)) return "Mobile Device";
    return "Desktop";
  }
}
