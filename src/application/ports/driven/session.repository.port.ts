import { Session } from "@/domain/entities/session.entity";

export interface SessionRepositoryPort {
  findById(sessionId: string): Promise<Session | null>;
  insert(session: Session): Promise<void>;
  update(session: Session): Promise<void>;
  revokeTokenFamily(tokenFamily: string, revokeReason?: string): Promise<void>;
  revokeAllSessionsForUser(userId: string, revokeReason?: string): Promise<void>;
}
