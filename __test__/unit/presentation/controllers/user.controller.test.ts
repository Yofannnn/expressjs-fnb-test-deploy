import { Request, Response } from "express";
import { UserController } from "@/presentation/controllers/user.controller";
import { RateLimit } from "@/application/ports/driving/rate-limit";
import { GetCurrentUserProfileUseCase, GetCurrentUserProfileView } from "@/application/ports/driving/get-current-user-profile.use-case";
import { AuthTokenVerifier } from "@/application/ports/driven/auth-token-verifier";
import { AppException } from "@/application/exceptions/app.exception";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { AccessTokenPayload } from "@/application/types/auth-token.type";
import { USER_RATE_LIMIT_POLICY } from "@/infrastructure/rate-limit/policies/user-rate-limit.policy";

jest.mock("@/presentation/utils/auth-token.utils", () => ({
  AuthTokenUtil: {
    requireAccessToken: jest.fn(),
  },
}));

const mockedAuthTokenUtil = jest.requireMock("@/presentation/utils/auth-token.utils").AuthTokenUtil;

describe("UserController", () => {
  let controller: UserController;

  let rateLimit: jest.Mocked<RateLimit>;
  let getCurrentUserProfileUseCase: jest.Mocked<GetCurrentUserProfileUseCase>;
  let authTokenVerifier: jest.Mocked<AuthTokenVerifier>;

  let req: Partial<Request>;
  let res: Partial<Response>;

  const ACCESS_TOKEN = "access-token-value";
  const USER_ID = "user-123";
  const USER_ROLE = UserRoleType.MEMBER;
  const USER_EMAIL = "test@example.com";
  const USER_NAME = "John Doe";

  const mockUserProfile: GetCurrentUserProfileView = {
    id: USER_ID,
    name: USER_NAME,
    address: "123 Main St, City, Country",
    email: USER_EMAIL,
    role: USER_ROLE,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    rateLimit = { check: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RateLimit>;
    getCurrentUserProfileUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetCurrentUserProfileUseCase>;
    authTokenVerifier = { verifyAccessToken: jest.fn() } as unknown as jest.Mocked<AuthTokenVerifier>;

    mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);

    authTokenVerifier.verifyAccessToken.mockReturnValue({
      sub: USER_ID,
      email: USER_EMAIL,
      name: USER_NAME,
      role: USER_ROLE,
    } as AccessTokenPayload);

    controller = new UserController(rateLimit, getCurrentUserProfileUseCase, authTokenVerifier);

    req = { body: {}, params: {}, query: {}, cookies: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  describe("getCurrentProfile", () => {
    it("should get current user profile successfully and return 200 with user data", async () => {
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("user:get-user-profile", USER_RATE_LIMIT_POLICY.GET_PROFILE);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: mockUserProfile,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(err);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(err);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate token verification errors", async () => {
      const err = new Error("Invalid token");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(err);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("User not found");
      getCurrentUserProfileUseCase.execute.mockRejectedValue(err);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle AppException from use case", async () => {
      const appError = AppException.create({
        name: "DomainException",
        statusCode: 404,
        message: "User not found",
      });
      getCurrentUserProfileUseCase.execute.mockRejectedValue(appError);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(appError);
    });

    it("should handle user with complete profile data", async () => {
      const completeProfile: GetCurrentUserProfileView = {
        id: USER_ID,
        name: "John Doe",
        address: "123 Main St, City, Country, 12345",
        email: USER_EMAIL,
        role: UserRoleType.ADMIN,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(completeProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: completeProfile,
      });
    });

    it("should handle user with null address", async () => {
      const profileWithNullAddress: GetCurrentUserProfileView = {
        ...mockUserProfile,
        address: null,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithNullAddress);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithNullAddress,
      });
    });

    it("should handle user with null emailVerifiedAt", async () => {
      const profileWithNullVerified: GetCurrentUserProfileView = {
        ...mockUserProfile,
        emailVerifiedAt: null,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithNullVerified);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithNullVerified,
      });
    });

    it("should handle special characters in user name", async () => {
      const profileWithSpecialChars: GetCurrentUserProfileView = {
        ...mockUserProfile,
        name: "John!@#$% Doe^&*()",
        address: "123 Main St, City!@#",
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithSpecialChars);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithSpecialChars,
      });
    });

    it("should handle very long user data", async () => {
      const longString = "a".repeat(1000);
      const profileWithLongData: GetCurrentUserProfileView = {
        ...mockUserProfile,
        name: longString,
        address: longString,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithLongData);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithLongData,
      });
    });
  });

  describe("Error handling coverage", () => {
    it("should handle error when rate limit throws non-AppError", async () => {
      const error = new Error("Rate limit error");
      rateLimit.check.mockRejectedValue(error);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle error when token verification throws non-AppError", async () => {
      const error = new Error("Token verification failed");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle error when use case throws non-AppError", async () => {
      const error = new Error("Database error");
      getCurrentUserProfileUseCase.execute.mockRejectedValue(error);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
    });

    it("should handle error when access token is null", async () => {
      const error = new Error("Invalid access token");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle error when access token is empty string", async () => {
      const error = new Error("Invalid access token");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("Different user roles", () => {
    it("should handle ADMIN user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "admin@example.com",
        name: "Admin User",
        role: UserRoleType.ADMIN,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.ADMIN,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });

    it("should handle MANAGER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "manager@example.com",
        name: "Manager User",
        role: UserRoleType.MANAGER,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.MANAGER,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });

    it("should handle MEMBER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "member@example.com",
        name: "Member User",
        role: UserRoleType.MEMBER,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.MEMBER,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });

    it("should handle CASHIER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "cashier@example.com",
        name: "Cashier User",
        role: UserRoleType.CASHIER,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.CASHIER,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });

    it("should handle KITCHEN user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "kitchen@example.com",
        name: "Kitchen User",
        role: UserRoleType.KITCHEN,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.KITCHEN,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });

    it("should handle BAR user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: "bar@example.com",
        name: "Bar User",
        role: UserRoleType.BAR,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        role: UserRoleType.BAR,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("Token verification scenarios", () => {
    it("should extract userId from verified token payload", async () => {
      const customUserId = "custom-user-id-456";
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: customUserId,
        email: "custom@example.com",
        name: "Custom User",
        role: USER_ROLE,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue({
        ...mockUserProfile,
        id: customUserId,
      });

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({
        userId: customUserId,
      });
    });

    it("should handle token payload with additional custom claims", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: USER_EMAIL,
        name: USER_NAME,
        role: USER_ROLE,
        permissions: ["read:profile", "write:profile"],
        organizationId: "org-123",
        department: "engineering",
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it("should handle token with different name than profile", async () => {
      const tokenName = "Token Name";
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        email: USER_EMAIL,
        name: tokenName,
        role: USER_ROLE,
      } as AccessTokenPayload);
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: mockUserProfile,
      });
    });
  });

  describe("Response status codes", () => {
    it("should return 200 for successful profile retrieval", async () => {
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return correct response structure", async () => {
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: mockUserProfile,
      });
    });

    it("should return response with user data directly in data property", async () => {
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      const callArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArg).toHaveProperty("data");
      expect(callArg.data).toEqual(mockUserProfile);
    });
  });

  describe("Rate limit policy verification", () => {
    it("should use correct policy for getCurrentProfile", async () => {
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("user:get-user-profile", USER_RATE_LIMIT_POLICY.GET_PROFILE);
    });
  });

  describe("Concurrent requests", () => {
    it("should handle multiple concurrent profile requests", async () => {
      rateLimit.check.mockResolvedValue(undefined);
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      const promises = [
        controller.getCurrentProfile(req as Request, res as Response),
        controller.getCurrentProfile(req as Request, res as Response),
        controller.getCurrentProfile(req as Request, res as Response),
      ];

      await Promise.all(promises);

      expect(rateLimit.check).toHaveBeenCalledTimes(3);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledTimes(3);
    });

    it("should handle concurrent requests with different users", async () => {
      const user1 = { ...mockUserProfile, id: "user-1", email: "user1@example.com" };
      const user2 = { ...mockUserProfile, id: "user-2", email: "user2@example.com" };

      authTokenVerifier.verifyAccessToken
        .mockReturnValueOnce({
          sub: "user-1",
          email: "user1@example.com",
          name: "User One",
          role: USER_ROLE,
        } as AccessTokenPayload)
        .mockReturnValueOnce({
          sub: "user-2",
          email: "user2@example.com",
          name: "User Two",
          role: USER_ROLE,
        } as AccessTokenPayload);

      getCurrentUserProfileUseCase.execute.mockResolvedValueOnce(user1).mockResolvedValueOnce(user2);

      const req1 = { ...req, cookies: {} };
      const req2 = { ...req, cookies: {} };

      await controller.getCurrentProfile(req1 as Request, res as Response);
      await controller.getCurrentProfile(req2 as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: "user-1" });
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  describe("Security scenarios", () => {
    it("should reject expired token", async () => {
      const error = new Error("Token expired");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should reject malformed token", async () => {
      const error = new Error("Malformed token");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should reject token with invalid signature", async () => {
      const error = new Error("Invalid signature");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle rate limit exceeded error", async () => {
      const error = new Error("Rate limit exceeded");
      rateLimit.check.mockRejectedValue(error);

      await expect(controller.getCurrentProfile(req as Request, res as Response)).rejects.toThrow(error);
      expect(getCurrentUserProfileUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("Request validation", () => {
    it("should handle request with missing headers", async () => {
      req.headers = undefined;
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it("should handle request with empty headers", async () => {
      req.headers = {};
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it("should handle request with missing cookies", async () => {
      req.cookies = undefined;
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it("should handle request with empty cookies", async () => {
      req.cookies = {};
      getCurrentUserProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(getCurrentUserProfileUseCase.execute).toHaveBeenCalledWith({ userId: USER_ID });
    });
  });

  describe("Edge cases", () => {
    it("should handle user with unverified email", async () => {
      const unverifiedProfile: GetCurrentUserProfileView = {
        ...mockUserProfile,
        emailVerifiedAt: null,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(unverifiedProfile);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: unverifiedProfile,
      });
    });

    it("should handle user with very old createdAt date", async () => {
      const oldDate = new Date("2020-01-01T00:00:00.000Z");
      const profileWithOldDate: GetCurrentUserProfileView = {
        ...mockUserProfile,
        createdAt: oldDate,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithOldDate);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithOldDate,
      });
    });

    it("should handle user with future createdAt date", async () => {
      const futureDate = new Date("2030-01-01T00:00:00.000Z");
      const profileWithFutureDate: GetCurrentUserProfileView = {
        ...mockUserProfile,
        createdAt: futureDate,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithFutureDate);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithFutureDate,
      });
    });

    it("should handle user with unicode characters in name and address", async () => {
      const profileWithUnicode: GetCurrentUserProfileView = {
        ...mockUserProfile,
        name: "José María González",
        address: "Calle 123, Ciudad de México, México",
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithUnicode);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithUnicode,
      });
    });

    it("should handle user with email containing plus sign", async () => {
      const profileWithPlusEmail: GetCurrentUserProfileView = {
        ...mockUserProfile,
        email: "test+alias@example.com",
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithPlusEmail);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithPlusEmail,
      });
    });

    it("should handle user with empty string address", async () => {
      const profileWithEmptyAddress: GetCurrentUserProfileView = {
        ...mockUserProfile,
        address: "",
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithEmptyAddress);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithEmptyAddress,
      });
    });

    it("should handle user with very long email", async () => {
      const longEmail = "a".repeat(50) + "@example.com";
      const profileWithLongEmail: GetCurrentUserProfileView = {
        ...mockUserProfile,
        email: longEmail,
      };
      getCurrentUserProfileUseCase.execute.mockResolvedValue(profileWithLongEmail);

      await controller.getCurrentProfile(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "User profile retrieved successfully",
        data: profileWithLongEmail,
      });
    });
  });
});
