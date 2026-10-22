import { UserActivity } from "@/domain/value-objects/user-activity.vo";

export interface UserActivityRepositoryPort {
  insert(userActivity: UserActivity): Promise<void>;
  findLatestByUserId(userId: string): Promise<UserActivity | null>;
  findByUserId(userId: string): Promise<UserActivity[]>;
}
