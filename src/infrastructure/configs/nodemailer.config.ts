import { env } from "./env-reader";

export interface NodemailerTransportConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export class NodemailerTransportEnvConfig implements NodemailerTransportConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;

  constructor() {
    this.host = env.string("EMAIL_HOST", "smtp.gmail.com");
    this.port = env.number("EMAIL_PORT", 465);
    this.user = env.string("EMAIL_USER");
    this.password = env.string("EMAIL_PASSWORD");
  }
}
