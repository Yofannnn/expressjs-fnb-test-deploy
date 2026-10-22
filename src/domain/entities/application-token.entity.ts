import { AggregateRoot } from "../common/aggregate-root";
import { Expiration } from "../value-objects/expiration.vo";
import {
  ApplicationTokenMetadata,
  ApplicationTokenType,
  GuestOrderManagementTokenCreationData,
  GuestOrderManagementTokenMetadata,
  GuestOrderManagementTokenRebuildData,
  PasswordResetTokenCreationData,
  PasswordResetTokenMetadata,
  PasswordResetTokenRebuildData,
  VerificationEmailTokenCreationData,
  VerificationEmailTokenMetadata,
  VerificationEmailTokenRebuildData,
} from "../types/application-token.type";
import {
  GuestOrderManagementTokenExpiredException,
  PasswordResetTokenAlreadyUsedException,
  PasswordResetTokenExpiredBeyondGracePeriodException,
  PasswordResetTokenExpiredException,
  VerificationEmailTokenAlreadyUsedException,
  VerificationEmailTokenExpiredException,
} from "../exceptions/application-token.exceptions";
import {
  GuestOrderManagementTokenIssuedEvent,
  GuestOrderManagementTokenReissuedEvent,
  PasswordResetTokenIssuedEvent,
  PasswordResetTokenUsedEvent,
  VerificationEmailTokenIssuedEvent,
  VerificationEmailTokenReissuedEvent,
  VerificationEmailTokenUsedEvent,
} from "../events/application-token.events";

export abstract class BaseApplicationToken extends AggregateRoot {
  constructor(
    protected readonly id: string,
    protected readonly type: ApplicationTokenType,
    protected readonly tokenFingerprint: string,
    protected readonly identifier: string,
    protected readonly expiresAt: Expiration,
    protected usedAt: Date | null,
    protected readonly createdAt: Date,
    protected updatedAt: Date,
  ) {
    super();
  }

  abstract getTokenMetadata(): ApplicationTokenMetadata;
  protected abstract throwExpiredException(): never;

  isExpired(): boolean {
    return this.expiresAt.isExpired();
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }

  getTokenStatus(): "active" | "expired" | "used" {
    if (this.isUsed()) return "used";
    if (this.isExpired()) return "expired";
    return "active";
  }

  protected updateTimestamp(): void {
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }
  getType(): ApplicationTokenType {
    return this.type;
  }
  getTokenFingerprint(): string {
    return this.tokenFingerprint;
  }
  getIdentifier(): string {
    return this.identifier;
  }
  getExpiresAt(): Date {
    return new Date(this.expiresAt.getExpiresAt());
  }
  getUsedAt(): Date | null {
    return this.usedAt ? new Date(this.usedAt) : null;
  }
  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }
  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }
  getRemainingTimeMs(): number {
    return this.expiresAt.getRemainingTimeMs();
  }
}

export abstract class ConsumableToken extends BaseApplicationToken {
  assertCanBeUsed(): void {
    if (this.isExpired()) this.throwExpiredException();
    if (this.isUsed()) this.throwAlreadyUsedException();
  }

  use(): void {
    this.assertCanBeUsed();
    this.markAsUsed();
    this.emitUsageEvent();
  }

  canBeUsed(): boolean {
    return !this.isExpired() && !this.isUsed();
  }

  protected markAsUsed(): void {
    this.usedAt = new Date();
    this.updateTimestamp();
  }

  protected abstract emitUsageEvent(): void;
  protected abstract throwAlreadyUsedException(): never;
}

export abstract class NonConsumableToken extends BaseApplicationToken {
  use(): never {
    throw new Error("This token type cannot be consumed");
  }

  canBeUsed(): boolean {
    return !this.isExpired();
  }

  assertNotExpired(): void {
    if (this.isExpired()) this.throwExpiredException();
  }
}

abstract class GenericUserAssociatedToken<TMetadata extends ApplicationTokenMetadata> extends ConsumableToken {
  constructor(
    id: string,
    token: string,
    protected readonly userId: string,
    identifier: string,
    type: ApplicationTokenType,
    expiresAt: Expiration,
    usedAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, type, token, identifier, expiresAt, usedAt, createdAt, updatedAt);
  }

  protected abstract createExpiredException(): never;
  protected abstract createAlreadyUsedException(): never;

  protected throwExpiredException(): never {
    this.createExpiredException();
  }

  protected throwAlreadyUsedException(): never {
    this.createAlreadyUsedException();
  }

  abstract getTokenMetadata(): TMetadata;

  getUserId(): string {
    return this.userId;
  }
}

export class VerificationEmailToken extends GenericUserAssociatedToken<VerificationEmailTokenMetadata> {
  protected createExpiredException(): never {
    throw new VerificationEmailTokenExpiredException(this.getExpiresAt());
  }

  protected createAlreadyUsedException(): never {
    throw new VerificationEmailTokenAlreadyUsedException(this.getUsedAt()!);
  }

  protected emitUsageEvent(): void {
    this.emit(new VerificationEmailTokenUsedEvent(this.id, this.userId, this.identifier, this.getUsedAt()!));
  }

  getTokenMetadata(): VerificationEmailTokenMetadata {
    return {
      type: this.type,
      tokenId: this.id,
      userId: this.userId,
      identifier: this.identifier,
    };
  }

