import {
  AccountLockedData,
  VerificationEmailData,
  PasswordResetData,
  EmailSenderPort,
  PasswordChangedData,
  EmailVerifiedData,
  OnlineOrderCreatedData,
  GuestOrderTokenReissuedData,
  Recipient,
} from "@/application/ports/driven/email-sender.port";
import { EmailClient } from "./email.type";
import { EmailTemplateFactory } from "./email-template-factory";

export class NodemailerEmailSenderAdapter implements EmailSenderPort {
  constructor(
    private readonly emailClient: EmailClient,
    private readonly templateFactory: EmailTemplateFactory,
  ) {}

  async sendVerificationEmail(recipient: Recipient, data: VerificationEmailData): Promise<void> {
    const template = this.templateFactory.createVerificationEmailTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendEmailVerified(recipient: Recipient, data: EmailVerifiedData): Promise<void> {
    const template = this.templateFactory.createEmailVerifiedTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendPasswordReset(recipient: Recipient, data: PasswordResetData): Promise<void> {
    const template = this.templateFactory.createPasswordResetTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendPasswordChanged(recipient: Recipient, data: PasswordChangedData): Promise<void> {
    const template = this.templateFactory.createPasswordChangedTemplate();
    const content = template.generate({ recipient, data });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendAccountLocked(recipient: Recipient, data: AccountLockedData): Promise<void> {
    const template = this.templateFactory.createAccountLockedTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendOnlineOrderCreated(recipient: Recipient, data: OnlineOrderCreatedData): Promise<void> {
    const template = this.templateFactory.createOnlineOrderCreatedTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }

  async sendGuestOrderTokenReissued(recipient: Recipient, data: GuestOrderTokenReissuedData): Promise<void> {
    const template = this.templateFactory.createGuestOrderTokenReissuedTemplate();
    const content = template.generate({
      recipient,
      data,
    });

    await this.emailClient.sendEmail({
      to: recipient.address,
      subject: content.subject,
      html: content.html,
    });
  }
}
