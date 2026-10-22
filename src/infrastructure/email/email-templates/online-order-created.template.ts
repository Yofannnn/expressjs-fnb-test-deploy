import { OnlineOrderCreatedData, Recipient } from "@/application/ports/driven/email-sender.port";
import { LayoutTemplate } from "./layout.template";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";
import { DeliveryType } from "@/domain/types/order.type";
import { EmailContent, EmailTemplate, EmailTemplateContext } from "../email.type";

export class OnlineOrderCreatedTemplate extends LayoutTemplate implements EmailTemplate<OnlineOrderCreatedData> {
  readonly templateType = "ONLINE_ORDER_CREATED";

  constructor(config: AppIdentity) {
    super(config);
  }

  generate(context: EmailTemplateContext<OnlineOrderCreatedData>): EmailContent {
    const { recipient, data } = context;

    return {
      subject: `Order Confirmed #${data.orderId} - ${this.config.brandName}`,
      html: this.generateHTML(recipient, data),
      text: this.generateText(recipient, data),
    };
  }

  private generateHTML(recipient: Recipient, data: OnlineOrderCreatedData): string {
    const cta = data.isGuest
      ? {
          label: "Complete Payment",
          url: `${this.config.clientUrl}/checkout/pay/${data.orderId}?guestToken=${data.guestToken}`,
          variant: "primary" as const,
        }
      : { label: "View Order", url: `${this.config.clientUrl}/member/online-orders/${data.orderId}`, variant: "primary" as const };

    return this.getLayout({
      title: data.isGuest ? "Complete Your Payment" : "Order Confirmed",
      preheader: data.isGuest ? `Action needed: complete payment for order #${data.orderId}` : `Your order #${data.orderId} is confirmed`,
      body: `
        <p>Hi ${recipient.name || "there"},</p>
        <p>${
          data.isGuest
            ? `Thanks for your order at <strong>${this.config.brandName}</strong>! We're just waiting on payment to get it started.`
            : `Thanks for your order! Here's your confirmation.`
        }</p>

        <div style="background-color: #f8f9fa; border: 1px solid #000000; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Order Number:</strong> #${data.orderId}</p>
          <p style="margin: 4px 0 0; font-size: 14px;"><strong>Type:</strong> ${this.formatOrderType(data.deliveryType)}</p>
          ${data.deliveryAddress ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>` : ""}
        </div>

        ${this.renderOrderItems(data)}
        ${this.renderOrderSummary(data)}
        ${!data.isGuest ? this.renderLoyaltyPoints(data) : ""}

        ${
          data.isGuest
            ? `
        <div style="background-color: #fffbea; border-left: 4px solid #000000; padding: 12px 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Important:</strong> Save this email — it's your only way to track this order and 
            complete payment, since you checked out as a guest.
          </p>
        </div>
        `
            : `<p>You can track this order and view your full order history anytime from your account.</p>`
        }
      `,
      cta,
      footerNote: `Questions about your order? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a> and reference order #${data.orderId}.`,
      theme: data.isGuest ? "urgent" : "success",
    });
  }

