import { OrderCustomer } from "@/domain/value-objects/order-customer.vo";
import { OrderCustomerCreationData, OrderCustomerRebuildData, OrderCustomerType } from "@/domain/types/order.type";
import { InvalidOrderGuestDataException } from "@/domain/exceptions/order.exceptions";

describe("OrderCustomer", () => {
  describe("create", () => {
    it("should create an OrderCustomer instance with member ID", () => {
      const data: OrderCustomerCreationData = { memberId: "member-123" };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("member-123");
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(true);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should create an OrderCustomer instance with guest data", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
        guestEmail: "john@example.com",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBe("John Doe");
      expect(orderCustomer.getGuestEmail()).toBe("john@example.com");
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(true);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should create an anonymous OrderCustomer instance when no data is provided", () => {
      const orderCustomer = OrderCustomer.create();

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should create an anonymous OrderCustomer instance when data is undefined", () => {
      const orderCustomer = OrderCustomer.create(undefined);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should create an anonymous OrderCustomer instance when data is null", () => {
      const orderCustomer = OrderCustomer.create(null as unknown as OrderCustomerCreationData);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should throw InvalidOrderGuestDataException when guest data is incomplete", () => {
      expect(() => OrderCustomer.create({})).toThrow(InvalidOrderGuestDataException);
      expect(() => OrderCustomer.create({ guestName: "John Doe" })).toThrow(InvalidOrderGuestDataException);
      expect(() => OrderCustomer.create({ guestEmail: "john@example.com" })).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guest data is missing name", () => {
      const data: OrderCustomerCreationData = {
        guestEmail: "john@example.com",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guest data is missing email", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException with correct error message", () => {
      try {
        OrderCustomer.create({});
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderGuestDataException);
        expect((error as InvalidOrderGuestDataException).message).toBe("Guest orders require both a guest name and a guest email");
      }
    });

    it("should prioritize member ID over guest data when both are provided", () => {
      const data: OrderCustomerCreationData = {
        memberId: "member-123",
        guestName: "John Doe",
        guestEmail: "john@example.com",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("member-123");
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(true);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should handle member ID with empty string by treating it as guest data", () => {
      const data: OrderCustomerCreationData = {
        memberId: "",
        guestName: "John Doe",
        guestEmail: "john@example.com",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBe("John Doe");
      expect(orderCustomer.getGuestEmail()).toBe("john@example.com");
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(true);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should create anonymous when memberId is empty string and no guest data", () => {
      const data: OrderCustomerCreationData = {
        memberId: "",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should create anonymous when memberId is null and no guest data", () => {
      const data: OrderCustomerCreationData = {
        memberId: null as unknown as string,
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should create an anonymous OrderCustomer instance when no data is provided", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should create an anonymous OrderCustomer instance when data is undefined", () => {
      const orderCustomer = OrderCustomer.create(undefined);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should throw InvalidOrderGuestDataException when guestName is empty string", () => {
      const data: OrderCustomerCreationData = {
        guestName: "",
        guestEmail: "john@example.com",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestEmail is empty string", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
        guestEmail: "",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });
  });

  describe("rebuild", () => {
    it("should rebuild an OrderCustomer instance with member data", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "member-456",
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("member-456");
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(true);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should rebuild an OrderCustomer instance with guest data", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.GUEST,
        memberId: null,
        guestName: "Jane Doe",
        guestEmail: "jane@example.com",
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBe("Jane Doe");
      expect(orderCustomer.getGuestEmail()).toBe("jane@example.com");
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(true);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should rebuild an OrderCustomer instance with anonymous data", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.ANONYMOUS,
        memberId: null,
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should rebuild with all null values as anonymous", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.ANONYMOUS,
        memberId: null,
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should rebuild with empty string values", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "",
        guestName: "",
        guestEmail: "",
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("");
      expect(orderCustomer.getGuestName()).toBe("");
      expect(orderCustomer.getGuestEmail()).toBe("");
      expect(orderCustomer.isMember()).toBe(true);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should return a new OrderCustomer instance", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "member-789",
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);
      expect(orderCustomer).toBeInstanceOf(OrderCustomer);
    });

    it("should rebuild with member type but null memberId", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: null,
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.isMember()).toBe(true);
    });

    it("should rebuild with guest type but null guest data", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.GUEST,
        memberId: null,
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isGuest()).toBe(true);
    });
  });

  describe("getters", () => {
    it("should return type for member customer", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
    });

    it("should return type for guest customer", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
    });

    it("should return type for anonymous customer", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.getType()).toBe(OrderCustomerType.ANONYMOUS);
    });

    it("should return member ID for member customer", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.getMemberId()).toBe("member-123");
    });

    it("should return null for member ID when guest", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getMemberId()).toBeNull();
    });

    it("should return null for member ID when anonymous", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.getMemberId()).toBeNull();
    });

    it("should return guest name for guest customer", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestName()).toBe("John Doe");
    });

    it("should return null for guest name when member", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.getGuestName()).toBeNull();
    });

    it("should return null for guest name when anonymous", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.getGuestName()).toBeNull();
    });

    it("should return guest email for guest customer", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestEmail()).toBe("john@example.com");
    });

    it("should return null for guest email when member", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.getGuestEmail()).toBeNull();
    });

    it("should return null for guest email when anonymous", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.getGuestEmail()).toBeNull();
    });
  });

  describe("isMember", () => {
    it("should return true when customer has member ID", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.isMember()).toBe(true);
    });

    it("should return false when customer has no member ID", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.isMember()).toBe(false);
    });

    it("should return false for anonymous customer", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.isMember()).toBe(false);
    });
  });

  describe("isGuest", () => {
    it("should return true when customer has guest data", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.isGuest()).toBe(true);
    });

    it("should return false when customer has member ID", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.isGuest()).toBe(false);
    });

    it("should return false for anonymous customer", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.isGuest()).toBe(false);
    });
  });

  describe("isAnonymous", () => {
    it("should return true when customer is anonymous", () => {
      const orderCustomer = OrderCustomer.create();
      expect(orderCustomer.isAnonymous()).toBe(true);
    });

    it("should return false when customer has member ID", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should return false when customer has guest data", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.isAnonymous()).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should return a new instance when creating new customer", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "member-123" });

      const newCustomer = OrderCustomer.create({ memberId: "modified" });

      expect(newCustomer).not.toBe(orderCustomer);
      expect(newCustomer.getMemberId()).toBe("modified");
      expect(orderCustomer.getMemberId()).toBe("member-123");
    });

    it("should return a new instance from create each time", () => {
      const customer1 = OrderCustomer.create({ memberId: "member-123" });
      const customer2 = OrderCustomer.create({ memberId: "member-123" });

      expect(customer1).not.toBe(customer2);
      expect(customer1.getMemberId()).toBe(customer2.getMemberId());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "member-123",
        guestName: null,
        guestEmail: null,
      };
      const customer1 = OrderCustomer.rebuild(data);
      const customer2 = OrderCustomer.rebuild(data);

      expect(customer1).not.toBe(customer2);
      expect(customer1.getMemberId()).toBe(customer2.getMemberId());
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle very long member ID", () => {
      const longMemberId = "member-" + "a".repeat(1000);
      const orderCustomer = OrderCustomer.create({ memberId: longMemberId });
      expect(orderCustomer.getMemberId()).toBe(longMemberId);
    });

    it("should handle very long guest name", () => {
      const longName = "John " + "Doe ".repeat(500);
      const orderCustomer = OrderCustomer.create({
        guestName: longName,
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestName()).toBe(longName);
    });

    it("should handle very long guest email", () => {
      const longEmail = "john." + "a".repeat(500) + "@example.com";
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: longEmail,
      });
      expect(orderCustomer.getGuestEmail()).toBe(longEmail);
    });

    it("should handle special characters in guest name", () => {
      const specialName = "John Doe Jr. Sr. III";
      const orderCustomer = OrderCustomer.create({
        guestName: specialName,
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestName()).toBe(specialName);
    });

    it("should handle special characters in guest email", () => {
      const specialEmail = "john.doe+test@example.co.id";
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: specialEmail,
      });
      expect(orderCustomer.getGuestEmail()).toBe(specialEmail);
    });

    it("should handle Unicode characters in guest name", () => {
      const unicodeName = "John Döe 你好";
      const orderCustomer = OrderCustomer.create({
        guestName: unicodeName,
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestName()).toBe(unicodeName);
    });

    it("should handle Unicode characters in guest email", () => {
      const unicodeEmail = "john.döe@exämple.com";
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: unicodeEmail,
      });
      expect(orderCustomer.getGuestEmail()).toBe(unicodeEmail);
    });

    it("should handle memberId with special characters", () => {
      const specialMemberId = "member-123!@#$%";
      const orderCustomer = OrderCustomer.create({ memberId: specialMemberId });
      expect(orderCustomer.getMemberId()).toBe(specialMemberId);
    });
  });

  describe("type safety and edge conditions", () => {
    it("should handle member ID with whitespace", () => {
      const orderCustomer = OrderCustomer.create({ memberId: "  member-123  " });
      expect(orderCustomer.getMemberId()).toBe("  member-123  ");
    });

    it("should handle guest name with whitespace", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "  John Doe  ",
        guestEmail: "john@example.com",
      });
      expect(orderCustomer.getGuestName()).toBe("  John Doe  ");
    });

    it("should handle guest email with whitespace", () => {
      const orderCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "  john@example.com  ",
      });
      expect(orderCustomer.getGuestEmail()).toBe("  john@example.com  ");
    });

    it("should properly distinguish between null and empty string", () => {
      const memberCustomer = OrderCustomer.create({ memberId: "123" });
      const guestCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      const anonymousCustomer = OrderCustomer.create();

      expect(memberCustomer.isMember()).toBe(true);
      expect(memberCustomer.isGuest()).toBe(false);
      expect(memberCustomer.isAnonymous()).toBe(false);

      expect(guestCustomer.isMember()).toBe(false);
      expect(guestCustomer.isGuest()).toBe(true);
      expect(guestCustomer.isAnonymous()).toBe(false);

      expect(anonymousCustomer.isMember()).toBe(false);
      expect(anonymousCustomer.isGuest()).toBe(false);
      expect(anonymousCustomer.isAnonymous()).toBe(true);
    });

    it("should treat empty string memberId as null (falsy)", () => {
      const data: OrderCustomerCreationData = {
        memberId: "",
        guestName: "Jane Doe",
        guestEmail: "jane@example.com",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(true);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });
  });

  describe("consistency and behavior", () => {
    it("should maintain consistency between isMember, isGuest, and isAnonymous", () => {
      const memberCustomer = OrderCustomer.create({ memberId: "member-123" });
      const guestCustomer = OrderCustomer.create({
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });
      const anonymousCustomer = OrderCustomer.create();

      expect(memberCustomer.isMember() || memberCustomer.isGuest() || memberCustomer.isAnonymous()).toBe(true);
      expect(guestCustomer.isMember() || guestCustomer.isGuest() || guestCustomer.isAnonymous()).toBe(true);
      expect(anonymousCustomer.isMember() || anonymousCustomer.isGuest() || anonymousCustomer.isAnonymous()).toBe(true);
      expect(memberCustomer.isMember()).toBe(!memberCustomer.isGuest() && !memberCustomer.isAnonymous());
      expect(guestCustomer.isGuest()).toBe(!guestCustomer.isMember() && !guestCustomer.isAnonymous());
      expect(anonymousCustomer.isAnonymous()).toBe(!anonymousCustomer.isMember() && !anonymousCustomer.isGuest());
    });

    it("should maintain consistency between create and rebuild", () => {
      const createData: OrderCustomerCreationData = {
        memberId: "member-123",
      };
      const rebuildData: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "member-123",
        guestName: null,
        guestEmail: null,
      };

      const fromCreate = OrderCustomer.create(createData);
      const fromRebuild = OrderCustomer.rebuild(rebuildData);

      expect(fromCreate.getType()).toBe(fromRebuild.getType());
      expect(fromCreate.getMemberId()).toBe(fromRebuild.getMemberId());
      expect(fromCreate.getGuestName()).toBe(fromRebuild.getGuestName());
      expect(fromCreate.getGuestEmail()).toBe(fromRebuild.getGuestEmail());
      expect(fromCreate.isMember()).toBe(fromRebuild.isMember());
      expect(fromCreate.isGuest()).toBe(fromRebuild.isGuest());
      expect(fromCreate.isAnonymous()).toBe(fromRebuild.isAnonymous());
    });

    it("should maintain consistency between create anonymous and rebuild anonymous", () => {
      const fromCreate = OrderCustomer.create();
      const fromRebuild = OrderCustomer.rebuild({
        type: OrderCustomerType.ANONYMOUS,
        memberId: null,
        guestName: null,
        guestEmail: null,
      });

      expect(fromCreate.getType()).toBe(fromRebuild.getType());
      expect(fromCreate.getMemberId()).toBe(fromRebuild.getMemberId());
      expect(fromCreate.getGuestName()).toBe(fromRebuild.getGuestName());
      expect(fromCreate.getGuestEmail()).toBe(fromRebuild.getGuestEmail());
      expect(fromCreate.isAnonymous()).toBe(fromRebuild.isAnonymous());
    });
  });

  describe("error scenarios", () => {
    it("should throw InvalidOrderGuestDataException when guestName is null", () => {
      const data: OrderCustomerCreationData = {
        guestName: null as unknown as string,
        guestEmail: "john@example.com",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestEmail is null", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
        guestEmail: null as unknown as string,
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestName is undefined", () => {
      const data: OrderCustomerCreationData = {
        guestName: undefined,
        guestEmail: "john@example.com",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestEmail is undefined", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
        guestEmail: undefined,
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestName is empty string", () => {
      const data: OrderCustomerCreationData = {
        guestName: "",
        guestEmail: "john@example.com",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestEmail is empty string", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John Doe",
        guestEmail: "",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when both guestName and guestEmail are empty strings", () => {
      const data: OrderCustomerCreationData = {
        guestName: "",
        guestEmail: "",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestName is empty string and guestEmail is undefined", () => {
      const data: OrderCustomerCreationData = {
        guestName: "",
        guestEmail: undefined,
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should throw InvalidOrderGuestDataException when guestName is undefined and guestEmail is empty string", () => {
      const data: OrderCustomerCreationData = {
        guestName: undefined,
        guestEmail: "",
      };
      expect(() => OrderCustomer.create(data)).toThrow(InvalidOrderGuestDataException);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should create guest customer with special characters in both name and email", () => {
      const data: OrderCustomerCreationData = {
        guestName: "John 'The Great' Doe",
        guestEmail: "john.doe+test@example.com",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getGuestName()).toBe("John 'The Great' Doe");
      expect(orderCustomer.getGuestEmail()).toBe("john.doe+test@example.com");
      expect(orderCustomer.isGuest()).toBe(true);
    });

    it("should handle numeric memberId", () => {
      const data: OrderCustomerCreationData = {
        memberId: "12345",
      };
      const orderCustomer = OrderCustomer.create(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("12345");
      expect(orderCustomer.isMember()).toBe(true);
    });

    it("should handle memberId with UUID format", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const orderCustomer = OrderCustomer.create({ memberId: uuid });
      expect(orderCustomer.getMemberId()).toBe(uuid);
    });

    it("should rebuild with member type and all fields correctly", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.MEMBER,
        memberId: "member-123",
        guestName: null,
        guestEmail: null,
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.MEMBER);
      expect(orderCustomer.getMemberId()).toBe("member-123");
      expect(orderCustomer.getGuestName()).toBeNull();
      expect(orderCustomer.getGuestEmail()).toBeNull();
      expect(orderCustomer.isMember()).toBe(true);
      expect(orderCustomer.isGuest()).toBe(false);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });

    it("should rebuild with guest type and all fields correctly", () => {
      const data: OrderCustomerRebuildData = {
        type: OrderCustomerType.GUEST,
        memberId: null,
        guestName: "Jane Doe",
        guestEmail: "jane@example.com",
      };
      const orderCustomer = OrderCustomer.rebuild(data);

      expect(orderCustomer.getType()).toBe(OrderCustomerType.GUEST);
      expect(orderCustomer.getMemberId()).toBeNull();
      expect(orderCustomer.getGuestName()).toBe("Jane Doe");
      expect(orderCustomer.getGuestEmail()).toBe("jane@example.com");
      expect(orderCustomer.isMember()).toBe(false);
      expect(orderCustomer.isGuest()).toBe(true);
      expect(orderCustomer.isAnonymous()).toBe(false);
    });
  });
});
