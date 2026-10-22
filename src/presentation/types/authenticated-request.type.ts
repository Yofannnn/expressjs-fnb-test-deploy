import { Request } from "express";
import { AccessTokenPayload } from "@/application/types/auth-token.type";

export interface AuthenticatedRequest extends Request {
  auth: AccessTokenPayload;
}
