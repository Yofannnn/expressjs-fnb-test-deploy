import { env } from "./env-reader";

export interface VercelBlobConfig {
  readWriteToken: string;
  cacheControlMaxAgeInSeconds: number;
}

export class VercelBlobEnvConfig implements VercelBlobConfig {
  readonly readWriteToken: string;
  readonly cacheControlMaxAgeInSeconds: number;

  constructor() {
    this.readWriteToken = env.string("VERCEL_BLOB_READ_WRITE_TOKEN");
    this.cacheControlMaxAgeInSeconds = env.number("VERCEL_BLOB_CACHE_CONTROL_MAX_AGE_IN_MONTHS", 12) * 30 * 24 * 60 * 60;
  }
}
