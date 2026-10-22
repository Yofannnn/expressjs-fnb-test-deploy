import { ForbiddenActionException } from "../exceptions/access-control.exceptions";
import { UserRoleType } from "../types/user.type";

export class ProductAccessControlService {
  static assertCanCreate(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN, UserRoleType.MANAGER], "create products");
  }

  static assertCanUpdate(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN, UserRoleType.MANAGER], "update products");
  }

  static assertCanDelete(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN], "delete products");
  }

  static assertCanManageStock(role: UserRoleType): void {
    this.assertRole(role, [UserRoleType.ADMIN, UserRoleType.MANAGER, UserRoleType.CASHIER], "manage product stock");
  }

  private static assertRole(role: UserRoleType, allowedRoles: UserRoleType[], action: string): void {
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenActionException(`User with role ${role}`, action);
    }
  }
}
