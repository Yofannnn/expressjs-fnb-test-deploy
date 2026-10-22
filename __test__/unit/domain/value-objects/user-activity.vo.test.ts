import { UserActivityType } from "@/domain/types/user.type";
import { UserActivity } from "@/domain/value-objects/user-activity.vo";

describe("UserActivity", () => {
  const mockDate = new Date("2023-01-01T00:00:00Z");
  const mockMetadata = { key: "value", count: 42 };
  const baseData = {
    userId: "user123",
    action: UserActivityType.LOGGED_IN,
    description: "User logged in",
    userAgent: "Mozilla/5.0",
    ipAddress: "192.168.1.1",
    metadata: mockMetadata,
    occurredAt: mockDate,
  };

  describe("Constructor and Getters", () => {
    it("should create an instance with all properties", () => {
      const activity = new UserActivity(
        baseData.userId,
        baseData.action,
        baseData.description,
        baseData.userAgent,
        baseData.ipAddress,
        baseData.metadata,
        baseData.occurredAt,
      );

      expect(activity.getUserId()).toBe(baseData.userId);
      expect(activity.getAction()).toBe(baseData.action);
      expect(activity.getDescription()).toBe(baseData.description);
      expect(activity.getUserAgent()).toBe(baseData.userAgent);
      expect(activity.getIpAddress()).toBe(baseData.ipAddress);
      expect(activity.getMetadata()).toEqual(baseData.metadata);
      expect(activity.getOccurredAt()).toEqual(baseData.occurredAt);
    });

    it("should create an instance with null optional fields", () => {
      const activity = new UserActivity(baseData.userId, baseData.action, null, null, null, null, baseData.occurredAt);

      expect(activity.getDescription()).toBeNull();
      expect(activity.getUserAgent()).toBeNull();
      expect(activity.getIpAddress()).toBeNull();
      expect(activity.getMetadata()).toBeNull();
    });
  });

  describe("Static Create Method", () => {
    it("should create an instance with defaults", () => {
      const activity = UserActivity.create({
        userId: baseData.userId,
        action: baseData.action,
      });

      expect(activity.getUserId()).toBe(baseData.userId);
      expect(activity.getAction()).toBe(baseData.action);
      expect(activity.getDescription()).toBeNull();
      expect(activity.getUserAgent()).toBeNull();
      expect(activity.getIpAddress()).toBeNull();
      expect(activity.getMetadata()).toBeNull();
      expect(activity.getOccurredAt()).toBeInstanceOf(Date);
    });

    it("should create an instance with all provided fields", () => {
      const activity = UserActivity.create(baseData);

      expect(activity.getUserId()).toBe(baseData.userId);
      expect(activity.getAction()).toBe(baseData.action);
      expect(activity.getDescription()).toBe(baseData.description);
      expect(activity.getUserAgent()).toBe(baseData.userAgent);
      expect(activity.getIpAddress()).toBe(baseData.ipAddress);
      expect(activity.getMetadata()).toEqual(baseData.metadata);
      expect(activity.getOccurredAt()).toEqual(baseData.occurredAt);
    });
  });

  describe("Static Rebuild Method", () => {
    it("should rebuild an instance with all fields", () => {
      const activity = UserActivity.rebuild({
        userId: baseData.userId,
        action: baseData.action,
        description: baseData.description,
        userAgent: baseData.userAgent,
        ipAddress: baseData.ipAddress,
        metadata: baseData.metadata,
        occurredAt: baseData.occurredAt,
      });

      expect(activity.getUserId()).toBe(baseData.userId);
      expect(activity.getAction()).toBe(baseData.action);
      expect(activity.getDescription()).toBe(baseData.description);
      expect(activity.getUserAgent()).toBe(baseData.userAgent);
      expect(activity.getIpAddress()).toBe(baseData.ipAddress);
      expect(activity.getMetadata()).toEqual(baseData.metadata);
      expect(activity.getOccurredAt()).toEqual(baseData.occurredAt);
    });
  });

  describe("Category Checks", () => {
    const testCases = [
      {
        action: UserActivityType.LOGGED_IN,
        isSecurity: true,
        isAuth: true,
        isSuccess: true,
        isFailure: false,
      },
      {
        action: UserActivityType.PASSWORD_CHANGED,
        isSecurity: true,
        isAuth: false,
        isSuccess: true,
        isFailure: false,
      },
      {
        action: UserActivityType.PASSWORD_RESET,
        isSecurity: true,
        isAuth: false,
        isSuccess: false,
        isFailure: false,
      },
      {
        action: UserActivityType.ACCOUNT_LOCKED,
        isSecurity: true,
        isAuth: false,
        isSuccess: false,
        isFailure: true,
      },
      {
        action: UserActivityType.EMAIL_VERIFIED,
        isSecurity: true,
        isAuth: false,
        isSuccess: true,
        isFailure: false,
      },
      {
        action: UserActivityType.PROFILE_UPDATED,
        isSecurity: false,
        isAuth: false,
        isSuccess: true,
        isFailure: false,
      },
      {
        action: UserActivityType.LOGGED_OUT,
        isSecurity: false,
        isAuth: true,
        isSuccess: false,
        isFailure: false,
      },
      {
        action: UserActivityType.SESSION_REFRESHED,
        isSecurity: false,
        isAuth: true,
        isSuccess: false,
        isFailure: false,
      },
    ];

    testCases.forEach(({ action, isSecurity, isAuth, isSuccess, isFailure }) => {
      it(`should correctly categorize ${action}`, () => {
        const activity = UserActivity.create({
          userId: baseData.userId,
          action,
        });

        expect(activity.isSecurityRelated()).toBe(isSecurity);
        expect(activity.isAuthenticationRelated()).toBe(isAuth);
        expect(activity.isSuccessActivity()).toBe(isSuccess);
        expect(activity.isFailureActivity()).toBe(isFailure);
      });
    });
  });

  describe("Utility Methods", () => {
    it("should check for metadata presence", () => {
      const withMetadata = UserActivity.create({
        ...baseData,
        metadata: mockMetadata,
      });
      const withoutMetadata = UserActivity.create({
        ...baseData,
        metadata: undefined,
      });

      expect(withMetadata.hasMetadata()).toBe(true);
      expect(withoutMetadata.hasMetadata()).toBe(false);
    });

    it("should check for network info presence", () => {
      const withNetworkInfo = UserActivity.create({
        ...baseData,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
      });
      const partialNetworkInfo1 = UserActivity.create({
        ...baseData,
        userAgent: "test-agent",
        ipAddress: undefined,
      });
      const partialNetworkInfo2 = UserActivity.create({
        ...baseData,
        userAgent: undefined,
        ipAddress: "127.0.0.1",
      });
      const withoutNetworkInfo = UserActivity.create({
        ...baseData,
        userAgent: undefined,
        ipAddress: undefined,
      });

      expect(withNetworkInfo.hasNetworkInfo()).toBe(true);
      expect(partialNetworkInfo1.hasNetworkInfo()).toBe(true);
      expect(partialNetworkInfo2.hasNetworkInfo()).toBe(true);
      expect(withoutNetworkInfo.hasNetworkInfo()).toBe(false);
    });

    it("should check if activity occurred within time window", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const twoHoursAgo = new Date(now.getTime() - 7200000);

      const recentActivity = UserActivity.create({
        ...baseData,
        occurredAt: oneHourAgo,
      });
      const oldActivity = UserActivity.create({
        ...baseData,
        occurredAt: twoHoursAgo,
      });

      expect(recentActivity.occurredWithin(7200000)).toBe(true);
      expect(recentActivity.occurredWithin(1800000)).toBe(false);
      expect(oldActivity.occurredWithin(3600000)).toBe(false);
    });

    it("should check if activity occurred on specific date", () => {
      const activity = UserActivity.create({
        ...baseData,
        occurredAt: new Date("2023-01-01T12:34:56Z"),
      });

      const sameDate = new Date("2023-01-01T00:00:00Z");
      const differentDate = new Date("2023-01-02T00:00:00Z");

      expect(activity.occurredOnDate(sameDate)).toBe(true);
      expect(activity.occurredOnDate(differentDate)).toBe(false);
    });
  });

  describe("Equality Check", () => {
    it("should return true for equal activities", () => {
      const activity1 = UserActivity.create(baseData);
      const activity2 = UserActivity.create(baseData);

      expect(activity1.equals(activity2)).toBe(true);
    });

    it("should return false for different activities", () => {
      const activity1 = UserActivity.create(baseData);
      const activity2 = UserActivity.create({
        ...baseData,
        userId: "different-user",
      });
      const activity3 = UserActivity.create({
        ...baseData,
        action: UserActivityType.LOGGED_OUT,
      });
      const activity4 = UserActivity.create({
        ...baseData,
        description: "Different description",
      });
      const activity5 = UserActivity.create({
        ...baseData,
        userAgent: "Different agent",
      });
      const activity6 = UserActivity.create({
        ...baseData,
        ipAddress: "10.0.0.1",
      });
      const activity7 = UserActivity.create({
        ...baseData,
        metadata: { different: "metadata" },
      });
      const activity8 = UserActivity.create({
        ...baseData,
        occurredAt: new Date("2023-01-02T00:00:00Z"),
      });

      expect(activity1.equals(activity2)).toBe(false);
      expect(activity1.equals(activity3)).toBe(false);
      expect(activity1.equals(activity4)).toBe(false);
      expect(activity1.equals(activity5)).toBe(false);
      expect(activity1.equals(activity6)).toBe(false);
      expect(activity1.equals(activity7)).toBe(false);
      expect(activity1.equals(activity8)).toBe(false);
    });

    it("should handle metadata equality correctly", () => {
      const activity1 = UserActivity.create({
        ...baseData,
        metadata: { a: 1, b: 2 },
      });
      const activity2 = UserActivity.create({
        ...baseData,
        metadata: { a: 1, b: 2 },
      });
      const activity3 = UserActivity.create({
        ...baseData,
        metadata: { a: 1, b: 3 },
      });
      const activity4 = UserActivity.create({
        ...baseData,
        metadata: undefined,
      });

      expect(activity1.equals(activity2)).toBe(true);
      expect(activity1.equals(activity3)).toBe(false);
      expect(activity1.equals(activity4)).toBe(false);
      expect(activity4.equals(UserActivity.create({ ...baseData, metadata: undefined }))).toBe(true);
    });

    it("should return false when comparing with non-UserActivity object", () => {
      const activity = UserActivity.create(baseData);
      const notActivity = { ...baseData };

      expect(activity.equals(notActivity as unknown as UserActivity)).toBe(false);
    });
  });
});
