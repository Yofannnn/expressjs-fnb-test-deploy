import { UserAccessControlService } from "@/domain/services/user-access-control.service";
import { User } from "@/domain/entities/user.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { ActionNotAuthorizedException } from "@/domain/exceptions/user.exceptions";

describe("UserAccessControlService", () => {
  let mockAdminUser: jest.Mocked<User>;
  let mockMemberUser: jest.Mocked<User>;
  let mockManagerUser: jest.Mocked<User>;
  let mockCashierUser: jest.Mocked<User>;
  let mockKitchenUser: jest.Mocked<User>;
  let mockBarUser: jest.Mocked<User>;

  beforeEach(() => {
    mockAdminUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.ADMIN),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockMemberUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockManagerUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.MANAGER),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockCashierUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.CASHIER),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockKitchenUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.KITCHEN),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockBarUser = {
      getRole: jest.fn().mockReturnValue(UserRoleType.BAR),
      getId: jest.fn(),
      getEmail: jest.fn(),
      getName: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isEmailVerified: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getStatus: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      isAccountLocked: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isPasswordExpired: jest.fn(),
      isAdmin: jest.fn(),
      updateProfile: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;
  });

  describe("assertIsAdminAction", () => {
    const action = "delete_user";

    describe("successful validation", () => {
      it("should not throw when user has ADMIN role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, action);
        }).not.toThrow();

        expect(mockAdminUser.getRole).toHaveBeenCalled();
      });

      it("should call getRole on the user", () => {
        UserAccessControlService.assertIsAdminAction(mockAdminUser, action);

        expect(mockAdminUser.getRole).toHaveBeenCalledTimes(1);
      });

      it("should work with any action string", () => {
        const actions = ["delete", "update", "create", "view_all", "manage_users", "configure_system"];

        for (const act of actions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, act);
          }).not.toThrow();
        }

        expect(mockAdminUser.getRole).toHaveBeenCalledTimes(actions.length);
      });

      it("should handle action with special characters", () => {
        const specialAction = "delete!@#$%^&*()";

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, specialAction);
        }).not.toThrow();
      });

      it("should handle action with Unicode characters", () => {
        const unicodeAction = "🚀_admin_action_✨";

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, unicodeAction);
        }).not.toThrow();
      });

      it("should handle action with spaces", () => {
        const actionWithSpaces = "delete user permanently";

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, actionWithSpaces);
        }).not.toThrow();
      });

      it("should handle empty action string", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, "");
        }).not.toThrow();
      });

      it("should handle very long action string", () => {
        const longAction = "a".repeat(1000);

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, longAction);
        }).not.toThrow();
      });
    });

    describe("validation failures", () => {
      it("should throw ActionNotAuthorizedException when user has MEMBER role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockMemberUser.getRole).toHaveBeenCalled();
      });

      it("should throw ActionNotAuthorizedException when user has MANAGER role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockManagerUser, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockManagerUser.getRole).toHaveBeenCalled();
      });

      it("should throw ActionNotAuthorizedException when user has CASHIER role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockCashierUser, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockCashierUser.getRole).toHaveBeenCalled();
      });

      it("should throw ActionNotAuthorizedException when user has KITCHEN role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockKitchenUser, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockKitchenUser.getRole).toHaveBeenCalled();
      });

      it("should throw ActionNotAuthorizedException when user has BAR role", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockBarUser, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockBarUser.getRole).toHaveBeenCalled();
      });

      it("should throw ActionNotAuthorizedException with correct error message", () => {
        const role = UserRoleType.MEMBER;
        const actionName = "delete_user";

        try {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, actionName);
          fail("Expected ActionNotAuthorizedException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          expect((error as ActionNotAuthorizedException).message).toContain(role);
          expect((error as ActionNotAuthorizedException).message).toContain(actionName);
        }
      });

      it("should include the user's role in the exception", () => {
        const role = UserRoleType.MANAGER;

        try {
          UserAccessControlService.assertIsAdminAction(mockManagerUser, action);
          fail("Expected ActionNotAuthorizedException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          expect((error as ActionNotAuthorizedException).message).toContain(role);
        }
      });

      it("should include the action name in the exception", () => {
        const actionName = "perform_maintenance";

        try {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, actionName);
          fail("Expected ActionNotAuthorizedException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          expect((error as ActionNotAuthorizedException).message).toContain(actionName);
        }
      });

      it("should throw for any non-ADMIN role", () => {
        const users = [mockMemberUser, mockManagerUser, mockCashierUser, mockKitchenUser, mockBarUser];

        for (const user of users) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(user, action);
          }).toThrow(ActionNotAuthorizedException);
        }
      });
    });

    describe("edge cases", () => {
      it("should handle user with null role", () => {
        const mockUserWithNullRole = {
          getRole: jest.fn().mockReturnValue(null),
          getId: jest.fn(),
        } as unknown as jest.Mocked<User>;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockUserWithNullRole, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockUserWithNullRole.getRole).toHaveBeenCalled();
      });

      it("should handle user with undefined role", () => {
        const mockUserWithUndefinedRole = {
          getRole: jest.fn().mockReturnValue(undefined),
          getId: jest.fn(),
        } as unknown as jest.Mocked<User>;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockUserWithUndefinedRole, action);
        }).toThrow(ActionNotAuthorizedException);

        expect(mockUserWithUndefinedRole.getRole).toHaveBeenCalled();
      });

      it("should handle action with null value", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, null as unknown as string);
        }).toThrow(ActionNotAuthorizedException);
      });

      it("should handle action with undefined value", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, undefined as unknown as string);
        }).toThrow(ActionNotAuthorizedException);
      });

      it("should handle user with ADMIN role but getRole returns string", () => {
        const mockUserWithStringRole = {
          getRole: jest.fn().mockReturnValue("ADMIN"),
          getId: jest.fn(),
        } as unknown as jest.Mocked<User>;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockUserWithStringRole, action);
        }).not.toThrow();
      });
    });

    describe("exception details", () => {
      it("should include the role in ActionNotAuthorizedException", () => {
        try {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, action);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          const exception = error as ActionNotAuthorizedException;
          expect(exception.message).toContain(UserRoleType.MEMBER);
        }
      });

      it("should include the action in ActionNotAuthorizedException", () => {
        const customAction = "custom_action";

        try {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, customAction);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          const exception = error as ActionNotAuthorizedException;
          expect(exception.message).toContain(customAction);
        }
      });

      it("should format exception message correctly", () => {
        const role = UserRoleType.MEMBER;
        const actionName = "delete users";

        try {
          UserAccessControlService.assertIsAdminAction(mockMemberUser, actionName);
          fail("Expected exception was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ActionNotAuthorizedException);
          const exception = error as ActionNotAuthorizedException;
          expect(exception.message).toContain(`User with role ${role}`);
          expect(exception.message).toContain(`is not authorized to ${actionName}`);
        }
      });
    });

    describe("performance considerations", () => {
      it("should execute validation quickly", () => {
        const startTime = Date.now();
        UserAccessControlService.assertIsAdminAction(mockAdminUser, action);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should handle multiple validations efficiently", () => {
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, action);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
        expect(mockAdminUser.getRole).toHaveBeenCalledTimes(1000);
      });
    });

    describe("type safety", () => {
      it("should accept User for performedBy parameter", () => {
        const user: User = mockAdminUser as User;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(user, action);
        }).not.toThrow();
      });

      it("should accept string for action parameter", () => {
        const actionString: string = "perform_action";

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, actionString);
        }).not.toThrow();
      });

      it("should return void", () => {
        const result = UserAccessControlService.assertIsAdminAction(mockAdminUser, action);

        expect(result).toBeUndefined();
      });
    });

    describe("integration scenarios", () => {
      it("should work with real User entity for ADMIN", () => {
        const adminUser = {
          getRole: jest.fn().mockReturnValue(UserRoleType.ADMIN),
        } as unknown as User;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(adminUser, "delete_user");
        }).not.toThrow();
      });

      it("should work with real User entity for MEMBER", () => {
        const memberUser = {
          getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
        } as unknown as User;

        expect(() => {
          UserAccessControlService.assertIsAdminAction(memberUser, "delete_user");
        }).toThrow(ActionNotAuthorizedException);
      });

      it("should protect admin-only actions", () => {
        const adminOnlyActions = ["delete_user", "ban_user", "assign_role", "view_all_users", "configure_system", "manage_admins"];

        for (const adminAction of adminOnlyActions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockMemberUser, adminAction);
          }).toThrow(ActionNotAuthorizedException);

          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, adminAction);
          }).not.toThrow();
        }
      });

      it("should allow admin to perform any action", () => {
        const actions = ["view", "edit", "delete", "create", "manage", "configure", "anything"];

        for (const act of actions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, act);
          }).not.toThrow();
        }
      });

      it("should deny non-admin users for all actions", () => {
        const actions = ["view", "edit", "delete", "create", "manage"];

        const nonAdminUsers = [mockMemberUser, mockManagerUser, mockCashierUser, mockKitchenUser, mockBarUser];

        for (const user of nonAdminUsers) {
          for (const act of actions) {
            expect(() => {
              UserAccessControlService.assertIsAdminAction(user, act);
            }).toThrow(ActionNotAuthorizedException);
          }
        }
      });

      it("should handle user with elevated privileges but not admin", () => {
        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockManagerUser, "delete_user");
        }).toThrow(ActionNotAuthorizedException);

        expect(() => {
          UserAccessControlService.assertIsAdminAction(mockAdminUser, "delete_user");
        }).not.toThrow();
      });
    });

    describe("action context", () => {
      it("should work with user management actions", () => {
        const userManagementActions = ["create_user", "update_user", "delete_user", "view_user", "list_users"];

        for (const act of userManagementActions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, act);
          }).not.toThrow();

          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockMemberUser, act);
          }).toThrow(ActionNotAuthorizedException);
        }
      });

      it("should work with system administration actions", () => {
        const systemActions = ["configure_system", "view_logs", "manage_settings", "backup_data", "restore_data"];

        for (const act of systemActions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, act);
          }).not.toThrow();

          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockManagerUser, act);
          }).toThrow(ActionNotAuthorizedException);
        }
      });

      it("should work with role management actions", () => {
        const roleActions = ["assign_role", "revoke_role", "view_roles", "create_role", "delete_role"];

        for (const act of roleActions) {
          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockAdminUser, act);
          }).not.toThrow();

          expect(() => {
            UserAccessControlService.assertIsAdminAction(mockCashierUser, act);
          }).toThrow(ActionNotAuthorizedException);
        }
      });
    });
  });
});
