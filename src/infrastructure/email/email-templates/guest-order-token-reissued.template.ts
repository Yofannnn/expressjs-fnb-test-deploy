import { GuestOrderTokenReissuedData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class GuestOrderTokenReissuedTemplate extends LayoutTemplate implements EmailTemplate<GuestOrderTokenReissuedData> {
  readonly templateType = "GUEST_ORDER_TOKEN_REISSUED";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<GuestOrderTokenReissuedData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `Your New Access Link for Order #${data.orderId} - ${this.config.brandName}`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: GuestOrderTokenReissuedData): string {
    const trackUrl = `${this.config.clientUrl}/guest/online-orders/${data.orderId}?guestToken=${data.guestToken}`;

    return this.getLayout({
      title: "Your Access Link Has Been Renewed",
      preheader: `New link to manage order #${data.orderId}`,
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>You (or someone with access to your email) requested a new access link for order <strong>#${data.orderId}</strong> at <strong>${this.config.brandName}</strong>.</p>
        <p>Use the button below to view your order details and manage it.</p>

        <div style="background-color: #fffbea; border-left: 4px solid #000000; padding: 12px 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Note:</strong> Your previous access link is no longer valid. This new link expires on
            ${data.expiresAt.toLocaleString()}. If you didn't request this, please contact us immediately.
          </p>
        </div>
      `,
      cta: {
        label: "Access My Order",
        url: trackUrl,
        variant: "primary",
      },
      footerNote: `Didn't request this? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a> and reference order #${data.orderId}.`,
      theme: "urgent",
    });
  }

  private generateText(recipient: Recipient, data: GuestOrderTokenReissuedData): string {
    const trackUrl = `${this.config.clientUrl}/guest/online-orders/${data.orderId}?guestToken=${data.guestToken}`;

    return `
Your Access Link Has Been Renewed - ${this.config.brandName}

Hi ${recipient.name || "there"},

You (or someone with access to your email) requested a new access link for order #${data.orderId}.

Your previous access link is no longer valid. This new link expires on ${data.expiresAt.toLocaleString()}.

Access your order here:
${trackUrl}

Didn't request this? Contact us immediately at ${this.config.supportEmail} and reference order #${data.orderId}.

Best regards,
The ${this.config.brandName} Team
    `.trim();
  }
}
