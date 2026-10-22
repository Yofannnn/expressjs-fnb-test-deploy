import { PasswordUnchangedException } from "../exceptions/user.exceptions";
import { UserPasswordRebuildData } from "../types/user.type";

export class UserPassword {
  constructor(
    private readonly hashedPassword: string,
    private readonly changedAt: Date | null,
  ) {}

  getHashedValue(): string {
    return this.hashedPassword;
  }

  getChangedAt(): Date | null {
    return this.changedAt;
  }

  isExpired(maxPasswordAgeDays?: number): boolean {
    if (!this.changedAt) return false;
    if (!maxPasswordAgeDays || maxPasswordAgeDays <= 0) maxPasswordAgeDays = 90;
    const oneDayInMs = 86400000;
    const ageMs = Date.now() - this.changedAt.getTime();
    const maxAgeMs = maxPasswordAgeDays * oneDayInMs;
    return ageMs > maxAgeMs;
  }

  changeTo(newHashedPassword: string, isSameAsCurrent: boolean): UserPassword {
    if (isSameAsCurrent) throw new PasswordUnchangedException();
    return new UserPassword(newHashedPassword, new Date());
  }

  static create(hashedPassword: string): UserPassword {
    return new UserPassword(hashedPassword, null);
  }

  static rebuild(data: UserPasswordRebuildData): UserPassword {
    return new UserPassword(data.hashedPassword, data.changedAt ?? null);
  }
}