  private generateText(recipient: Recipient, data: OnlineOrderCreatedData): string {
    const itemsList = data.items
      .map((i) => `- ${i.quantity}x ${i.productName} (${this.formatCurrency(i.priceSnapshot * i.quantity)})${i.note ? ` [${i.note}]` : ""}`)
      .join("\n");

    if (data.isGuest) {
      const trackUrl = `${this.config.clientUrl}/checkout/pay/${data.orderId}?guestToken=${data.guestToken}`;

      return `
Complete Your Payment - ${this.config.brandName}

Hi ${recipient.name || "there"},

Thanks for your order at ${this.config.brandName}! We're just waiting on payment to get it started.

Order Number: #${data.orderId}
Type: ${this.formatOrderType(data.deliveryType)}
Items:
${itemsList}

Subtotal: ${this.formatCurrency(data.subtotal)}
${data.deliveryFee ? `Delivery Fee: ${this.formatCurrency(data.deliveryFee)}\n` : ""}${`Service Charge: ${this.formatCurrency(data.serviceCharge)}\n`}${`Tax: ${this.formatCurrency(data.tax)}\n`}Total: ${this.formatCurrency(data.total)}

IMPORTANT: Save this email — it's your only way to track this order and complete payment, since you checked out as a guest.

Complete payment: ${trackUrl}

Questions? Contact us at ${this.config.supportEmail} and reference order #${data.orderId}.

Best regards,
The ${this.config.brandName} Team
      `.trim();
    }

    const orderUrl = `${this.config.clientUrl}/member/online-orders/${data.orderId}`;

    return `
Order Confirmed - ${this.config.brandName}

Hi ${recipient.name || "there"},

Thanks for your order! Here's your confirmation.

Order Number: #${data.orderId}
Type: ${this.formatOrderType(data.deliveryType)}
Items:
${itemsList}

Subtotal: ${this.formatCurrency(data.subtotal)}
${data.deliveryFee ? `Delivery Fee: ${this.formatCurrency(data.deliveryFee)}\n` : ""}${`Service Charge: ${this.formatCurrency(data.serviceCharge)}\n`}${`Tax: ${this.formatCurrency(data.tax)}\n`}Total: ${this.formatCurrency(data.total)}
${data.loyaltyPointsEarned ? `\nYou earned ${data.loyaltyPointsEarned} loyalty points on this order!\n` : ""}
View your order: ${orderUrl}

Questions? Contact us at ${this.config.supportEmail} and reference order #${data.orderId}.

Best regards,
The ${this.config.brandName} Team
    `.trim();
  }

  private renderOrderItems(data: OnlineOrderCreatedData): string {
    return `
      <table style="width: 100%; font-size: 14px; margin: 20px 0; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #000000;">
            <td style="padding: 8px 0; font-weight: bold;">Item</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: center;">Qty</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">Price</td>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 8px 0;">
                ${item.productName}
                ${item.note ? `<br/><span style="font-size: 12px; color: #666666;">${item.note}</span>` : ""}
              </td>
              <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px 0; text-align: right;">${this.formatCurrency(item.priceSnapshot * item.quantity)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  private renderOrderSummary(data: OnlineOrderCreatedData): string {
    return `
      <table style="width: 100%; font-size: 14px; margin: 12px 0;">
        <tr><td style="padding: 2px 0;">Subtotal</td><td style="padding: 2px 0; text-align: right;">${this.formatCurrency(data.subtotal)}</td></tr>
        ${data.deliveryFee ? `<tr><td style="padding: 2px 0;">Delivery Fee</td><td style="padding: 2px 0; text-align: right;">${this.formatCurrency(data.deliveryFee)}</td></tr>` : ""}
        ${`<tr><td style="padding: 2px 0;">Service Charge</td><td style="padding: 2px 0; text-align: right;">${this.formatCurrency(data.serviceCharge)}</td></tr>`}
        ${`<tr><td style="padding: 2px 0;">Tax</td><td style="padding: 2px 0; text-align: right;">${this.formatCurrency(data.tax)}</td></tr>`}
        <tr style="border-top: 2px solid #000000;"><td style="padding: 8px 0; font-weight: bold;">Total</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${this.formatCurrency(data.total)}</td></tr>
      </table>
    `;
  }

  private renderLoyaltyPoints(data: Extract<OnlineOrderCreatedData, { isGuest: false }>): string {
    if (!data.loyaltyPointsEarned) return "";

    return `
      <div style="background-color: #fff8e1; border: 1px dashed #000000; padding: 12px 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px;">🎉 You earned <strong>${data.loyaltyPointsEarned} points</strong> on this order!</p>
      </div>
    `;
  }

  private formatOrderType(type: DeliveryType): string {
    const map = { [DeliveryType.DELIVERY]: "Delivery", [DeliveryType.PICKUP]: "Pickup" };
    return map[type];
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  }
}
