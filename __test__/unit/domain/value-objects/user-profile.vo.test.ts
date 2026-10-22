import { UserProfile } from "@/domain/value-objects/user-profile.vo";
import { UserProfileRebuildData } from "@/domain/types/user.type";

describe("UserProfile", () => {
  describe("Constructor", () => {
    it("should create a UserProfile instance with valid name and address", () => {
      const name = "John Doe";
      const address = "123 Main St";

      const userProfile = new UserProfile(name, address);

      expect(userProfile).toBeInstanceOf(UserProfile);
      expect(userProfile.getName()).toBe(name);
      expect(userProfile.getAddress()).toBe(address);
    });

    it("should create a UserProfile instance with null address", () => {
      const name = "John Doe";

      const userProfile = new UserProfile(name, null);

      expect(userProfile.getName()).toBe(name);
      expect(userProfile.getAddress()).toBeNull();
    });

    it("should create a UserProfile instance with undefined address treated as null", () => {
      const name = "John Doe";
      const userProfile = new UserProfile(name, undefined as unknown as null);

      expect(userProfile.getName()).toBe(name);
      expect(userProfile.getAddress()).toBeUndefined();
    });
  });

  describe("Validation", () => {
    it("should throw error when name is empty", () => {
      expect(() => {
        new UserProfile("", "123 Main St");
      }).toThrow("Name cannot be empty");
    });

    it("should throw error when name is only whitespace", () => {
      expect(() => {
        new UserProfile("   ", "123 Main St");
      }).toThrow("Name cannot be empty");
    });

    it("should throw error when name is too long", () => {
      const longName = "a".repeat(256);

      expect(() => {
        new UserProfile(longName, "123 Main St");
      }).toThrow("Name too long");
    });

    it("should not throw error when name is exactly 255 characters", () => {
      const exactLengthName = "a".repeat(255);

      expect(() => {
        new UserProfile(exactLengthName, "123 Main St");
      }).not.toThrow();
    });
  });

  describe("getName", () => {
    it("should return the correct name", () => {
      const name = "Alice Smith";
      const userProfile = new UserProfile(name, "456 Oak Ave");

      expect(userProfile.getName()).toBe(name);
    });
  });

  describe("getAddress", () => {
    it("should return the correct address when address is provided", () => {
      const address = "789 Pine Rd";
      const userProfile = new UserProfile("Bob Johnson", address);

      expect(userProfile.getAddress()).toBe(address);
    });

    it("should return null when address is null", () => {
      const userProfile = new UserProfile("Bob Johnson", null);

      expect(userProfile.getAddress()).toBeNull();
    });
  });

  describe("update", () => {
    it("should create a new UserProfile instance with updated name and address", () => {
      const originalProfile = new UserProfile("Original Name", "Original Address");
      const newName = "Updated Name";
      const newAddress = "Updated Address";

      const updatedProfile = originalProfile.update(newName, newAddress);

      expect(updatedProfile).toBeInstanceOf(UserProfile);
      expect(updatedProfile).not.toBe(originalProfile);
      expect(updatedProfile.getName()).toBe(newName);
      expect(updatedProfile.getAddress()).toBe(newAddress);
    });

    it("should create a new UserProfile instance with null address when address is not provided", () => {
      const originalProfile = new UserProfile("Original Name", "Original Address");
      const newName = "Updated Name";

      const updatedProfile = originalProfile.update(newName);

      expect(updatedProfile.getAddress()).toBeNull();
    });

    it("should handle address update to null explicitly", () => {
      const originalProfile = new UserProfile("Original Name", "Original Address");
      const newName = "Updated Name";

      const updatedProfile = originalProfile.update(newName, undefined);

      expect(updatedProfile.getAddress()).toBeNull();
    });
  });

  describe("Static Methods", () => {
    describe("create", () => {
      it("should create a UserProfile instance with name and address", () => {
        const name = "Created User";
        const address = "Created Address";

        const userProfile = UserProfile.create(name, address);

        expect(userProfile).toBeInstanceOf(UserProfile);
        expect(userProfile.getName()).toBe(name);
        expect(userProfile.getAddress()).toBe(address);
      });

      it("should create a UserProfile instance with null address when address is not provided", () => {
        const name = "Created User";

        const userProfile = UserProfile.create(name);

        expect(userProfile.getAddress()).toBeNull();
      });

      it("should create a UserProfile instance with null address when address is undefined", () => {
        const name = "Created User";

        const userProfile = UserProfile.create(name, undefined);

        expect(userProfile.getAddress()).toBeNull();
      });
    });

    describe("rebuild", () => {
      it("should rebuild UserProfile from UserProfileRebuildData with address", () => {
        const rebuildData: UserProfileRebuildData = {
          name: "Rebuilt User",
          address: "Rebuilt Address",
        };

        const userProfile = UserProfile.rebuild(rebuildData);

        expect(userProfile).toBeInstanceOf(UserProfile);
        expect(userProfile.getName()).toBe(rebuildData.name);
        expect(userProfile.getAddress()).toBe(rebuildData.address);
      });

      it("should rebuild UserProfile from UserProfileRebuildData with null address", () => {
        const rebuildData: UserProfileRebuildData = {
          name: "Rebuilt User",
          address: null,
        };

        const userProfile = UserProfile.rebuild(rebuildData);

        expect(userProfile.getAddress()).toBeNull();
      });

      it("should rebuild UserProfile from UserProfileRebuildData with undefined address treated as null", () => {
        const rebuildData: UserProfileRebuildData = {
          name: "Rebuilt User",
          address: null,
        };

        const userProfile = UserProfile.rebuild(rebuildData);

        expect(userProfile.getAddress()).toBeNull();
      });

      it("should rebuild UserProfile from UserProfileRebuildData without address property", () => {
        const rebuildData = {
          name: "Rebuilt User",
        } as UserProfileRebuildData;

        const userProfile = UserProfile.rebuild(rebuildData);

        expect(userProfile.getAddress()).toBeNull();
      });
    });
  });

  describe("Immutability", () => {
    it("should not mutate original instance when update is called", () => {
      const originalName = "Original Name";
      const originalAddress = "Original Address";
      const originalProfile = new UserProfile(originalName, originalAddress);

      const updatedProfile = originalProfile.update("New Name", "New Address");

      expect(originalProfile.getName()).toBe(originalName);
      expect(originalProfile.getAddress()).toBe(originalAddress);
      expect(updatedProfile.getName()).toBe("New Name");
      expect(updatedProfile.getAddress()).toBe("New Address");
    });
  });
});
