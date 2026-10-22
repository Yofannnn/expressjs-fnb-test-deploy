import { ApplicationToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenType } from "@/domain/types/application-token.type";

export interface ApplicationTokenRepositoryPort {
  insert(token: ApplicationToken): Promise<void>;
  update(token: ApplicationToken): Promise<void>;
  invalidateByTypeAndIdentifier(type: ApplicationTokenType, identifier: string): Promise<void>;
  countByTypeAndIdentifierWithin(type: ApplicationTokenType, identifier: string, windowMs: number): Promise<number>;
  findByTokenFingerprint(tokenFingerprint: string, identifier?: string): Promise<ApplicationToken | null>;
  findLastTokenByTypeAndIdentifier(type: ApplicationTokenType, identifier: string): Promise<ApplicationToken | null>;
}
