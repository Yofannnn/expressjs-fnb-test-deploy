import { User } from "../entities/user.entity";
import { UserRoleType } from "../types/user.type";
import { ActionNotAuthorizedException } from "../exceptions/user.exceptions";

export class UserAccessControlService {
  static assertIsAdminAction(performedBy: User, action: string): void {
    if (performedBy.getRole() !== UserRoleType.ADMIN) throw new ActionNotAuthorizedException(performedBy.getRole(), action);
  }
}
