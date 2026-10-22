import { env } from "./env-reader";

export interface PrismaDatabaseConfig {
  databaseUrl: string;
}

export class PrismaEnvConfig implements PrismaDatabaseConfig {
  readonly databaseUrl: string;

  constructor() {
    this.databaseUrl = env.string("DATABASE_URL");
    this.validate();
  }

  private validate(): void {
    if (!this.databaseUrl) throw new Error("DATABASE_URL is not defined");
  }
}
