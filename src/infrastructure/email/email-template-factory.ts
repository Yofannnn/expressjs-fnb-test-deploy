import {
  AccountLockedData,
  VerificationEmailData,
  PasswordResetData,
  PasswordChangedData,
  EmailVerifiedData,
  OnlineOrderCreatedData,
  GuestOrderTokenReissuedData,
} from "@/application/ports/driven/email-sender.port";
import { VerificationEmailTemplate } from "./email-templates/verification-email.template";
import { AccountLockedTemplate } from "./email-templates/account-locked.template";
import { PasswordResetTemplate } from "./email-templates/password-reset.template";
import { PasswordChangedTemplate } from "./email-templates/password-change.template";
import { EmailVerifiedTemplate } from "./email-templates/email-verified.template";
import { AppIdentity } from "../configs/app-identity.config";
import { OnlineOrderCreatedTemplate } from "./email-templates/online-order-created.template";
import { GuestOrderTokenReissuedTemplate } from "./email-templates/guest-order-token-reissued.template";
import { EmailTemplate } from "./email.type";

export class EmailTemplateFactory {
  constructor(private readonly config: AppIdentity) {}

  createVerificationEmailTemplate(): EmailTemplate<VerificationEmailData> {
    return new VerificationEmailTemplate(this.config);
  }

  createEmailVerifiedTemplate(): EmailTemplate<EmailVerifiedData> {
    return new EmailVerifiedTemplate(this.config);
  }

  createPasswordResetTemplate(): EmailTemplate<PasswordResetData> {
    return new PasswordResetTemplate(this.config);
  }

  createPasswordChangedTemplate(): EmailTemplate<PasswordChangedData> {
    return new PasswordChangedTemplate(this.config);
  }

  createAccountLockedTemplate(): EmailTemplate<AccountLockedData> {
    return new AccountLockedTemplate(this.config);
  }

  createOnlineOrderCreatedTemplate(): EmailTemplate<OnlineOrderCreatedData> {
    return new OnlineOrderCreatedTemplate(this.config);
  }

  createGuestOrderTokenReissuedTemplate(): EmailTemplate<GuestOrderTokenReissuedData> {
    return new GuestOrderTokenReissuedTemplate(this.config);
  }
}
