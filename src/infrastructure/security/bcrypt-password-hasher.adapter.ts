import bcrypt from "bcryptjs";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";

export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  private readonly rounds: number = parseInt(process.env.BCRYPT_ROUNDS || "12");

  async hashPassword(value: string): Promise<string> {
    return await bcrypt.hash(value, this.rounds);
  }

  async comparePassword(value: string, hash: string): Promise<boolean> {
    if (!value || !hash) return false;
    return await bcrypt.compare(value, hash);
  }
}
