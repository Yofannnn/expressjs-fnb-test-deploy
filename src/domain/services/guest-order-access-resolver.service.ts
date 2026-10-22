import { Order } from "../entities/order.entity";
import { GuestOrderManagementToken } from "../entities/application-token.entity";
import { ForbiddenActionException } from "../exceptions/access-control.exceptions";

export class GuestOrderAccessResolverService {
  static resolveGuestEmail(guestOrderToken: GuestOrderManagementToken, order: Order): string {
    guestOrderToken.assertNotExpired();
    if (guestOrderToken.getOrderId() !== order.getId()) throw new ForbiddenActionException("You", "view order");
    return guestOrderToken.getIdentifier();
  }
}
