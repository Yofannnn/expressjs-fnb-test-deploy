import { GetCurrentUserProfileUseCase } from "@/application/use-cases/user/user-profile.use-case";
import { GetCurrentUserProfileCommand } from "@/application/ports/driving/get-current-user-profile.use-case";
import { AUTH_EXCEPTIONS } from "@/application/exceptions/auth.exceptions";
import { Logger } from "@/application/ports/driven/logger";
import { UserRepository } from "@/application/ports/driven/user.repository";
import { User } from "@/domain/entities/user.entity";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { UserCreationData } from "@/domain/types/user.interface";

describe("GetCurrentUserProfileUseCase", () => {
  let useCase: GetCurrentUserProfileUseCase;
  let mockUser: User;

  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockLogger: jest.Mocked<Logger> = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    fatal: jest.fn(),
  };

  const createTestUser = (overrides: Partial<UserCreationData> = {}): User => {
    const userData = {
      id: overrides.id || "123e4567-e89b-12d3-a456-426614174000",
      email: overrides.email || "test@example.com",
      hashedPassword: "hashed_password_123",
      name: overrides.name || "John Doe",
      address: overrides.address !== undefined ? overrides.address : "123 Main St, City, Country",
      role: overrides.role !== undefined ? overrides.role : UserRoleType.MEMBER,
    };

    return User.create(userData);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = createTestUser();
    mockUserRepository.findById.mockResolvedValue(mockUser);
    useCase = new GetCurrentUserProfileUseCase(mockUserRepository, mockLogger);
  });

  describe("execute", () => {
    const command: GetCurrentUserProfileCommand = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
    };

    it("should successfully fetch and return user profile", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockUser.getId(),
        name: mockUser.getName(),
        address: mockUser.getAddress(),
        email: mockUser.getEmail(),
        role: mockUser.getRole(),
        emailVerifiedAt: mockUser.getEmailVerifiedAt(),
        createdAt: mockUser.getCreatedAt(),
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(command.userId);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);
    });

    it("should throw USER_NOT_FOUND exception when user does not exist", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(AUTH_EXCEPTIONS.USER_NOT_FOUND());
      expect(mockUserRepository.findById).toHaveBeenCalledWith(command.userId);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log debug message when starting to fetch user profile", async () => {
      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetCurrentUserProfileUseCase",
        event: "USER_PROFILE_FETCH_STARTED",
        message: "Fetching profile for user started",
        data: { userId: command.userId },
      });
    });

    it("should log info message when user profile is fetched successfully", async () => {
      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetCurrentUserProfileUseCase",
        event: "USER_PROFILE_FETCH_SUCCESSFUL",
        message: "User profile fetched successfully",
        userId: mockUser.getId(),
        durationMs: expect.any(Number),
        data: {
          role: mockUser.getRole(),
        },
      });
    });

    it("should handle repository errors gracefully", async () => {
      const error = new Error("Database connection failed");
      mockUserRepository.findById.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toThrow(error);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle null address correctly in response", async () => {
      const userWithoutAddress = createTestUser({ address: null as unknown as undefined });
      mockUserRepository.findById.mockResolvedValue(userWithoutAddress);

      const result = await useCase.execute(command);

      expect(result.address).toBeNull();
      expect(result).toEqual({
        id: userWithoutAddress.getId(),
        name: userWithoutAddress.getName(),
        address: null,
        email: userWithoutAddress.getEmail(),
        role: userWithoutAddress.getRole(),
        emailVerifiedAt: userWithoutAddress.getEmailVerifiedAt(),
        createdAt: userWithoutAddress.getCreatedAt(),
      });
    });

    it("should handle admin role correctly", async () => {
      const adminUser = createTestUser({ role: UserRoleType.ADMIN });
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const result = await useCase.execute(command);

      expect(result.role).toBe(UserRoleType.ADMIN);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: UserRoleType.ADMIN },
        }),
      );
    });

    it("should handle email verified status correctly", async () => {
      const verifiedUser = createTestUser();
      verifiedUser.verifyEmail();
      mockUserRepository.findById.mockResolvedValue(verifiedUser);

      const result = await useCase.execute(command);

      expect(result.emailVerifiedAt).toBeInstanceOf(Date);
      expect(result.emailVerifiedAt?.toISOString()).toBe(verifiedUser.getEmailVerifiedAt()?.toISOString());
    });

    it("should handle unverified email correctly", async () => {
      const unverifiedUser = createTestUser();
      mockUserRepository.findById.mockResolvedValue(unverifiedUser);

      const result = await useCase.execute(command);

      expect(result.emailVerifiedAt).toBeNull();
    });

    it("should measure and log execution duration", async () => {
      const startTime = Date.now();
      jest.spyOn(Date, "now").mockReturnValueOnce(startTime);
      jest.spyOn(Date, "now").mockReturnValueOnce(startTime + 150);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );
    });

    it("should handle different user names correctly", async () => {
      const userWithLongName = createTestUser({ name: "John Michael Doe" });
      mockUserRepository.findById.mockResolvedValue(userWithLongName);

      const result = await useCase.execute(command);

      expect(result.name).toBe("John Michael Doe");
    });

    it("should handle user with special characters in name", async () => {
      const userWithSpecialChars = createTestUser({ name: "Jöhn-Döe" });
      mockUserRepository.findById.mockResolvedValue(userWithSpecialChars);

      const result = await useCase.execute(command);

      expect(result.name).toBe("Jöhn-Döe");
    });

    it("should preserve createdAt timestamp exactly", async () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const userWithSpecificCreatedAt = createTestUser();
      Object.defineProperty(userWithSpecificCreatedAt, "createdAt", {
        value: createdAt,
        writable: false,
      });
      mockUserRepository.findById.mockResolvedValue(userWithSpecificCreatedAt);

      const result = await useCase.execute(command);

      expect(result.createdAt).toEqual(createdAt);
    });

    it("should not include sensitive data in logs", async () => {
      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: mockUser.getRole() },
        }),
      );
      const loggedInfo = (mockLogger.info as jest.Mock).mock.calls[0][0];
      expect(loggedInfo.data).not.toHaveProperty("email");
      expect(loggedInfo.data).not.toHaveProperty("address");
      expect(loggedInfo.data).not.toHaveProperty("name");
    });

    it("should handle user with empty string address", async () => {
      const userWithEmptyAddress = createTestUser({ address: "" });
      mockUserRepository.findById.mockResolvedValue(userWithEmptyAddress);

      const result = await useCase.execute(command);

      expect(result.address).toBe(null);
    });

    it("should handle multiple concurrent executions correctly", async () => {
      const userId1 = "user1";
      const userId2 = "user2";
      const user1 = createTestUser({ id: userId1, name: "User One" });
      const user2 = createTestUser({ id: userId2, name: "User Two" });

      mockUserRepository.findById.mockResolvedValueOnce(user1).mockResolvedValueOnce(user2);

      const [result1, result2] = await Promise.all([useCase.execute({ userId: userId1 }), useCase.execute({ userId: userId2 })]);

      expect(result1.id).toBe(userId1);
      expect(result2.id).toBe(userId2);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it("should handle user with very long address", async () => {
      const longAddress = "123 Main Street, Apartment 4B, New York City, New York, United States, 10001".repeat(5);
      const userWithLongAddress = createTestUser({ address: longAddress });
      mockUserRepository.findById.mockResolvedValue(userWithLongAddress);

      const result = await useCase.execute(command);

      expect(result.address).toBe(longAddress);
    });

    it("should throw USER_NOT_FOUND with correct message", async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      const expectedError = AUTH_EXCEPTIONS.USER_NOT_FOUND();

      try {
        await useCase.execute(command);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toEqual(expectedError);
        expect((error as Error).message).toBe(expectedError.message);
      }
    });

    it("should handle repository throwing non-standard error", async () => {
      const customError = new Error("Custom database error");
      mockUserRepository.findById.mockRejectedValue(customError);

      await expect(useCase.execute(command)).rejects.toThrow("Custom database error");
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("toResponseDto", () => {
    it("should correctly map all user properties to view model", async () => {
      const testUser = createTestUser();
      mockUserRepository.findById.mockResolvedValue(testUser);

      const result = await useCase.execute({ userId: testUser.getId() });

      expect(result).toEqual({
        id: testUser.getId(),
        name: testUser.getName(),
        address: testUser.getAddress(),
        email: testUser.getEmail(),
        role: testUser.getRole(),
        emailVerifiedAt: testUser.getEmailVerifiedAt(),
        createdAt: testUser.getCreatedAt(),
      });
    });

    it("should convert internal values to correct types", async () => {
      const testUser = createTestUser();
      mockUserRepository.findById.mockResolvedValue(testUser);

      const result = await useCase.execute({ userId: testUser.getId() });

      expect(typeof result.id).toBe("string");
      expect(typeof result.name).toBe("string");
      expect(typeof result.email).toBe("string");
      expect(result.role).toBe(UserRoleType.MEMBER);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Logging", () => {
    it("should log start and end for successful execution", async () => {
      await useCase.execute({ userId: "test-id" });

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should only log start for failed execution", async () => {
      mockUserRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute({ userId: "test-id" })).rejects.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should include correct context in all log entries", async () => {
      await useCase.execute({ userId: "test-id" });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetCurrentUserProfileUseCase",
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetCurrentUserProfileUseCase",
        }),
      );
    });

    it("should include correct event names in logs", async () => {
      await useCase.execute({ userId: "test-id" });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "USER_PROFILE_FETCH_STARTED",
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "USER_PROFILE_FETCH_SUCCESSFUL",
        }),
      );
    });
  });

  describe("Error scenarios", () => {
    it("should propagate repository errors without catching", async () => {
      const dbError = new Error("Connection timeout");
      mockUserRepository.findById.mockRejectedValue(dbError);

      await expect(useCase.execute({ userId: "test-id" })).rejects.toThrow(dbError);
    });

    it("should handle null userId by treating as string", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({ userId: null as unknown as string });

      expect(result).toBeDefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(null);
    });

    it("should handle undefined userId by treating as string", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({ userId: undefined as unknown as string });

      expect(result).toBeDefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(undefined);
    });

    it("should handle empty string userId", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute({ userId: "" })).rejects.toThrow(AUTH_EXCEPTIONS.USER_NOT_FOUND());
      expect(mockUserRepository.findById).toHaveBeenCalledWith("");
    });

    it("should handle user with default role when role is null", async () => {
      const userWithNullRole = createTestUser();
      Object.defineProperty(userWithNullRole, "role", {
        value: null,
        writable: false,
      });
      mockUserRepository.findById.mockResolvedValue(userWithNullRole);

      const result = await useCase.execute({ userId: "test-id" });

      expect(result.role).toBeNull();
    });
  });

  describe("Performance", () => {
    it("should execute within reasonable time", async () => {
      const startTime = Date.now();

      await useCase.execute({ userId: "test-id" });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("should not make multiple database calls", async () => {
      await useCase.execute({ userId: "test-id" });

      expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with unicode characters in all fields", async () => {
      const unicodeUser = createTestUser({
        name: "José María García",
        address: "Calle 123, Madrid, España",
        email: "jose@example.com",
      });
      mockUserRepository.findById.mockResolvedValue(unicodeUser);

      const result = await useCase.execute({ userId: "test-id" });

      expect(result.name).toBe("José María García");
      expect(result.address).toBe("Calle 123, Madrid, España");
      expect(result.email).toBe("jose@example.com");
    });

    it("should handle user with moderately long fields", async () => {
      const moderatelyLongName = "John".repeat(30);
      const moderatelyLongAddress = "Address ".repeat(50);

      const userWithLongFields = createTestUser({
        name: moderatelyLongName,
        address: moderatelyLongAddress,
      });
      mockUserRepository.findById.mockResolvedValue(userWithLongFields);

      const result = await useCase.execute({ userId: "test-id" });

      expect(result.name).toBe(moderatelyLongName);
      expect(result.address).toBe(moderatelyLongAddress);
    });
  });
});
