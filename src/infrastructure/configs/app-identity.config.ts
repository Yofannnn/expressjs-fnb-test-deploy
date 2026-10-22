import { env } from "./env-reader";

export interface AppIdentity {
  brandName: string;
  supportEmail: string;
  baseUrl: string;
  clientUrl: string;
}

export class AppIdentityConfig implements AppIdentity {
  readonly brandName: string;
  readonly supportEmail: string;
  readonly baseUrl: string;
  readonly clientUrl: string;

  constructor() {
    this.brandName = env.string("BRAND_NAME");
    this.supportEmail = env.string("SUPPORT_EMAIL");
    this.baseUrl = env.string("BASE_URL");
    this.clientUrl = env.string("CLIENT_URL");
  }
}
