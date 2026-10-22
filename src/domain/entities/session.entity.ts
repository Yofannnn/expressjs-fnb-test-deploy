import { Expiration } from "../value-objects/expiration.vo";
import { SessionCreationData, SessionRebuildData } from "../types/session.type";
import { AggregateRoot } from "../common/aggregate-root";
import { SessionCreatedEvent, SessionRevokedEvent } from "../events/session.events";
import { SessionAlreadyExpiredException, SessionAlreadyRevokedException } from "../exceptions/session.exceptions";

export class Session extends AggregateRoot {
  constructor(
    private readonly id: string,
    private readonly tokenFingerprint: string,
    private readonly tokenFamily: string,
    private readonly userId: string,
    private readonly expiresAt: Expiration,
    private revokedAt: Date | null,
    private revokeReason: string | null,
    private readonly userAgent: string | null,
    private readonly ipAddress: string | null,
    private readonly deviceId: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  revoke(reason: string): void {
    if (this.isExpired()) throw new SessionAlreadyExpiredException();
    if (this.isRevoked()) throw new SessionAlreadyRevokedException();

    this.revokedAt = new Date();
    this.revokeReason = reason;
    this.touch();

    this.emit(new SessionRevokedEvent(this.id, this.userId, this.revokeReason!, this.revokedAt!));
  }

  isExpired(): boolean {
    return this.expiresAt.isExpired();
  }

  isRevoked(): boolean {
    return !!this.revokedAt;
  }

  isActive(): boolean {
    return !this.isRevoked() && !this.isExpired();
  }

  getId(): string {
    return this.id;
  }

  getTokenFingerprint(): string {
    return this.tokenFingerprint;
  }

  getTokenFamily(): string {
    return this.tokenFamily;
  }

  getUserId(): string {
    return this.userId;
  }

  getIpAddress(): string | null {
    return this.ipAddress;
  }

  getUserAgent(): string | null {
    return this.userAgent;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  getRemainingTimeMs(): number {
    return this.expiresAt.getRemainingTimeMs();
  }

  getExpiresAt(): Date {
    return this.expiresAt.getExpiresAt();
  }

  getRevokedAt(): Date | null {
    return this.revokedAt ? new Date(this.revokedAt) : null;
  }

  getRevokeReason(): string | null {
    return this.revokeReason;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static create(data: SessionCreationData): Session {
    const newSession = new Session(
      data.id,
      data.tokenFingerprint,
      data.tokenFamily,
      data.userId,
      new Expiration(data.expiresAt),
      null,
      null,
      data.userAgent || null,
      data.ipAddress || null,
      data.deviceId || null,
      data.createdAt || new Date(),
      data.updatedAt || new Date(),
    );

    newSession.emit(new SessionCreatedEvent(newSession.id, newSession.userId));

    return newSession;
  }

  static rebuild(data: SessionRebuildData): Session {
    return new Session(
      data.id,
      data.tokenFingerprint,
      data.tokenFamily,
      data.userId,
      new Expiration(data.expiresAt),
      data.revokedAt,
      data.revokeReason,
      data.userAgent,
      data.ipAddress,
      data.deviceId,
      data.createdAt,
      data.updatedAt,
    );
  }
}
