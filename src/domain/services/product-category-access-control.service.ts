import { ForbiddenActionException } from "../exceptions/access-control.exceptions";
import { UserRoleType } from "../types/user.type";

export class ProductCategoryAccessControlService {
  static assertCanCreate(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN, UserRoleType.MANAGER], "create product categories");
  }

  static assertCanUpdate(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN, UserRoleType.MANAGER], "update product categories");
  }

  static assertCanDelete(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN], "delete product categories");
  }

  private static assertRole(role: UserRoleType, allowedRoles: UserRoleType[], action: string): void {
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenActionException(`User with role ${role}`, action);
    }
  }
}
