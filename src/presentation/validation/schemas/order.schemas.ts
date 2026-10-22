import { z } from "zod";
import { OrderSort } from "@/application/ports/driving/browse-orders.use-case.port";
import { DeliveryType, OrderStatus, OrderType } from "@/domain/types/order.type";
import { UserRoleType } from "@/domain/types/user.type";

export const CreateOnlineOrderSchema = z.object({
  memberId: z.uuid().optional(),
  guestName: z.string().trim().min(1).max(100).optional(),
  guestEmail: z.email().max(255).optional(),
  deliveryType: z.enum(Object.values(DeliveryType)),
  deliveryAddress: z.string().trim().min(1).max(500).optional(),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),
  scheduledAt: z.date().optional(),
  items: z.array(
    z.object({
      productId: z.uuid(),
      quantity: z.number().int().positive(),
      note: z.string().trim().max(500).optional(),
    }),
  ),
});

export const BrowseOrdersSchema = z.object({
  userId: z.uuid(),
  role: z.enum(Object.values(UserRoleType)),
  query: z.object({
    type: z.enum(Object.values(OrderType)).optional(),
    status: z.enum(Object.values(OrderStatus)).optional(),
    sort: z.enum(Object.values(OrderSort)).default(OrderSort.NEWEST).optional(),
  }),
});

export const GetOrderDetailsSchema = z.object({
  id: z.uuid(),
  memberId: z.uuid().optional(),
  guestToken: z.string().trim().min(1).max(255).optional(),
});

export const GetOnlineOrderQuoteSchema = z.object({
  items: z.array(
    z.object({
      productId: z.uuid(),
      quantity: z.number().int().positive(),
    }),
  ),
  memberId: z.uuid().optional(),
  deliveryCoordinate: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
});

export const RenewGuestOrderTokenSchema = z.object({
  orderId: z.uuid(),
  email: z.email(),
});

export type CreateOnlineOrderSchemaType = z.infer<typeof CreateOnlineOrderSchema>;
export type BrowseOrdersSchemaType = z.infer<typeof BrowseOrdersSchema>;
export type GetOrderDetailsSchemaType = z.infer<typeof GetOrderDetailsSchema>;
export type GetOnlineOrderQuoteSchemaType = z.infer<typeof GetOnlineOrderQuoteSchema>;
export type RenewGuestOrderTokenSchemaType = z.infer<typeof RenewGuestOrderTokenSchema>;
