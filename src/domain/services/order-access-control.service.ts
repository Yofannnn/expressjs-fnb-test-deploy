import { Order } from "../entities/order.entity";
import { ForbiddenActionException } from "../exceptions/access-control.exceptions";
import { UserRoleType } from "../types/user.type";

export class OrderAccessControlService {
  static assertOwnership(order: Order, memberId?: string, guestEmail?: string): void {
    const canView = memberId ? order.isOwnedByMember(memberId) : guestEmail ? order.isOwnedByGuest(guestEmail) : false;
    if (!canView) throw new ForbiddenActionException(`Anonymous user`, "view order");
  }

  static canStaffAccessOrders(role?: UserRoleType): boolean {
    return role === UserRoleType.ADMIN || role === UserRoleType.MANAGER;
  }
}
