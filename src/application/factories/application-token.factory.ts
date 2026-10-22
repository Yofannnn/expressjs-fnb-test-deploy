import { GuestOrderManagementToken, PasswordResetToken, VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { VerificationEmailPolicy } from "../../domain/policies/verification-email.policy";
import { PasswordResetPolicy } from "../../domain/policies/password-reset.policy";
import { GuestOrderManagementPolicy } from "@/domain/policies/guest-order-management.policy";
import { User } from "@/domain/entities/user.entity";
import { Order } from "@/domain/entities/order.entity";
import { IdGeneratorPort } from "../ports/driven/id-generator.port";
import { TimeUtil } from "@/utils/time.util";
import {
  GuestOrderManagementTokenCreationData,
  PasswordResetTokenCreationData,
  VerificationEmailTokenCreationData,
} from "@/domain/types/application-token.type";
import { FingerprintPort } from "../ports/driven/fingerprint.port";
import { TokenGeneratorPort } from "../ports/driven/token-generator.port";

export class ApplicationTokenFactory {
  constructor(
    private readonly verificationEmailPolicy: VerificationEmailPolicy,
    private readonly passwordResetPolicy: PasswordResetPolicy,
    private readonly guestOrderManagementPolicy: GuestOrderManagementPolicy,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly idGenerator: IdGeneratorPort,
  ) {}

  issuePasswordReset(user: User): PasswordResetToken {
    return PasswordResetToken.issue(this.createPasswordResetData(user));
  }

  issueVerificationEmail(user: User): VerificationEmailToken {
    const data = this.createVerificationEmailData(user);
    return VerificationEmailToken.issue(data);
  }

  reissueVerificationEmail(user: User): VerificationEmailToken {
    const data = this.createVerificationEmailData(user);
    return VerificationEmailToken.reissue(data);
  }

  issueGuestOrderManagement(order: Order): GuestOrderManagementToken {
    const data = this.createGuestOrderManagementData(order);
    return GuestOrderManagementToken.issue(data);
  }

  reissueGuestOrderManagement(order: Order): GuestOrderManagementToken {
    const data = this.createGuestOrderManagementData(order);
    return GuestOrderManagementToken.reissue(data);
  }

  private createPasswordResetData(user: User): PasswordResetTokenCreationData {
    const rawToken = this.tokenGenerator.generate();
    const tokenFingerprint = this.fingerprintProvider.fingerprint(rawToken);

    return {
      id: this.idGenerator.generate(),
      rawToken,
      tokenFingerprint,
      expiresAt: new Date(Date.now() + TimeUtil.minutesToMs(this.passwordResetPolicy.expiryInMinutes)),
      identifier: user.getEmail(),
      userId: user.getId(),
    };
  }

  private createVerificationEmailData(user: User): VerificationEmailTokenCreationData {
    const rawToken = this.tokenGenerator.generate();
    const tokenFingerprint = this.fingerprintProvider.fingerprint(rawToken);

    return {
      id: this.idGenerator.generate(),
      rawToken,
      tokenFingerprint,
      identifier: user.getEmail(),
      userId: user.getId(),
      expiresAt: new Date(Date.now() + TimeUtil.hoursToMs(this.verificationEmailPolicy.expiryInHours)),
    };
  }

  private createGuestOrderManagementData(order: Order): GuestOrderManagementTokenCreationData {
    if (!order.getCustomer().isGuest()) throw new Error("Guest order management token can only be created for a guest order");
    const rawToken = this.tokenGenerator.generate();
    const tokenFingerprint = this.fingerprintProvider.fingerprint(rawToken);

    return {
      id: this.idGenerator.generate(),
      rawToken,
      tokenFingerprint,
      expiresAt: new Date(Date.now() + TimeUtil.hoursToMs(this.guestOrderManagementPolicy.tokenExpiryInHours)),
      identifier: order.getCustomer().getGuestEmail() as string,
      orderId: order.getId(),
    };
  }
}
