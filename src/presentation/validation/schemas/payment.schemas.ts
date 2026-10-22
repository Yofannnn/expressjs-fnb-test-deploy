import { PaymentMethod } from "@/domain/types/payment-transaction.type";
import z from "zod";

export const InitiateChargeSchema = z.object({
  orderId: z.uuid(),
  memberId: z.uuid().optional(),
  guestToken: z.string().trim().min(1).max(255).optional(),
  method: z.enum(Object.values(PaymentMethod)).optional(),
});

// TODO: delete or change to fit with webhook request
export const HandlePaymentSchema = z.object({
  paymentId: z.uuid(),
});

export const GetPaymentDetailsSchema = z.object({
  orderId: z.uuid(),
  paymentId: z.uuid(),
  memberId: z.uuid().optional(),
  guestToken: z.string().trim().min(1).max(255).optional(),
});

export const GetPaymentsByOrderIdSchema = z.object({
  orderId: z.uuid(),
  memberId: z.uuid().optional(),
  guestToken: z.string().trim().min(1).max(255).optional(),
});

export type InitiateChargeSchemaType = z.infer<typeof InitiateChargeSchema>;
export type HandlePaymentSchemaType = z.infer<typeof HandlePaymentSchema>;
export type GetPaymentDetailsSchemaType = z.infer<typeof GetPaymentDetailsSchema>;
export type GetPaymentsByOrderIdSchemaType = z.infer<typeof GetPaymentsByOrderIdSchema>;
