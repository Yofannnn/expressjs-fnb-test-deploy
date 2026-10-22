import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { CreateOnlineOrderUseCasePort } from "@/application/ports/driving/create-online-order.use-case.port";
import { AuthTokenUtil } from "../utils/auth-token.util";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { GetOrderDetailsUseCasePort } from "@/application/ports/driving/get-order-details.use-case.port";
import { GetOnlineOrderQuoteUseCasePort } from "@/application/ports/driving/get-online-order-quote.use-case.port";
import { BrowseOrdersUseCasePort } from "@/application/ports/driving/browse-orders.use-case.port";
import { RenewGuestOrderTokenUseCasePort } from "@/application/ports/driving/renew-guest-order-token.use-case.port";
import { ZodRequestValidation } from "../validation/zod-request-validation";
import {
  BrowseOrdersSchema,
  BrowseOrdersSchemaType,
  CreateOnlineOrderSchema,
  CreateOnlineOrderSchemaType,
  GetOrderDetailsSchema,
  GetOrderDetailsSchemaType,
  GetOnlineOrderQuoteSchema,
  GetOnlineOrderQuoteSchemaType,
  RenewGuestOrderTokenSchema,
  RenewGuestOrderTokenSchemaType,
} from "../validation/schemas/order.schemas";

export class OrderController {
  constructor(
    private readonly validation: ZodRequestValidation,
    private readonly createOnlineOrderUseCase: CreateOnlineOrderUseCasePort,
    private readonly browseOrdersUseCase: BrowseOrdersUseCasePort,
    private readonly getOrderDetailsUseCase: GetOrderDetailsUseCasePort,
    private readonly getOnlineOrderQuoteUseCase: GetOnlineOrderQuoteUseCasePort,
    private readonly renewGuestOrderTokenUseCase: RenewGuestOrderTokenUseCasePort,
    private readonly authTokenVerifier: AuthTokenVerifierPort,
  ) {}

  async createOnlineOrder(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const payload = { ...body, memberId: this.getMemberId(req) };
    const onlineOrderDto = this.validation.validate<CreateOnlineOrderSchemaType>(CreateOnlineOrderSchema, payload);
    const result = await this.createOnlineOrderUseCase.execute(onlineOrderDto);

    return res.status(201).json({ message: "Order created successfully", data: result });
  }

  async browse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const browseDto = this.validation.validate<BrowseOrdersSchemaType>(BrowseOrdersSchema, {
      userId: accessTokenPayload.sub,
      role: accessTokenPayload.role,
      query: req.query,
    });

    const result = await this.browseOrdersUseCase.execute(browseDto);

    return res.status(200).json({ message: "Orders retrieved successfully", data: result });
  }

  async getDetails(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    const memberId = this.getMemberId(req);
    const guestToken = this.getGuestToken(req);
    const payload = { id, memberId, guestToken };

    const getOrderDetailsDto = this.validation.validate<GetOrderDetailsSchemaType>(GetOrderDetailsSchema, payload);
    const result = await this.getOrderDetailsUseCase.execute(getOrderDetailsDto);

    return res.status(200).json({ message: "Order details retrieved successfully", data: result });
  }

  async getOnlineOrderQuote(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const memberId = this.getMemberId(req);
    const payload = { ...body, memberId };

    const getQuoteDto = this.validation.validate<GetOnlineOrderQuoteSchemaType>(GetOnlineOrderQuoteSchema, payload);
    const result = await this.getOnlineOrderQuoteUseCase.execute(getQuoteDto);

    return res.status(200).json({ message: "Order quote retrieved successfully", data: result });
  }

  async renewGuestOrderToken(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const renewGuestOrderTokenDto = this.validation.validate<RenewGuestOrderTokenSchemaType>(RenewGuestOrderTokenSchema, body);

    await this.renewGuestOrderTokenUseCase.execute(renewGuestOrderTokenDto);

    return res.status(200).json({ message: "Guest order token renewed successfully" });
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
