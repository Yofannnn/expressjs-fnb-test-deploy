import { UserProfileRebuildData } from "../types/user.type";

export class UserProfile {
  constructor(
    private readonly name: string,
    private readonly address: string | null,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim() === "") {
      throw new Error("Name cannot be empty");
    }
    if (this.name.length > 255) {
      throw new Error("Name too long");
    }
  }

  getName(): string {
    return this.name;
  }

  getAddress(): string | null {
    return this.address;
  }

  update(name: string, address?: string): UserProfile {
    return new UserProfile(name, address || null);
  }

  static create(name: string, address?: string): UserProfile {
    return new UserProfile(name, address || null);
  }

  static rebuild(data: UserProfileRebuildData): UserProfile {
    return new UserProfile(data.name, data.address ?? null);
  }
}
