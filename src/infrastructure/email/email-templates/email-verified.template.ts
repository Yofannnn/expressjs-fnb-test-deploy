import { LayoutTemplate } from "./layout.template";
import { EmailVerifiedData, Recipient } from "@/application/ports/driven/email-sender.port";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class EmailVerifiedTemplate extends LayoutTemplate implements EmailTemplate<EmailVerifiedData> {
  readonly templateType = "EMAIL_VERIFIED";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<EmailVerifiedData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `Welcome to ${this.config.brandName} - Email Verified! 🎉`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: EmailVerifiedData): string {
    return this.getLayout({
      title: "Welcome Aboard!",
      preheader: `Your email is verified. Start exploring ${this.config.brandName}`,
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>Great news! Your email has been successfully verified. Welcome to <strong>${this.config.brandName}</strong>! 🎉</p>
        <p>You're all set to enjoy delicious meals and exclusive benefits.</p>
        
        ${this.renderWelcomeFeatures(data)}
        
        <p>Ready to get started? Explore our menu and place your first order!</p>
      `,
      cta: {
        label: data.hasCompletedProfile ? "Browse Menu" : "Complete Your Profile",
        url: data.hasCompletedProfile ? `${this.config.clientUrl}/menu` : `${this.config.clientUrl}/member`,
        variant: "primary",
      },
      footerNote: data.welcomeOffer
        ? `🎁 <strong>Special Welcome Offer:</strong> ${data.welcomeOffer}`
        : `Questions? We're here to help at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a>`,
      theme: "success",
    });
  }

  private generateText(recipient: Recipient, data: EmailVerifiedData): string {
    return `
Welcome to ${this.config.brandName} - Email Verified!

Hi ${recipient.name || "there"},

Great news! Your email has been successfully verified. Welcome to ${this.config.brandName}!

You're all set to enjoy:
- Delicious meals delivered to your door
- Exclusive member benefits and rewards
- Easy order tracking and reordering
- Personalized recommendations

${data.welcomeOffer ? `Special Welcome Offer: ${data.welcomeOffer}\n` : ""}

${data.hasCompletedProfile ? `Start exploring: ${this.config.clientUrl}/menu` : `Complete your profile: ${this.config.clientUrl}/member`}

Questions? Contact us at ${this.config.supportEmail}

Best regards,
The ${this.config.brandName} Team
    `.trim();
  }

  private renderWelcomeFeatures(data: EmailVerifiedData): string {
    const features = [
      { icon: "🍽️", text: "Delicious meals delivered to your door" },
      { icon: "⭐", text: "Exclusive member benefits and rewards" },
      { icon: "📦", text: "Easy order tracking and reordering" },
      { icon: "💝", text: "Personalized recommendations" },
    ];

    return `
      <div style="background-color: #f8f9fa; border-left: 4px solid #16a34a; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0; font-weight: bold; font-size: 16px;">Here's what you can enjoy:</p>
        <table style="width: 100%; font-size: 14px;">
          ${features
            .map(
              (feature) => `
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 30px;">${feature.icon}</td>
              <td style="padding: 8px 0;">${feature.text}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </div>
    `;
  }
}
