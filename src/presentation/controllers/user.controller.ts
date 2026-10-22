import { Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { GetCurrentUserProfileUseCasePort } from "@/application/ports/driving/get-current-user-profile.use-case.port";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";

export class UserController {
  constructor(
    private readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCasePort,
    private readonly authTokenVerifier: AuthTokenVerifierPort,
  ) {}

  async getCurrentProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const result = await this.getCurrentUserProfileUseCase.execute({ userId: accessTokenPayload.sub });

    return res.json({
      message: "User profile retrieved successfully",
      data: result,
    });
  }
}
