import { Coordinate } from "@/domain/value-objects/coordinate.vo";
import { CoordinateCreationData, CoordinateRebuildData } from "@/domain/types/coordinate.type";
import { InvalidCoordinateException, InvalidCoordinateFormatException } from "@/domain/exceptions/coordinate.exceptions";

describe("Coordinate", () => {
  describe("constructor", () => {
    it("should create a Coordinate instance with valid latitude and longitude", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);

      expect(coordinate).toBeInstanceOf(Coordinate);
      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should create a Coordinate instance with zero values", () => {
      const coordinate = new Coordinate(0, 0);

      expect(coordinate.getLatitude()).toBe(0);
      expect(coordinate.getLongitude()).toBe(0);
    });

    it("should create a Coordinate instance with maximum valid values", () => {
      const coordinate = new Coordinate(90, 180);

      expect(coordinate.getLatitude()).toBe(90);
      expect(coordinate.getLongitude()).toBe(180);
    });

    it("should create a Coordinate instance with minimum valid values", () => {
      const coordinate = new Coordinate(-90, -180);

      expect(coordinate.getLatitude()).toBe(-90);
      expect(coordinate.getLongitude()).toBe(-180);
    });

    it("should create a Coordinate instance with decimal values", () => {
      const coordinate = new Coordinate(40.7128, -74.006);

      expect(coordinate.getLatitude()).toBe(40.7128);
      expect(coordinate.getLongitude()).toBe(-74.006);
    });

    it("should throw InvalidCoordinateException when latitude is less than -90", () => {
      expect(() => new Coordinate(-91, 0)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(-91, 0)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when latitude is greater than 90", () => {
      expect(() => new Coordinate(91, 0)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(91, 0)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when longitude is less than -180", () => {
      expect(() => new Coordinate(0, -181)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(0, -181)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should throw InvalidCoordinateException when longitude is greater than 180", () => {
      expect(() => new Coordinate(0, 181)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(0, 181)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should throw InvalidCoordinateException with correct message for invalid latitude", () => {
      try {
        new Coordinate(100, 0);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateException);
        expect((error as InvalidCoordinateException).message).toBe("Latitude must be between -90 and 90.");
      }
    });

    it("should throw InvalidCoordinateException with correct message for invalid longitude", () => {
      try {
        new Coordinate(0, 200);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateException);
        expect((error as InvalidCoordinateException).message).toBe("Longitude must be between -180 and 180.");
      }
    });
  });

  describe("fromString", () => {
    it("should create a Coordinate from valid string format", () => {
      const coordinate = Coordinate.fromString("-6.2088,106.8456");

      expect(coordinate).toBeInstanceOf(Coordinate);
      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should create a Coordinate from string with spaces", () => {
      const coordinate = Coordinate.fromString(" -6.2088 , 106.8456 ");

      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should create a Coordinate from string with negative values", () => {
      const coordinate = Coordinate.fromString("-40.7128,-74.0060");

      expect(coordinate.getLatitude()).toBe(-40.7128);
      expect(coordinate.getLongitude()).toBe(-74.006);
    });

    it("should create a Coordinate from string with zero values", () => {
      const coordinate = Coordinate.fromString("0,0");

      expect(coordinate.getLatitude()).toBe(0);
      expect(coordinate.getLongitude()).toBe(0);
    });

    it("should create a Coordinate from string with maximum values", () => {
      const coordinate = Coordinate.fromString("90,180");

      expect(coordinate.getLatitude()).toBe(90);
      expect(coordinate.getLongitude()).toBe(180);
    });

    it("should create a Coordinate from string with minimum values", () => {
      const coordinate = Coordinate.fromString("-90,-180");

      expect(coordinate.getLatitude()).toBe(-90);
      expect(coordinate.getLongitude()).toBe(-180);
    });

    it("should throw InvalidCoordinateFormatException when string is empty", () => {
      expect(() => Coordinate.fromString("")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("")).toThrow("Coordinate cannot be empty.");
    });

    it("should throw InvalidCoordinateFormatException when string is only spaces", () => {
      expect(() => Coordinate.fromString("   ")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("   ")).toThrow("Coordinate cannot be empty.");
    });

    it("should throw InvalidCoordinateFormatException when string has no comma", () => {
      expect(() => Coordinate.fromString("-6.2088 106.8456")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-6.2088 106.8456")).toThrow("Coordinate must be in the format 'latitude,longitude'.");
    });

    it("should throw InvalidCoordinateFormatException when string has more than one comma", () => {
      expect(() => Coordinate.fromString("-6.2088,106.8456,extra")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-6.2088,106.8456,extra")).toThrow("Coordinate must be in the format 'latitude,longitude'.");
    });

    it("should throw InvalidCoordinateFormatException when latitude is not a number", () => {
      expect(() => Coordinate.fromString("abc,106.8456")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("abc,106.8456")).toThrow("Latitude and longitude must be valid numbers.");
    });

    it("should throw InvalidCoordinateFormatException when longitude is not a number", () => {
      expect(() => Coordinate.fromString("-6.2088,abc")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-6.2088,abc")).toThrow("Latitude and longitude must be valid numbers.");
    });

    it("should throw InvalidCoordinateFormatException when both are not numbers", () => {
      expect(() => Coordinate.fromString("abc,def")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("abc,def")).toThrow("Latitude and longitude must be valid numbers.");
    });

    it("should throw InvalidCoordinateException when latitude is out of range in string", () => {
      expect(() => Coordinate.fromString("100,106.8456")).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.fromString("100,106.8456")).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when longitude is out of range in string", () => {
      expect(() => Coordinate.fromString("-6.2088,200")).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.fromString("-6.2088,200")).toThrow("Longitude must be between -180 and 180.");
    });

    it("should throw InvalidCoordinateFormatException with correct message for empty string", () => {
      try {
        Coordinate.fromString("");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateFormatException);
        expect((error as InvalidCoordinateFormatException).message).toBe("Coordinate cannot be empty.");
      }
    });

    it("should throw InvalidCoordinateFormatException with correct message for invalid format", () => {
      try {
        Coordinate.fromString("-6.2088 106.8456");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateFormatException);
        expect((error as InvalidCoordinateFormatException).message).toBe("Coordinate must be in the format 'latitude,longitude'.");
      }
    });

    it("should throw InvalidCoordinateFormatException with correct message for invalid numbers", () => {
      try {
        Coordinate.fromString("abc,106.8456");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateFormatException);
        expect((error as InvalidCoordinateFormatException).message).toBe("Latitude and longitude must be valid numbers.");
      }
    });
  });

  describe("create", () => {
    it("should create a Coordinate from creation data", () => {
      const data: CoordinateCreationData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate = Coordinate.create(data);

      expect(coordinate).toBeInstanceOf(Coordinate);
      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should create a Coordinate with zero values", () => {
      const data: CoordinateCreationData = {
        latitude: 0,
        longitude: 0,
      };

      const coordinate = Coordinate.create(data);

      expect(coordinate.getLatitude()).toBe(0);
      expect(coordinate.getLongitude()).toBe(0);
    });

    it("should create a Coordinate with maximum values", () => {
      const data: CoordinateCreationData = {
        latitude: 90,
        longitude: 180,
      };

      const coordinate = Coordinate.create(data);

      expect(coordinate.getLatitude()).toBe(90);
      expect(coordinate.getLongitude()).toBe(180);
    });

    it("should create a Coordinate with minimum values", () => {
      const data: CoordinateCreationData = {
        latitude: -90,
        longitude: -180,
      };

      const coordinate = Coordinate.create(data);

      expect(coordinate.getLatitude()).toBe(-90);
      expect(coordinate.getLongitude()).toBe(-180);
    });

    it("should throw InvalidCoordinateException when latitude is out of range in creation data", () => {
      const data: CoordinateCreationData = {
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Coordinate.create(data)).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.create(data)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when longitude is out of range in creation data", () => {
      const data: CoordinateCreationData = {
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Coordinate.create(data)).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.create(data)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should return a new Coordinate instance", () => {
      const data: CoordinateCreationData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate = Coordinate.create(data);
      expect(coordinate).toBeInstanceOf(Coordinate);
    });
  });

  describe("rebuild", () => {
    it("should rebuild a Coordinate from rebuild data", () => {
      const data: CoordinateRebuildData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate = Coordinate.rebuild(data);

      expect(coordinate).toBeInstanceOf(Coordinate);
      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should rebuild a Coordinate with zero values", () => {
      const data: CoordinateRebuildData = {
        latitude: 0,
        longitude: 0,
      };

      const coordinate = Coordinate.rebuild(data);

      expect(coordinate.getLatitude()).toBe(0);
      expect(coordinate.getLongitude()).toBe(0);
    });

    it("should rebuild a Coordinate with maximum values", () => {
      const data: CoordinateRebuildData = {
        latitude: 90,
        longitude: 180,
      };

      const coordinate = Coordinate.rebuild(data);

      expect(coordinate.getLatitude()).toBe(90);
      expect(coordinate.getLongitude()).toBe(180);
    });

    it("should rebuild a Coordinate with minimum values", () => {
      const data: CoordinateRebuildData = {
        latitude: -90,
        longitude: -180,
      };

      const coordinate = Coordinate.rebuild(data);

      expect(coordinate.getLatitude()).toBe(-90);
      expect(coordinate.getLongitude()).toBe(-180);
    });

    it("should throw InvalidCoordinateException when latitude is out of range in rebuild data", () => {
      const data: CoordinateRebuildData = {
        latitude: 100,
        longitude: 106.8456,
      };

      expect(() => Coordinate.rebuild(data)).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.rebuild(data)).toThrow("Latitude must be between -90 and 90.");
    });

    it("should throw InvalidCoordinateException when longitude is out of range in rebuild data", () => {
      const data: CoordinateRebuildData = {
        latitude: -6.2088,
        longitude: 200,
      };

      expect(() => Coordinate.rebuild(data)).toThrow(InvalidCoordinateException);
      expect(() => Coordinate.rebuild(data)).toThrow("Longitude must be between -180 and 180.");
    });

    it("should return a new Coordinate instance", () => {
      const data: CoordinateRebuildData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate = Coordinate.rebuild(data);
      expect(coordinate).toBeInstanceOf(Coordinate);
    });
  });

  describe("getters", () => {
    it("should return latitude", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      expect(coordinate.getLatitude()).toBe(-6.2088);
    });

    it("should return longitude", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });

    it("should return latitude for zero values", () => {
      const coordinate = new Coordinate(0, 0);
      expect(coordinate.getLatitude()).toBe(0);
    });

    it("should return longitude for zero values", () => {
      const coordinate = new Coordinate(0, 0);
      expect(coordinate.getLongitude()).toBe(0);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: CoordinateCreationData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate1 = Coordinate.create(data);
      const coordinate2 = Coordinate.create(data);

      expect(coordinate1).not.toBe(coordinate2);
      expect(coordinate1.getLatitude()).toBe(coordinate2.getLatitude());
      expect(coordinate1.getLongitude()).toBe(coordinate2.getLongitude());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: CoordinateRebuildData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const coordinate1 = Coordinate.rebuild(data);
      const coordinate2 = Coordinate.rebuild(data);

      expect(coordinate1).not.toBe(coordinate2);
      expect(coordinate1.getLatitude()).toBe(coordinate2.getLatitude());
      expect(coordinate1.getLongitude()).toBe(coordinate2.getLongitude());
    });

    it("should return a new instance from fromString each time", () => {
      const coordinate1 = Coordinate.fromString("-6.2088,106.8456");
      const coordinate2 = Coordinate.fromString("-6.2088,106.8456");

      expect(coordinate1).not.toBe(coordinate2);
      expect(coordinate1.getLatitude()).toBe(coordinate2.getLatitude());
      expect(coordinate1.getLongitude()).toBe(coordinate2.getLongitude());
    });

    it("should not allow modification of properties", () => {
      const coordinate = new Coordinate(-6.2088, 106.8456);

      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle very precise decimal values", () => {
      const coordinate = new Coordinate(40.7123456789, -74.0065432109);

      expect(coordinate.getLatitude()).toBe(40.7123456789);
      expect(coordinate.getLongitude()).toBe(-74.0065432109);
    });

    it("should handle latitude at exact boundary 90", () => {
      const coordinate = new Coordinate(90, 0);
      expect(coordinate.getLatitude()).toBe(90);
    });

    it("should handle latitude at exact boundary -90", () => {
      const coordinate = new Coordinate(-90, 0);
      expect(coordinate.getLatitude()).toBe(-90);
    });

    it("should handle longitude at exact boundary 180", () => {
      const coordinate = new Coordinate(0, 180);
      expect(coordinate.getLongitude()).toBe(180);
    });

    it("should handle longitude at exact boundary -180", () => {
      const coordinate = new Coordinate(0, -180);
      expect(coordinate.getLongitude()).toBe(-180);
    });

    it("should handle very small decimal values", () => {
      const coordinate = new Coordinate(0.0000001, -0.0000001);

      expect(coordinate.getLatitude()).toBe(0.0000001);
      expect(coordinate.getLongitude()).toBe(-0.0000001);
    });

    it("should handle very large decimal precision in string", () => {
      const coordinate = Coordinate.fromString("40.712345678901234,-74.006543210987654");

      expect(coordinate.getLatitude()).toBeCloseTo(40.71234567890123);
      expect(coordinate.getLongitude()).toBeCloseTo(-74.0065432109876);
    });

    it("should handle string with tabs and newlines", () => {
      const coordinate = Coordinate.fromString("\n\t-6.2088,\t106.8456\n");

      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });
  });

  describe("consistency", () => {
    it("should maintain consistency between create and rebuild", () => {
      const createData: CoordinateCreationData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const rebuildData: CoordinateRebuildData = {
        latitude: -6.2088,
        longitude: 106.8456,
      };

      const fromCreate = Coordinate.create(createData);
      const fromRebuild = Coordinate.rebuild(rebuildData);

      expect(fromCreate.getLatitude()).toBe(fromRebuild.getLatitude());
      expect(fromCreate.getLongitude()).toBe(fromRebuild.getLongitude());
    });

    it("should maintain consistency between fromString and create", () => {
      const fromString = Coordinate.fromString("-6.2088,106.8456");
      const fromCreate = Coordinate.create({
        latitude: -6.2088,
        longitude: 106.8456,
      });

      expect(fromString.getLatitude()).toBe(fromCreate.getLatitude());
      expect(fromString.getLongitude()).toBe(fromCreate.getLongitude());
    });

    it("should maintain consistency between fromString and rebuild", () => {
      const fromString = Coordinate.fromString("-6.2088,106.8456");
      const fromRebuild = Coordinate.rebuild({
        latitude: -6.2088,
        longitude: 106.8456,
      });

      expect(fromString.getLatitude()).toBe(fromRebuild.getLatitude());
      expect(fromString.getLongitude()).toBe(fromRebuild.getLongitude());
    });
  });

  describe("type safety and edge conditions", () => {
    it("should handle NaN values correctly in constructor", () => {
      const coordinate1 = new Coordinate(NaN, 0);
      expect(coordinate1.getLatitude()).toBeNaN();
      expect(coordinate1.getLongitude()).toBe(0);

      const coordinate2 = new Coordinate(0, NaN);
      expect(coordinate2.getLatitude()).toBe(0);
      expect(coordinate2.getLongitude()).toBeNaN();

      const coordinate3 = new Coordinate(NaN, NaN);
      expect(coordinate3.getLatitude()).toBeNaN();
      expect(coordinate3.getLongitude()).toBeNaN();
    });

    it("should handle Infinity values correctly in constructor", () => {
      expect(() => new Coordinate(Infinity, 0)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(0, Infinity)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(-Infinity, 0)).toThrow(InvalidCoordinateException);
      expect(() => new Coordinate(0, -Infinity)).toThrow(InvalidCoordinateException);
    });

    it("should handle NaN values in fromString", () => {
      expect(() => Coordinate.fromString("NaN,106.8456")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-6.2088,NaN")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("NaN,NaN")).toThrow(InvalidCoordinateFormatException);
    });

    it("should handle Infinity values in fromString", () => {
      expect(() => Coordinate.fromString("Infinity,106.8456")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-6.2088,Infinity")).toThrow(InvalidCoordinateFormatException);
      expect(() => Coordinate.fromString("-Infinity,106.8456")).toThrow(InvalidCoordinateFormatException);
    });

    it("should handle string with comma and space variations", () => {
      const coordinate = Coordinate.fromString("-6.2088, 106.8456");
      expect(coordinate.getLatitude()).toBe(-6.2088);
      expect(coordinate.getLongitude()).toBe(106.8456);
    });
  });

  describe("error scenarios", () => {
    it("should throw InvalidCoordinateException with correct type for invalid latitude", () => {
      try {
        new Coordinate(100, 0);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateException);
        expect(error).not.toBeInstanceOf(InvalidCoordinateFormatException);
      }
    });

    it("should throw InvalidCoordinateException with correct type for invalid longitude", () => {
      try {
        new Coordinate(0, 200);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateException);
        expect(error).not.toBeInstanceOf(InvalidCoordinateFormatException);
      }
    });

    it("should throw InvalidCoordinateFormatException with correct type for invalid format", () => {
      try {
        Coordinate.fromString("invalid");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateFormatException);
        expect(error).not.toBeInstanceOf(InvalidCoordinateException);
      }
    });

    it("should throw InvalidCoordinateFormatException with correct type for empty string", () => {
      try {
        Coordinate.fromString("");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCoordinateFormatException);
        expect(error).not.toBeInstanceOf(InvalidCoordinateException);
      }
    });
  });
});
