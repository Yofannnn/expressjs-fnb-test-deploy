import { Location } from "@/domain/value-objects/location.vo";
import { Coordinate } from "@/domain/value-objects/coordinate.vo";
import { LocationCreationData, LocationRebuildData } from "@/domain/types/location.type";
import { InvalidCoordinateException } from "@/domain/exceptions/coordinate.exceptions";

describe("Location", () => {
  describe("constructor", () => {
    it("should create a Location instance with valid address and coordinate", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      expect(location).toBeInstanceOf(Location);
      expect(location.getAddress()).toBe("Jl. Sudirman No. 1, Jakarta");
      expect(location.getCoordinate()).toBe(coordinate);
    });

    it("should create a Location instance with empty address", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("", coordinate);

      expect(location.getAddress()).toBe("");
      expect(location.getCoordinate()).toBe(coordinate);
    });

    it("should create a Location instance with address containing special characters", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta 12910 - Indonesia", coordinate);

      expect(location.getAddress()).toBe("Jl. Sudirman No. 1, Jakarta 12910 - Indonesia");
    });

    it("should create a Location instance with address containing Unicode characters", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta 测试 🎉", coordinate);

      expect(location.getAddress()).toBe("Jl. Sudirman No. 1, Jakarta 测试 🎉");
    });

    it("should handle coordinate with zero values", () => {
      const coordinate = new Coordinate(0, 0);
      const location = new Location("Equator", coordinate);

      expect(location.getCoordinate().getLatitude()).toBe(0);
      expect(location.getCoordinate().getLongitude()).toBe(0);
    });

    it("should handle coordinate with boundary values", () => {
      const coordinate = new Coordinate(90, 180);
      const location = new Location("North Pole", coordinate);

      expect(location.getCoordinate().getLatitude()).toBe(90);
      expect(location.getCoordinate().getLongitude()).toBe(180);
    });
  });

  describe("create", () => {
    it("should create a Location from creation data", () => {
      const data: LocationCreationData = {
        address: "Jl. Gatot Subroto No. 2, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);

      expect(location).toBeInstanceOf(Location);
      expect(location.getAddress()).toBe("Jl. Gatot Subroto No. 2, Jakarta");
      expect(location.getCoordinate()).toBeInstanceOf(Coordinate);
      expect(location.getCoordinate().getLatitude()).toBe(-6.2088);
      expect(location.getCoordinate().getLongitude()).toBe(106.8456);
    });

    it("should create a Location with empty address", () => {
      const data: LocationCreationData = {
        address: "",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);

      expect(location.getAddress()).toBe("");
    });

    it("should create a Location with zero coordinate values", () => {
      const data: LocationCreationData = {
        address: "Zero Point",
        latitude: 0,
        longitude: 0,
      };

      const location = Location.create(data);

      expect(location.getCoordinate().getLatitude()).toBe(0);
      expect(location.getCoordinate().getLongitude()).toBe(0);
    });

    it("should create a Location with negative coordinate values", () => {
      const data: LocationCreationData = {
        address: "South America",
        latitude: -40.7128,
        longitude: -74.006,
      };

      const location = Location.create(data);

      expect(location.getCoordinate().getLatitude()).toBe(-40.7128);
      expect(location.getCoordinate().getLongitude()).toBe(-74.006);
    });

    it("should throw InvalidCoordinateException when latitude is invalid", () => {
      const data: LocationCreationData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Location.create(data)).toThrow(InvalidCoordinateException);
    });

    it("should throw InvalidCoordinateException when longitude is invalid", () => {
      const data: LocationCreationData = {
        address: "Invalid Location",
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Location.create(data)).toThrow(InvalidCoordinateException);
    });

    it("should throw InvalidCoordinateException when both latitude and longitude are invalid", () => {
      const data: LocationCreationData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 200,
      };

      expect(() => Location.create(data)).toThrow(InvalidCoordinateException);
    });

    it("should return a new Location instance", () => {
      const data: LocationCreationData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);
      expect(location).toBeInstanceOf(Location);
    });

    it("should create a new Coordinate instance inside", () => {
      const data: LocationCreationData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);
      expect(location.getCoordinate()).toBeInstanceOf(Coordinate);
    });
  });

  describe("rebuild", () => {
    it("should rebuild a Location from rebuild data", () => {
      const data: LocationRebuildData = {
        address: "Jl. Rasuna Said No. 3, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);

      expect(location).toBeInstanceOf(Location);
      expect(location.getAddress()).toBe("Jl. Rasuna Said No. 3, Jakarta");
      expect(location.getCoordinate()).toBeInstanceOf(Coordinate);
      expect(location.getCoordinate().getLatitude()).toBe(-6.2088);
      expect(location.getCoordinate().getLongitude()).toBe(106.8456);
    });

    it("should rebuild a Location with empty address", () => {
      const data: LocationRebuildData = {
        address: "",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);

      expect(location.getAddress()).toBe("");
    });

    it("should rebuild a Location with zero coordinate values", () => {
      const data: LocationRebuildData = {
        address: "Zero Point",
        latitude: 0,
        longitude: 0,
      };

      const location = Location.rebuild(data);

      expect(location.getCoordinate().getLatitude()).toBe(0);
      expect(location.getCoordinate().getLongitude()).toBe(0);
    });

    it("should rebuild a Location with negative coordinate values", () => {
      const data: LocationRebuildData = {
        address: "South America",
        latitude: -40.7128,
        longitude: -74.006,
      };

      const location = Location.rebuild(data);

      expect(location.getCoordinate().getLatitude()).toBe(-40.7128);
      expect(location.getCoordinate().getLongitude()).toBe(-74.006);
    });

    it("should throw InvalidCoordinateException when latitude is invalid", () => {
      const data: LocationRebuildData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Location.rebuild(data)).toThrow(InvalidCoordinateException);
    });

    it("should throw InvalidCoordinateException when longitude is invalid", () => {
      const data: LocationRebuildData = {
        address: "Invalid Location",
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Location.rebuild(data)).toThrow(InvalidCoordinateException);
    });

    it("should throw InvalidCoordinateException when both latitude and longitude are invalid", () => {
      const data: LocationRebuildData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 200,
      };

      expect(() => Location.rebuild(data)).toThrow(InvalidCoordinateException);
    });

    it("should return a new Location instance", () => {
      const data: LocationRebuildData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);
      expect(location).toBeInstanceOf(Location);
    });

    it("should create a new Coordinate instance inside", () => {
      const data: LocationRebuildData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);
      expect(location.getCoordinate()).toBeInstanceOf(Coordinate);
    });
  });

  describe("getters", () => {
    it("should return address", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      expect(location.getAddress()).toBe("Jl. Sudirman No. 1, Jakarta");
    });

    it("should return coordinate", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      expect(location.getCoordinate()).toBe(coordinate);
    });

    it("should return empty address", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("", coordinate);

      expect(location.getAddress()).toBe("");
    });

    it("should return coordinate with correct values", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      expect(location.getCoordinate().getLatitude()).toBe(-6.2088);
      expect(location.getCoordinate().getLongitude()).toBe(106.8456);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: LocationCreationData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location1 = Location.create(data);
      const location2 = Location.create(data);

      expect(location1).not.toBe(location2);
      expect(location1.getAddress()).toBe(location2.getAddress());
      expect(location1.getCoordinate().getLatitude()).toBe(location2.getCoordinate().getLatitude());
      expect(location1.getCoordinate().getLongitude()).toBe(location2.getCoordinate().getLongitude());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: LocationRebuildData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location1 = Location.rebuild(data);
      const location2 = Location.rebuild(data);

      expect(location1).not.toBe(location2);
      expect(location1.getAddress()).toBe(location2.getAddress());
      expect(location1.getCoordinate().getLatitude()).toBe(location2.getCoordinate().getLatitude());
      expect(location1.getCoordinate().getLongitude()).toBe(location2.getCoordinate().getLongitude());
    });

    it("should preserve immutability of Coordinate object", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      const originalLatitude = location.getCoordinate().getLatitude();
      const originalLongitude = location.getCoordinate().getLongitude();

      expect(location.getCoordinate().getLatitude()).toBe(originalLatitude);
      expect(location.getCoordinate().getLongitude()).toBe(originalLongitude);
    });

    it("should not allow modification of properties", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      expect(location.getAddress()).toBe("Jl. Sudirman No. 1, Jakarta");
      expect(location.getCoordinate()).toBe(coordinate);
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle very long address", () => {
      const longAddress = "Jl. " + "Sudirman ".repeat(100);
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location(longAddress, coordinate);

      expect(location.getAddress()).toBe(longAddress);
    });

    it("should handle address with very long Unicode characters", () => {
      const unicodeAddress = "Jl. Sudirman " + "测试 ".repeat(50);
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location(unicodeAddress, coordinate);

      expect(location.getAddress()).toBe(unicodeAddress);
    });

    it("should handle address with special characters", () => {
      const specialAddress = "Jl. Sudirman No. 1, Jakarta 12910 - Indonesia!@#$%^&*()";
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location(specialAddress, coordinate);

      expect(location.getAddress()).toBe(specialAddress);
    });

    it("should handle address with numbers", () => {
      const addressWithNumbers = "Jl. Sudirman No. 12345, Jakarta 12910";
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const location = new Location(addressWithNumbers, coordinate);

      expect(location.getAddress()).toBe(addressWithNumbers);
    });

    it("should handle very precise coordinate values", () => {
      const coordinate = new Coordinate(40.7123456789, -74.0065432109);
      const location = new Location("Precise Location", coordinate);

      expect(location.getCoordinate().getLatitude()).toBe(40.7123456789);
      expect(location.getCoordinate().getLongitude()).toBe(-74.0065432109);
    });
  });

  describe("consistency", () => {
    it("should maintain consistency between create and rebuild", () => {
      const createData: LocationCreationData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const rebuildData: LocationRebuildData = {
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const fromCreate = Location.create(createData);
      const fromRebuild = Location.rebuild(rebuildData);

      expect(fromCreate.getAddress()).toBe(fromRebuild.getAddress());
      expect(fromCreate.getCoordinate().getLatitude()).toBe(fromRebuild.getCoordinate().getLatitude());
      expect(fromCreate.getCoordinate().getLongitude()).toBe(fromRebuild.getCoordinate().getLongitude());
    });

    it("should maintain consistency between constructor and create", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const fromConstructor = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      const fromCreate = Location.create({
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      });

      expect(fromConstructor.getAddress()).toBe(fromCreate.getAddress());
      expect(fromConstructor.getCoordinate().getLatitude()).toBe(fromCreate.getCoordinate().getLatitude());
      expect(fromConstructor.getCoordinate().getLongitude()).toBe(fromCreate.getCoordinate().getLongitude());
    });

    it("should maintain consistency between constructor and rebuild", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      const fromConstructor = new Location("Jl. Sudirman No. 1, Jakarta", coordinate);

      const fromRebuild = Location.rebuild({
        address: "Jl. Sudirman No. 1, Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
      });

      expect(fromConstructor.getAddress()).toBe(fromRebuild.getAddress());
      expect(fromConstructor.getCoordinate().getLatitude()).toBe(fromRebuild.getCoordinate().getLatitude());
      expect(fromConstructor.getCoordinate().getLongitude()).toBe(fromRebuild.getCoordinate().getLongitude());
    });
  });

  describe("type safety", () => {
    it("should handle undefined address in create", () => {
      const data: LocationCreationData = {
        address: undefined as unknown as string,
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);
      expect(location.getAddress()).toBeUndefined();
    });

    it("should handle null address in create", () => {
      const data: LocationCreationData = {
        address: null as unknown as string,
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.create(data);
      expect(location.getAddress()).toBeNull();
    });

    it("should handle undefined address in rebuild", () => {
      const data: LocationRebuildData = {
        address: undefined as unknown as string,
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);
      expect(location.getAddress()).toBeUndefined();
    });

    it("should handle null address in rebuild", () => {
      const data: LocationRebuildData = {
        address: null as unknown as string,
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const location = Location.rebuild(data);
      expect(location.getAddress()).toBeNull();
    });
  });

  describe("error scenarios", () => {
    it("should throw InvalidCoordinateException when creating with invalid latitude", () => {
      const data: LocationCreationData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Location.create(data)).toThrow(InvalidCoordinateException);
      expect(() => Location.create(data)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when creating with invalid longitude", () => {
      const data: LocationCreationData = {
        address: "Invalid Location",
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Location.create(data)).toThrow(InvalidCoordinateException);
      expect(() => Location.create(data)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should throw InvalidCoordinateException when rebuilding with invalid latitude", () => {
      const data: LocationRebuildData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Location.rebuild(data)).toThrow(InvalidCoordinateException);
      expect(() => Location.rebuild(data)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when rebuilding with invalid longitude", () => {
      const data: LocationRebuildData = {
        address: "Invalid Location",
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Location.rebuild(data)).toThrow(InvalidCoordinateException);
      expect(() => Location.rebuild(data)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should propagate InvalidCoordinateException from Coordinate.create", () => {
      const invalidData: LocationCreationData = {
        address: "Invalid Location",
        latitude: 100,
        longitude: 200,
      };

      expect(() => Location.create(invalidData)).toThrow(InvalidCoordinateException);
    });
  });
});
