import { EmailAlreadyVerifiedException, EmailUnchangedException } from "../exceptions/user.exceptions";
import { UserEmailRebuildData } from "../types/user.type";

export class UserEmail {
  constructor(
    private readonly email: string,
    private readonly verifiedAt: Date | null,
    private readonly changedAt: Date | null,
  ) {}

  getEmail(): string {
    return this.email;
  }

  getVerifiedAt(): Date | null {
    return this.verifiedAt ? new Date(this.verifiedAt) : null;
  }

  getChangedAt(): Date | null {
    return this.changedAt ? new Date(this.changedAt) : null;
  }

  isVerified(): boolean {
    return this.verifiedAt !== null;
  }

  hasEmail(candidate: string): boolean {
    return this.email.toLowerCase() === candidate.toLowerCase();
  }

  equals(other: UserEmail): boolean {
    return (
      this.hasEmail(other.email) &&
      this.getVerifiedAt()?.getTime() === other.getVerifiedAt()?.getTime() &&
      this.getChangedAt()?.getTime() === other.getChangedAt()?.getTime()
    );
  }

  verify(): UserEmail {
    if (this.isVerified()) throw new EmailAlreadyVerifiedException();
    return new UserEmail(this.email, new Date(), this.changedAt);
  }

  changeTo(newEmail: string): UserEmail {
    if (this.hasEmail(newEmail)) throw new EmailUnchangedException();
    return new UserEmail(newEmail, null, new Date());
  }

  static create(email: string): UserEmail {
    return new UserEmail(email, null, null);
  }

  static rebuild(data: UserEmailRebuildData): UserEmail {
    return new UserEmail(data.email, data.verifiedAt ?? null, data.changedAt ?? null);
  }
}
