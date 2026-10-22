import { env } from "./env-reader";

export interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
  snapBaseUrl: string;
  coreApiBaseUrl: string;
}

export class MidtransEnvConfig implements MidtransConfig {
  readonly serverKey: string;
  readonly isProduction: boolean;
  readonly snapBaseUrl: string;
  readonly coreApiBaseUrl: string;

  constructor() {
    this.serverKey = env.string("MIDTRANS_SERVER_KEY");
    this.isProduction = env.boolean("MIDTRANS_IS_PRODUCTION");
    this.snapBaseUrl = env.string("MIDTRANS_SNAP_BASE_URL");
    this.coreApiBaseUrl = env.string("MIDTRANS_CORE_API_BASE_URL");
  }
}