  static issue(data: VerificationEmailTokenCreationData): VerificationEmailToken {
    const token = new VerificationEmailToken(
      data.id,
      data.tokenFingerprint,
      data.userId,
      data.identifier,
      ApplicationTokenType.VERIFICATION_EMAIL,
      new Expiration(data.expiresAt),
      null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );

    token.emit(new VerificationEmailTokenIssuedEvent(token.id, token.userId, data.rawToken, token.identifier, token.getExpiresAt(), token.createdAt));

    return token;
  }

  static reissue(data: VerificationEmailTokenCreationData): VerificationEmailToken {
    const token = new VerificationEmailToken(
      data.id,
      data.tokenFingerprint,
      data.userId,
      data.identifier,
      ApplicationTokenType.VERIFICATION_EMAIL,
      new Expiration(data.expiresAt),
      null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );

    token.emit(
      new VerificationEmailTokenReissuedEvent(token.id, token.userId, data.rawToken, token.identifier, token.getExpiresAt(), token.createdAt),
    );

    return token;
  }

  static rebuild(data: VerificationEmailTokenRebuildData): VerificationEmailToken {
    return new VerificationEmailToken(
      data.id,
      data.tokenFingerprint,
      data.userId,
      data.identifier,
      data.type,
      new Expiration(data.expiresAt),
      data.usedAt,
      data.createdAt,
      data.updatedAt,
    );
  }
}

export class PasswordResetToken extends GenericUserAssociatedToken<PasswordResetTokenMetadata> {
  protected createExpiredException(): never {
    throw new PasswordResetTokenExpiredException(this.getExpiresAt());
  }

  protected createAlreadyUsedException(): never {
    throw new PasswordResetTokenAlreadyUsedException(this.getUsedAt()!);
  }

  protected emitUsageEvent(): void {
    this.emit(new PasswordResetTokenUsedEvent(this.id, this.userId, this.identifier, this.getUsedAt()!));
  }

  getTokenMetadata(): PasswordResetTokenMetadata {
    return {
      type: this.type,
      tokenId: this.id,
      userId: this.userId,
      identifier: this.identifier,
    };
  }

  assertWithinGracePeriod(gracePeriodMs: number): void {
    const gracePeriodExpiry = new Date(this.getExpiresAt().getTime() + gracePeriodMs);
    if (new Date() > gracePeriodExpiry) {
      throw new PasswordResetTokenExpiredBeyondGracePeriodException(this.getExpiresAt());
    }
  }

  static issue(data: PasswordResetTokenCreationData): PasswordResetToken {
    const token = new PasswordResetToken(
      data.id,
      data.tokenFingerprint,
      data.userId,
      data.identifier,
      ApplicationTokenType.PASSWORD_RESET,
      new Expiration(data.expiresAt),
      null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );

    token.emit(new PasswordResetTokenIssuedEvent(token.id, token.userId, data.rawToken, token.identifier, token.getExpiresAt(), token.createdAt));

    return token;
  }

  static rebuild(data: PasswordResetTokenRebuildData): PasswordResetToken {
    return new PasswordResetToken(
      data.id,
      data.tokenFingerprint,
      data.userId,
      data.identifier,
      data.type,
      new Expiration(data.expiresAt),
      data.usedAt,
      data.createdAt,
      data.updatedAt,
    );
  }
}

export class GuestOrderManagementToken extends NonConsumableToken {
  constructor(
    id: string,
    token: string,
    readonly identifier: string,
    private readonly orderId: string,
    expiresAt: Expiration,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, ApplicationTokenType.GUEST_ORDER_MANAGEMENT, token, identifier, expiresAt, null, createdAt, updatedAt);
  }

  getTokenMetadata(): GuestOrderManagementTokenMetadata {
    return {
      type: this.type,
      tokenId: this.id,
      orderId: this.orderId,
      identifier: this.identifier,
    };
  }

  protected throwExpiredException(): never {
    throw new GuestOrderManagementTokenExpiredException(this.getExpiresAt());
  }

  getOrderId(): string {
    return this.orderId;
  }

  static issue(data: GuestOrderManagementTokenCreationData): GuestOrderManagementToken {
    const token = new GuestOrderManagementToken(
      data.id,
      data.tokenFingerprint,
      data.identifier,
      data.orderId,
      new Expiration(data.expiresAt),
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );

    token.emit(
      new GuestOrderManagementTokenIssuedEvent(token.id, data.rawToken, token.identifier, token.orderId, token.getExpiresAt(), token.createdAt),
    );

    return token;
  }

  static reissue(data: GuestOrderManagementTokenCreationData): GuestOrderManagementToken {
    const token = new GuestOrderManagementToken(
      data.id,
      data.tokenFingerprint,
      data.identifier,
      data.orderId,
      new Expiration(data.expiresAt),
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );

    token.emit(
      new GuestOrderManagementTokenReissuedEvent(token.id, data.rawToken, token.identifier, token.orderId, token.getExpiresAt(), token.createdAt),
    );

    return token;
  }

  static rebuild(data: GuestOrderManagementTokenRebuildData): GuestOrderManagementToken {
    return new GuestOrderManagementToken(
      data.id,
      data.tokenFingerprint,
      data.identifier,
      data.orderId,
      new Expiration(data.expiresAt),
      data.createdAt,
      data.updatedAt,
    );
  }
}

export type ApplicationToken = VerificationEmailToken | PasswordResetToken | GuestOrderManagementToken;
