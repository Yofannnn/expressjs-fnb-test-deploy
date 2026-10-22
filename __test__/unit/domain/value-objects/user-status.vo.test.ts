import { UserStatus } from "@/domain/value-objects/user-status.vo";
import { UserStatusType } from "@/domain/types/user.type";
import { ActionReasonRequiredException, InvalidStatusTransitionException } from "@/domain/exceptions/user.exceptions";

describe("UserStatus", () => {
  describe("Constructor", () => {
    it("should create with all properties", () => {
      const suspendReason = "Violation of terms";
      const bannedReason = "Serious violation";
      const suspendedAt = new Date("2023-01-01");
      const bannedAt = new Date("2023-02-01");

      const status = new UserStatus(UserStatusType.SUSPENDED, suspendReason, bannedReason, suspendedAt, bannedAt);

      expect(status.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(status.getSuspendReason()).toBe(suspendReason);
      expect(status.getBannedReason()).toBe(bannedReason);
      expect(status.getSuspendedAt()).toEqual(suspendedAt);
      expect(status.getBannedAt()).toEqual(bannedAt);
    });

    it("should create with null values for optional fields", () => {
      const status = new UserStatus(UserStatusType.ACTIVE, null, null, null, null);

      expect(status.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(status.getSuspendReason()).toBeNull();
      expect(status.getBannedReason()).toBeNull();
      expect(status.getSuspendedAt()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
    });

    it("should create with some null values", () => {
      const suspendedAt = new Date("2023-01-01");
      const status = new UserStatus(UserStatusType.SUSPENDED, "Suspended", null, suspendedAt, null);

      expect(status.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(status.getSuspendReason()).toBe("Suspended");
      expect(status.getBannedReason()).toBeNull();
      expect(status.getSuspendedAt()).toEqual(suspendedAt);
      expect(status.getBannedAt()).toBeNull();
    });
  });

  describe("create static factory", () => {
    it("should create ACTIVE status", () => {
      const status = UserStatus.create();

      expect(status.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(status.getSuspendReason()).toBeNull();
      expect(status.getBannedReason()).toBeNull();
      expect(status.getSuspendedAt()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
      expect(status.isActive()).toBe(true);
    });
  });

  describe("suspend", () => {
    it("should suspend an active user", () => {
      const activeStatus = UserStatus.create();
      const reason = "Suspension reason";

      const suspendedStatus = activeStatus.suspend(reason);

      expect(suspendedStatus.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(suspendedStatus.getSuspendReason()).toBe(reason);
      expect(suspendedStatus.getSuspendedAt()).toBeInstanceOf(Date);
      expect(suspendedStatus.getBannedReason()).toBeNull();
      expect(suspendedStatus.getBannedAt()).toBeNull();
      expect(suspendedStatus.isSuspended()).toBe(true);
    });

    it("should suspend an inactive user", () => {
      const inactiveStatus = UserStatus.create().deactivate();
      const reason = "Suspension reason";

      const suspendedStatus = inactiveStatus.suspend(reason);

      expect(suspendedStatus.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(suspendedStatus.getSuspendReason()).toBe(reason);
      expect(suspendedStatus.getSuspendedAt()).toBeInstanceOf(Date);
      expect(suspendedStatus.isSuspended()).toBe(true);
    });

    it("should suspend a suspended user (change reason)", () => {
      const suspendedStatus = UserStatus.create().suspend("Old reason");
      const newReason = "New suspension reason";

      const updatedSuspendedStatus = suspendedStatus.suspend(newReason);

      expect(updatedSuspendedStatus.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(updatedSuspendedStatus.getSuspendReason()).toBe(newReason);
      expect(updatedSuspendedStatus.getSuspendedAt()).toBeInstanceOf(Date);
      expect(updatedSuspendedStatus.isSuspended()).toBe(true);
    });

    it("should throw ActionReasonRequiredException when reason is empty", () => {
      const activeStatus = UserStatus.create();

      expect(() => activeStatus.suspend("")).toThrow(ActionReasonRequiredException);
      expect(() => activeStatus.suspend("   ")).toThrow(ActionReasonRequiredException);
      expect(() => activeStatus.suspend(" \n ")).toThrow(ActionReasonRequiredException);
    });

    it("should throw InvalidStatusTransitionException when trying to suspend a banned user", () => {
      const bannedStatus = UserStatus.create().ban("Ban reason");

      expect(() => bannedStatus.suspend("Suspension reason")).toThrow(InvalidStatusTransitionException);
    });

    it("should include details in exception when trying to suspend banned user", () => {
      const banReason = "Serious violation";
      const bannedStatus = UserStatus.create().ban(banReason);
      const suspendReason = "Trying to suspend";

      try {
        bannedStatus.suspend(suspendReason);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionException);
        if (error instanceof InvalidStatusTransitionException) {
          const details = error.details;
          expect(details).toMatchObject({
            suspendReason: suspendReason,
            bannedReason: banReason,
          });
        }
      }
    });
  });

  describe("ban", () => {
    it("should ban an active user", () => {
      const activeStatus = UserStatus.create();
      const reason = "Ban reason";

      const bannedStatus = activeStatus.ban(reason);

      expect(bannedStatus.getStatus()).toBe(UserStatusType.BANNED);
      expect(bannedStatus.getBannedReason()).toBe(reason);
      expect(bannedStatus.getBannedAt()).toBeInstanceOf(Date);
      expect(bannedStatus.getSuspendReason()).toBeNull();
      expect(bannedStatus.getSuspendedAt()).toBeNull();
      expect(bannedStatus.isBanned()).toBe(true);
    });

    it("should ban a suspended user", () => {
      const suspendedStatus = UserStatus.create().suspend("Previous suspension");
      const reason = "Ban reason";

      const bannedStatus = suspendedStatus.ban(reason);

      expect(bannedStatus.getStatus()).toBe(UserStatusType.BANNED);
      expect(bannedStatus.getBannedReason()).toBe(reason);
      expect(bannedStatus.getBannedAt()).toBeInstanceOf(Date);
      expect(bannedStatus.getSuspendReason()).toBeNull();
      expect(bannedStatus.getSuspendedAt()).toBeNull();
      expect(bannedStatus.isBanned()).toBe(true);
    });

    it("should ban an inactive user", () => {
      const inactiveStatus = UserStatus.create().deactivate();
      const reason = "Ban reason";

      const bannedStatus = inactiveStatus.ban(reason);

      expect(bannedStatus.getStatus()).toBe(UserStatusType.BANNED);
      expect(bannedStatus.getBannedReason()).toBe(reason);
      expect(bannedStatus.getBannedAt()).toBeInstanceOf(Date);
      expect(bannedStatus.isBanned()).toBe(true);
    });

    it("should ban a banned user (change reason)", () => {
      const bannedStatus = UserStatus.create().ban("Old reason");
      const newReason = "New ban reason";

      const updatedBannedStatus = bannedStatus.ban(newReason);

      expect(updatedBannedStatus.getStatus()).toBe(UserStatusType.BANNED);
      expect(updatedBannedStatus.getBannedReason()).toBe(newReason);
      expect(updatedBannedStatus.getBannedAt()).toBeInstanceOf(Date);
      expect(updatedBannedStatus.isBanned()).toBe(true);
    });

    it("should throw ActionReasonRequiredException when reason is empty", () => {
      const activeStatus = UserStatus.create();

      expect(() => activeStatus.ban("")).toThrow(ActionReasonRequiredException);
      expect(() => activeStatus.ban("   ")).toThrow(ActionReasonRequiredException);
      expect(() => activeStatus.ban(" \n ")).toThrow(ActionReasonRequiredException);
    });
  });

  describe("deactivate", () => {
    it("should deactivate an active user", () => {
      const activeStatus = UserStatus.create();

      const deactivatedStatus = activeStatus.deactivate();

      expect(deactivatedStatus.getStatus()).toBe(UserStatusType.INACTIVE);
      expect(deactivatedStatus.isInactive()).toBe(true);
      expect(deactivatedStatus.getSuspendReason()).toBeNull();
      expect(deactivatedStatus.getBannedReason()).toBeNull();
      expect(deactivatedStatus.getSuspendedAt()).toBeNull();
      expect(deactivatedStatus.getBannedAt()).toBeNull();
    });

    it("should deactivate a suspended user", () => {
      const suspendedStatus = UserStatus.create().suspend("Suspension reason");

      const deactivatedStatus = suspendedStatus.deactivate();

      expect(deactivatedStatus.getStatus()).toBe(UserStatusType.INACTIVE);
      expect(deactivatedStatus.isInactive()).toBe(true);
      expect(deactivatedStatus.getSuspendReason()).toBe("Suspension reason");
      expect(deactivatedStatus.getBannedReason()).toBeNull();
      expect(deactivatedStatus.getSuspendedAt()).toBeInstanceOf(Date);
      expect(deactivatedStatus.getBannedAt()).toBeNull();
    });

    it("should deactivate an inactive user (idempotent)", () => {
      const inactiveStatus = UserStatus.create().deactivate();

      const stillInactiveStatus = inactiveStatus.deactivate();

      expect(stillInactiveStatus.getStatus()).toBe(UserStatusType.INACTIVE);
      expect(stillInactiveStatus.isInactive()).toBe(true);
    });

    it("should throw InvalidStatusTransitionException when trying to deactivate a banned user", () => {
      const bannedStatus = UserStatus.create().ban("Ban reason");

      expect(() => bannedStatus.deactivate()).toThrow(InvalidStatusTransitionException);
    });

    it("should include details in exception when trying to deactivate banned user", () => {
      const banReason = "Serious violation";
      const bannedStatus = UserStatus.create().ban(banReason);

      try {
        bannedStatus.deactivate();
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionException);
        if (error instanceof InvalidStatusTransitionException) {
          const details = error.details;
          expect(details).toMatchObject({
            bannedReason: banReason,
          });
        }
      }
    });
  });

  describe("activate", () => {
    it("should activate an inactive user", () => {
      const inactiveStatus = UserStatus.create().deactivate();

      const activatedStatus = inactiveStatus.activate();

      expect(activatedStatus.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(activatedStatus.isActive()).toBe(true);
      expect(activatedStatus.getSuspendReason()).toBeNull();
      expect(activatedStatus.getBannedReason()).toBeNull();
      expect(activatedStatus.getSuspendedAt()).toBeNull();
      expect(activatedStatus.getBannedAt()).toBeNull();
    });

    it("should activate a suspended user", () => {
      const suspendedStatus = UserStatus.create().suspend("Suspension reason");

      const activatedStatus = suspendedStatus.activate();

      expect(activatedStatus.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(activatedStatus.isActive()).toBe(true);
      expect(activatedStatus.getSuspendReason()).toBeNull();
      expect(activatedStatus.getBannedReason()).toBeNull();
      expect(activatedStatus.getSuspendedAt()).toBeNull();
      expect(activatedStatus.getBannedAt()).toBeNull();
    });

    it("should activate an active user (idempotent)", () => {
      const activeStatus = UserStatus.create();

      const stillActiveStatus = activeStatus.activate();

      expect(stillActiveStatus.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(stillActiveStatus.isActive()).toBe(true);
    });

    it("should not activate a banned user (canBeActivated returns false)", () => {
      const bannedStatus = UserStatus.create().ban("Ban reason");
      const activatedStatus = bannedStatus.activate();

      expect(activatedStatus.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(activatedStatus.isActive()).toBe(true);
      expect(activatedStatus.getSuspendReason()).toBeNull();
      expect(activatedStatus.getBannedReason()).toBeNull();
      expect(activatedStatus.getSuspendedAt()).toBeNull();
      expect(activatedStatus.getBannedAt()).toBeNull();
    });
  });

  describe("Status check methods", () => {
    it("isActive should return true for ACTIVE status", () => {
      const status = UserStatus.create();
      expect(status.isActive()).toBe(true);
      expect(status.isSuspended()).toBe(false);
      expect(status.isBanned()).toBe(false);
      expect(status.isInactive()).toBe(false);
    });

    it("isSuspended should return true for SUSPENDED status", () => {
      const status = UserStatus.create().suspend("reason");
      expect(status.isActive()).toBe(false);
      expect(status.isSuspended()).toBe(true);
      expect(status.isBanned()).toBe(false);
      expect(status.isInactive()).toBe(false);
    });

    it("isBanned should return true for BANNED status", () => {
      const status = UserStatus.create().ban("reason");
      expect(status.isActive()).toBe(false);
      expect(status.isSuspended()).toBe(false);
      expect(status.isBanned()).toBe(true);
      expect(status.isInactive()).toBe(false);
    });

    it("isInactive should return true for INACTIVE status", () => {
      const status = UserStatus.create().deactivate();
      expect(status.isActive()).toBe(false);
      expect(status.isSuspended()).toBe(false);
      expect(status.isBanned()).toBe(false);
      expect(status.isInactive()).toBe(true);
    });
  });

  describe("canBeActivated", () => {
    it("should return true for active user", () => {
      const status = UserStatus.create();
      expect(status.canBeActivated()).toBe(true);
    });

    it("should return true for suspended user", () => {
      const status = UserStatus.create().suspend("reason");
      expect(status.canBeActivated()).toBe(true);
    });

    it("should return true for inactive user", () => {
      const status = UserStatus.create().deactivate();
      expect(status.canBeActivated()).toBe(true);
    });

    it("should return false for banned user", () => {
      const status = UserStatus.create().ban("reason");
      expect(status.canBeActivated()).toBe(false);
    });
  });

  describe("Getter methods", () => {
    it("should return copies of Date objects", () => {
      const suspendedAt = new Date("2023-01-01");
      const bannedAt = new Date("2023-02-01");
      const status = new UserStatus(UserStatusType.SUSPENDED, "reason", "ban reason", suspendedAt, bannedAt);

      const retrievedSuspendedAt = status.getSuspendedAt();
      const retrievedBannedAt = status.getBannedAt();

      expect(retrievedSuspendedAt).toEqual(suspendedAt);
      expect(retrievedSuspendedAt).not.toBe(suspendedAt);
      expect(retrievedBannedAt).toEqual(bannedAt);
      expect(retrievedBannedAt).not.toBe(bannedAt);
    });

    it("should return null for dates when not set", () => {
      const status = UserStatus.create();

      expect(status.getSuspendedAt()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
    });

    it("should return correct status type", () => {
      const activeStatus = UserStatus.create();
      expect(activeStatus.getStatus()).toBe(UserStatusType.ACTIVE);

      const suspendedStatus = activeStatus.suspend("reason");
      expect(suspendedStatus.getStatus()).toBe(UserStatusType.SUSPENDED);

      const bannedStatus = suspendedStatus.ban("reason");
      expect(bannedStatus.getStatus()).toBe(UserStatusType.BANNED);

      const inactiveStatus = activeStatus.deactivate();
      expect(inactiveStatus.getStatus()).toBe(UserStatusType.INACTIVE);
    });

    it("should return suspend reason correctly", () => {
      const reason = "Test suspension";
      const status = UserStatus.create().suspend(reason);
      expect(status.getSuspendReason()).toBe(reason);
    });

    it("should return banned reason correctly", () => {
      const reason = "Test ban";
      const status = UserStatus.create().ban(reason);
      expect(status.getBannedReason()).toBe(reason);
    });
  });

  describe("equals", () => {
    it("should return true for equal objects", () => {
      const suspendedAt = new Date("2023-01-01");
      const bannedAt = new Date("2023-02-01");
      const status1 = new UserStatus(UserStatusType.SUSPENDED, "reason", "ban reason", suspendedAt, bannedAt);
      const status2 = new UserStatus(UserStatusType.SUSPENDED, "reason", "ban reason", new Date(suspendedAt), new Date(bannedAt));

      expect(status1.equals(status2)).toBe(true);
    });

    it("should return true for same status with null values", () => {
      const status1 = UserStatus.create();
      const status2 = UserStatus.create();

      expect(status1.equals(status2)).toBe(true);
    });

    it("should return false for different status", () => {
      const status1 = UserStatus.create();
      const status2 = UserStatus.create().suspend("reason");

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false for different suspend reasons", () => {
      const status1 = UserStatus.create().suspend("reason1");
      const status2 = UserStatus.create().suspend("reason2");

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false for different banned reasons", () => {
      const status1 = UserStatus.create().ban("reason1");
      const status2 = UserStatus.create().ban("reason2");

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false for different suspendedAt dates", () => {
      const status1 = new UserStatus(UserStatusType.SUSPENDED, "reason", null, new Date("2023-01-01"), null);
      const status2 = new UserStatus(UserStatusType.SUSPENDED, "reason", null, new Date("2023-01-02"), null);

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false when one suspendedAt is null and other is not", () => {
      const status1 = new UserStatus(UserStatusType.SUSPENDED, "reason", null, null, null);
      const status2 = new UserStatus(UserStatusType.SUSPENDED, "reason", null, new Date(), null);

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false when one bannedAt is null and other is not", () => {
      const status1 = new UserStatus(UserStatusType.BANNED, null, "reason", null, null);
      const status2 = new UserStatus(UserStatusType.BANNED, null, "reason", null, new Date());

      expect(status1.equals(status2)).toBe(false);
    });

    it("should return false for different objects with same values but different reference", () => {
      const status1 = new UserStatus(UserStatusType.ACTIVE, null, null, null, null);
      const status2 = new UserStatus(UserStatusType.ACTIVE, null, null, null, null);

      expect(status1.equals(status2)).toBe(true);
    });
  });

  describe("rebuild static factory", () => {
    it("should rebuild with all data", () => {
      const rebuildData = {
        status: UserStatusType.SUSPENDED,
        suspendReason: "Rebuild suspend reason",
        bannedReason: "Rebuild ban reason",
        suspendedAt: new Date("2023-01-01"),
        bannedAt: new Date("2023-02-01"),
      };

      const status = UserStatus.rebuild(rebuildData);

      expect(status.getStatus()).toBe(rebuildData.status);
      expect(status.getSuspendReason()).toBe(rebuildData.suspendReason);
      expect(status.getBannedReason()).toBe(rebuildData.bannedReason);
      expect(status.getSuspendedAt()).toEqual(rebuildData.suspendedAt);
      expect(status.getBannedAt()).toEqual(rebuildData.bannedAt);
    });

    it("should rebuild with null values", () => {
      const rebuildData = {
        status: UserStatusType.ACTIVE,
        suspendReason: null,
        bannedReason: null,
        suspendedAt: null,
        bannedAt: null,
      };

      const status = UserStatus.rebuild(rebuildData);

      expect(status.getStatus()).toBe(UserStatusType.ACTIVE);
      expect(status.getSuspendReason()).toBeNull();
      expect(status.getBannedReason()).toBeNull();
      expect(status.getSuspendedAt()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
    });

    it("should rebuild with only suspend data", () => {
      const rebuildData = {
        status: UserStatusType.SUSPENDED,
        suspendReason: "Suspended",
        bannedReason: null,
        suspendedAt: new Date("2023-01-01"),
        bannedAt: null,
      };

      const status = UserStatus.rebuild(rebuildData);

      expect(status.getStatus()).toBe(UserStatusType.SUSPENDED);
      expect(status.getSuspendReason()).toBe("Suspended");
      expect(status.getBannedReason()).toBeNull();
      expect(status.getSuspendedAt()).toEqual(rebuildData.suspendedAt);
      expect(status.getBannedAt()).toBeNull();
    });

    it("should rebuild with only ban data", () => {
      const rebuildData = {
        status: UserStatusType.BANNED,
        suspendReason: null,
        bannedReason: "Banned",
        suspendedAt: null,
        bannedAt: new Date("2023-02-01"),
      };

      const status = UserStatus.rebuild(rebuildData);

      expect(status.getStatus()).toBe(UserStatusType.BANNED);
      expect(status.getSuspendReason()).toBeNull();
      expect(status.getBannedReason()).toBe("Banned");
      expect(status.getSuspendedAt()).toBeNull();
      expect(status.getBannedAt()).toEqual(rebuildData.bannedAt);
    });
  });

  describe("State transition scenarios", () => {
    it("should allow full state lifecycle: ACTIVE → SUSPENDED → INACTIVE → ACTIVE", () => {
      let status = UserStatus.create();
      expect(status.isActive()).toBe(true);

      status = status.suspend("Violation");
      expect(status.isSuspended()).toBe(true);

      status = status.deactivate();
      expect(status.isInactive()).toBe(true);

      status = status.activate();
      expect(status.isActive()).toBe(true);
    });

    it("should allow full state lifecycle: ACTIVE → BANNED", () => {
      let status = UserStatus.create();
      expect(status.isActive()).toBe(true);

      status = status.ban("Serious violation");
      expect(status.isBanned()).toBe(true);
    });

    it("should allow full state lifecycle: ACTIVE → INACTIVE → BANNED", () => {
      let status = UserStatus.create();
      expect(status.isActive()).toBe(true);

      status = status.deactivate();
      expect(status.isInactive()).toBe(true);

      status = status.ban("Violation");
      expect(status.isBanned()).toBe(true);
    });

    it("should allow full state lifecycle: ACTIVE → SUSPENDED → BANNED", () => {
      let status = UserStatus.create();
      expect(status.isActive()).toBe(true);

      status = status.suspend("Warning");
      expect(status.isSuspended()).toBe(true);

      status = status.ban("Escalation");
      expect(status.isBanned()).toBe(true);
    });

    it("should allow full state lifecycle: BANNED → ACTIVE (forced activation)", () => {
      let status = UserStatus.create().ban("Violation");
      expect(status.isBanned()).toBe(true);

      status = status.activate();
      expect(status.isActive()).toBe(true);
      expect(status.getBannedReason()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
    });

    it("should not allow SUSPENDED → BANNED → SUSPENDED", () => {
      let status = UserStatus.create().suspend("Warning");
      expect(status.isSuspended()).toBe(true);

      status = status.ban("Escalation");
      expect(status.isBanned()).toBe(true);

      expect(() => status.suspend("New suspension")).toThrow(InvalidStatusTransitionException);
    });

    it("should preserve suspension reason when deactivating", () => {
      const reason = "Test suspension";
      const status = UserStatus.create().suspend(reason).deactivate();

      expect(status.getSuspendReason()).toBe(reason);
      expect(status.getSuspendedAt()).toBeInstanceOf(Date);
    });

    it("should preserve ban reason when activating from banned", () => {
      const reason = "Test ban";
      const status = UserStatus.create().ban(reason).activate();

      expect(status.getBannedReason()).toBeNull();
      expect(status.getBannedAt()).toBeNull();
    });

    it("should update suspend reason when re-suspending", () => {
      const status = UserStatus.create().suspend("Old reason").suspend("New reason");

      expect(status.getSuspendReason()).toBe("New reason");
    });

    it("should update ban reason when re-banning", () => {
      const status = UserStatus.create().ban("Old reason").ban("New reason");

      expect(status.getBannedReason()).toBe("New reason");
    });
  });

  describe("Edge cases", () => {
    it("should handle very long reason strings", () => {
      const longReason = "a".repeat(10000);
      const status = UserStatus.create().suspend(longReason);
      expect(status.getSuspendReason()).toBe(longReason);
    });

    it("should handle reason with special characters", () => {
      const reason = "Violation!@#$%^&*()";
      const status = UserStatus.create().suspend(reason);
      expect(status.getSuspendReason()).toBe(reason);
    });

    it("should handle reason with unicode characters", () => {
      const reason = "🚀 Violation 🎉";
      const status = UserStatus.create().suspend(reason);
      expect(status.getSuspendReason()).toBe(reason);
    });

    it("should handle reason with newlines and tabs", () => {
      const reason = "Violation\nwith\tmultiple lines";
      const status = UserStatus.create().suspend(reason);
      expect(status.getSuspendReason()).toBe(reason);
    });

    it("should preserve immutability - operations return new instances", () => {
      const original = UserStatus.create();
      const suspended = original.suspend("reason");

      expect(original).not.toBe(suspended);
      expect(original.isActive()).toBe(true);
      expect(suspended.isSuspended()).toBe(true);
    });
  });

  describe("Error scenarios", () => {
    it("should throw ActionReasonRequiredException with correct message for suspend", () => {
      const status = UserStatus.create();

      try {
        status.suspend("");
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ActionReasonRequiredException);
        expect((error as ActionReasonRequiredException).message).toBe("A valid reason is required to suspend the user.");
      }
    });

    it("should throw ActionReasonRequiredException with correct message for ban", () => {
      const status = UserStatus.create();

      try {
        status.ban("");
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ActionReasonRequiredException);
        expect((error as ActionReasonRequiredException).message).toBe("A valid reason is required to ban the user.");
      }
    });

    it("should throw InvalidStatusTransitionException with correct details for suspend on banned", () => {
      const bannedStatus = UserStatus.create().ban("Ban reason");

      try {
        bannedStatus.suspend("Suspend reason");
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionException);
        const details = (error as InvalidStatusTransitionException).details;
        expect(details).toMatchObject({
          suspendReason: "Suspend reason",
          bannedReason: "Ban reason",
        });
      }
    });

    it("should throw InvalidStatusTransitionException with correct details for deactivate on banned", () => {
      const bannedStatus = UserStatus.create().ban("Ban reason");

      try {
        bannedStatus.deactivate();
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionException);
        const details = (error as InvalidStatusTransitionException).details;
        expect(details).toMatchObject({
          bannedReason: "Ban reason",
        });
      }
    });
  });
});
