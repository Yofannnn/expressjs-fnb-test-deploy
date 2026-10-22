import { Request, Response } from "express";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { InitiateChargeUseCasePort } from "@/application/ports/driving/initiate-charge.use-case.port";
import { HandlePaymentUseCasePort } from "@/application/ports/driving/handle-payment.use-case.port";
import { AuthTokenUtil } from "../utils/auth-token.util";
import { GetPaymentDetailsUseCasePort } from "@/application/ports/driving/get-payment-details.use-case.port";
import { GetPaymentsByOrderIdUseCasePort } from "@/application/ports/driving/get-payments-by-order-id.use-case.port";
import { ZodRequestValidation } from "../validation/zod-request-validation";
import {
  GetPaymentsByOrderIdSchema,
  GetPaymentsByOrderIdSchemaType,
  GetPaymentDetailsSchema,
  GetPaymentDetailsSchemaType,
  HandlePaymentSchema,
  HandlePaymentSchemaType,
  InitiateChargeSchema,
  InitiateChargeSchemaType,
} from "../validation/schemas/payment.schemas";

export class PaymentController {
  constructor(
    private readonly validation: ZodRequestValidation,
    private readonly initiateChargeUseCase: InitiateChargeUseCasePort,
    private readonly handlePaymentUseCase: HandlePaymentUseCasePort,
    private readonly getPaymentDetailsUseCase: GetPaymentDetailsUseCasePort,
    private readonly getPaymentsByOrderIdUseCase: GetPaymentsByOrderIdUseCasePort,
    private readonly authTokenVerifier: AuthTokenVerifierPort,
  ) {}

  async initCharge(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const orderId = body.orderId;
    const memberId = this.getMemberId(req);
    const guestToken = this.getGuestToken(req);
    const payload = { orderId, memberId, guestToken };

    const initChargeDto = this.validation.validate<InitiateChargeSchemaType>(InitiateChargeSchema, payload);
    const result = await this.initiateChargeUseCase.execute(initChargeDto);

    return res.status(201).json({ message: "Payment initiated successfully", data: result });
  }

  // TODO: change to webhook implementation
  // user will not manually hit server to I/O payment and order as success and paid and confirm
  async handleSuccessPayment(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const paymentId = body.paymentId;

    const handlePaymentDto = this.validation.validate<HandlePaymentSchemaType>(HandlePaymentSchema, { paymentId });
    const result = await this.handlePaymentUseCase.execute(handlePaymentDto);

    return res.status(201).json({ message: "Payment handled successfully", data: result });
  }

  async getDetails(req: Request, res: Response): Promise<Response> {
    const orderId = req.params.orderId;
    const paymentId = req.params.paymentId;
    const memberId = this.getMemberId(req);
    const guestToken = this.getGuestToken(req);
    const payload = { orderId, paymentId, memberId, guestToken };
    const getPaymentDto = this.validation.validate<GetPaymentDetailsSchemaType>(GetPaymentDetailsSchema, payload);
    const result = await this.getPaymentDetailsUseCase.execute(getPaymentDto);

    return res.status(200).json({ message: "Payment details retrieved successfully", data: result.payment, scope: result.scope });
  }

  async getByOrderId(req: Request, res: Response): Promise<Response> {
    const orderId = req.params.orderId;
    const memberId = this.getMemberId(req);
    const guestToken = this.getGuestToken(req);
    const payload = { orderId, memberId, guestToken };
    const getPaymentsDto = this.validation.validate<GetPaymentsByOrderIdSchemaType>(GetPaymentsByOrderIdSchema, payload);
    const result = await this.getPaymentsByOrderIdUseCase.execute(getPaymentsDto);

    return res.status(200).json({ message: "Payments retrieved successfully", data: result.payments, scope: result.scope });
  }

  private getMemberId(req: Request): string | undefined {
    const accessToken = AuthTokenUtil.getAccessToken(req);
    if (!accessToken) return undefined;
    const accessTokenPayload = this.authTokenVerifier.verifyAccessToken(accessToken);
    return accessTokenPayload.sub;
  }

  private getGuestToken(req: Request): string | undefined {
    const token = req.query.guestToken;
    if (Array.isArray(token)) return token[0] as string;
    if (typeof token === "string" && token.length > 0) return token;
    return undefined;
  }
}
