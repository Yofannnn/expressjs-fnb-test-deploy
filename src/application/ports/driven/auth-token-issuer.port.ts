import { User } from "@/domain/entities/user.entity";

export interface AuthTokenIssuerPort {
  issueAccessToken(user: User): string;
  issueRefreshToken(user: User, sessionId: string): string;
}
