export interface PasswordHasherPort {
  hashPassword(value: string): Promise<string>;
  comparePassword(value: string, hash: string): Promise<boolean>;
}
