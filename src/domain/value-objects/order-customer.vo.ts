import { OrderCustomerCreationData, OrderCustomerRebuildData, OrderCustomerType } from "../types/order.type";
import { InvalidOrderGuestDataException } from "../exceptions/order.exceptions";

export class OrderCustomer {
  private constructor(
    private readonly type: OrderCustomerType,
    private readonly memberId: string | null,
    private readonly guestName: string | null,
    private readonly guestEmail: string | null,
  ) {}

  getType(): OrderCustomerType {
    return this.type;
  }

  getMemberId(): string | null {
    return this.memberId;
  }

  getGuestName(): string | null {
    return this.guestName;
  }

  getGuestEmail(): string | null {
    return this.guestEmail;
  }

  isMember(): boolean {
    return this.type === OrderCustomerType.MEMBER;
  }

  isGuest(): boolean {
    return this.type === OrderCustomerType.GUEST;
  }

  isAnonymous(): boolean {
    return this.type === OrderCustomerType.ANONYMOUS;
  }

  static create(data?: OrderCustomerCreationData): OrderCustomer {
    if (!data) return new OrderCustomer(OrderCustomerType.ANONYMOUS, null, null, null);
    if (data.memberId) return new OrderCustomer(OrderCustomerType.MEMBER, data.memberId, null, null);
    if (!data.guestName || !data.guestEmail) throw new InvalidOrderGuestDataException();
    return new OrderCustomer(OrderCustomerType.GUEST, null, data.guestName, data.guestEmail);
  }

  static rebuild({ type, memberId, guestName, guestEmail }: OrderCustomerRebuildData): OrderCustomer {
    return new OrderCustomer(type, memberId, guestName, guestEmail);
  }
}
