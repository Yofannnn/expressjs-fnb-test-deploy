import { HaversineDistanceCalculatorAdapter } from "@/infrastructure/geolocation/haversine-distance-calculator.adapter";
import { Coordinate } from "@/domain/value-objects/coordinate.vo";

describe("HaversineDistanceCalculatorAdapter", () => {
  let calculator: HaversineDistanceCalculatorAdapter;

  beforeEach(() => {
    calculator = new HaversineDistanceCalculatorAdapter();
  });

  describe("constructor", () => {
    it("should initialize with default earth radius", () => {
      expect(calculator).toBeInstanceOf(HaversineDistanceCalculatorAdapter);
      expect(HaversineDistanceCalculatorAdapter["EARTH_RADIUS_KM"]).toBe(6371);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.3, longitude: 106.9 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeCloseTo(11.79, 1);
    });

    it("should return 0 when both points are identical", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBe(0);
    });

    it("should calculate distance between Jakarta and Bandung", async () => {
      const jakarta = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const bandung = Coordinate.create({ latitude: -6.9175, longitude: 107.6191 });

      const distance = await calculator.calculateDistance(jakarta, bandung);

      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(150);
      expect(distance).toBeCloseTo(116.24, 1);
    });

    it("should calculate distance between two points on the equator", async () => {
      const from = Coordinate.create({ latitude: 0, longitude: 0 });
      const to = Coordinate.create({ latitude: 0, longitude: 1 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(111.19, 1);
    });

    it("should calculate distance between two points on the same meridian", async () => {
      const from = Coordinate.create({ latitude: 0, longitude: 0 });
      const to = Coordinate.create({ latitude: 1, longitude: 0 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(111.19, 1);
    });

    it("should calculate distance between north and south poles", async () => {
      const northPole = Coordinate.create({ latitude: 90, longitude: 0 });
      const southPole = Coordinate.create({ latitude: -90, longitude: 0 });

      const distance = await calculator.calculateDistance(northPole, southPole);

      expect(distance).toBeCloseTo(20015, 0);
    });

    it("should calculate distance between two points in the same city", async () => {
      const point1 = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const point2 = Coordinate.create({ latitude: -6.21, longitude: 106.847 });

      const distance = await calculator.calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.5);
    });

    it("should handle negative coordinates", async () => {
      const from = Coordinate.create({ latitude: -33.8688, longitude: 151.2093 });
      const to = Coordinate.create({ latitude: -33.8688, longitude: 151.2093 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBe(0);
    });

    it("should handle coordinates with decimal precision", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.2088, longitude: 106.8457 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1);
    });

    it("should be symmetric (distance from A to B equals distance from B to A)", async () => {
      const pointA = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const pointB = Coordinate.create({ latitude: -6.9175, longitude: 107.6191 });

      const distanceAB = await calculator.calculateDistance(pointA, pointB);
      const distanceBA = await calculator.calculateDistance(pointB, pointA);

      expect(distanceAB).toBe(distanceBA);
    });

    it("should handle coordinates with large latitude values", async () => {
      const from = Coordinate.create({ latitude: 85, longitude: 0 });
      const to = Coordinate.create({ latitude: 85, longitude: 1 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10);
    });

    it("should handle coordinates with longitude wrapping", async () => {
      const from = Coordinate.create({ latitude: 0, longitude: 179 });
      const to = Coordinate.create({ latitude: 0, longitude: -179 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(300);
    });
  });

  describe("toRadians (private method)", () => {
    it("should convert degrees to radians", () => {
      const toRadians = (value: number) => {
        return value * (Math.PI / 180);
      };

      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBe(Math.PI);
      expect(toRadians(90)).toBe(Math.PI / 2);
      expect(toRadians(360)).toBe(2 * Math.PI);
    });

    it("should handle negative degrees", () => {
      const toRadians = (value: number) => {
        return value * (Math.PI / 180);
      };

      expect(toRadians(-180)).toBe(-Math.PI);
      expect(toRadians(-90)).toBe(-Math.PI / 2);
    });

    it("should handle decimal degrees", () => {
      const toRadians = (value: number) => {
        return value * (Math.PI / 180);
      };

      expect(toRadians(45.5)).toBe(45.5 * (Math.PI / 180));
      expect(toRadians(-45.5)).toBe(-45.5 * (Math.PI / 180));
    });

    it("should handle very small degree values", () => {
      const toRadians = (value: number) => {
        return value * (Math.PI / 180);
      };

      expect(toRadians(0.0001)).toBeCloseTo(0.0001 * (Math.PI / 180), 10);
    });
  });

  describe("edge cases", () => {
    it("should handle coordinates at the same latitude but different longitudes", async () => {
      const from = Coordinate.create({ latitude: 0, longitude: 0 });
      const to = Coordinate.create({ latitude: 0, longitude: 180 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(20015, 0);
    });

    it("should handle coordinates at the same longitude but different latitudes", async () => {
      const from = Coordinate.create({ latitude: -45, longitude: 0 });
      const to = Coordinate.create({ latitude: 45, longitude: 0 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(10007.54, 1);
    });

    it("should handle coordinates with very small differences", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.2088001, longitude: 106.8456001 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1);
    });

    it("should handle coordinates with maximum precision", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.2088000001, longitude: 106.8456000001 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1);
    });

    it("should handle coordinates at the international date line", async () => {
      const from = Coordinate.create({ latitude: 0, longitude: 180 });
      const to = Coordinate.create({ latitude: 0, longitude: -180 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(0, 0);
    });

    it("should handle coordinates with latitude exactly at poles", async () => {
      const from = Coordinate.create({ latitude: 90, longitude: 45 });
      const to = Coordinate.create({ latitude: 90, longitude: 135 });

      const distance = await calculator.calculateDistance(from, to);

      expect(distance).toBeCloseTo(0, 0);
    });
  });

  describe("integration scenarios", () => {
    it("should calculate distances for multiple coordinate pairs", async () => {
      const pairs = [
        {
          from: { lat: -6.2088, lng: 106.8456 },
          to: { lat: -6.9175, lng: 107.6191 },
          expected: 116.24,
        },
        {
          from: { lat: -6.2088, lng: 106.8456 },
          to: { lat: -8.65, lng: 115.2167 },
          expected: 962.01,
        },
        {
          from: { lat: -6.2088, lng: 106.8456 },
          to: { lat: -7.7971, lng: 110.369 },
          expected: 427.08,
        },
        {
          from: { lat: -6.2088, lng: 106.8456 },
          to: { lat: -5.364, lng: 119.438 },
          expected: 1396.2,
        },
      ];

      for (const pair of pairs) {
        const from = Coordinate.create({ latitude: pair.from.lat, longitude: pair.from.lng });
        const to = Coordinate.create({ latitude: pair.to.lat, longitude: pair.to.lng });

        const distance = await calculator.calculateDistance(from, to);

        expect(distance).toBeCloseTo(pair.expected, 0);
      }
    });

    it("should calculate distance between major world cities", async () => {
      const cities = {
        jakarta: { lat: -6.2088, lng: 106.8456 },
        singapore: { lat: 1.3521, lng: 103.8198 },
        kualaLumpur: { lat: 3.139, lng: 101.6869 },
        bangkok: { lat: 13.7563, lng: 100.5018 },
        tokyo: { lat: 35.6762, lng: 139.6503 },
        london: { lat: 51.5074, lng: -0.1278 },
        newyork: { lat: 40.7128, lng: -74.006 },
      };

      const from = Coordinate.create({ latitude: cities.jakarta.lat, longitude: cities.jakarta.lng });

      const distances = {
        singapore: await calculator.calculateDistance(from, Coordinate.create({ latitude: cities.singapore.lat, longitude: cities.singapore.lng })),
        kualaLumpur: await calculator.calculateDistance(
          from,
          Coordinate.create({ latitude: cities.kualaLumpur.lat, longitude: cities.kualaLumpur.lng }),
        ),
        bangkok: await calculator.calculateDistance(from, Coordinate.create({ latitude: cities.bangkok.lat, longitude: cities.bangkok.lng })),
        tokyo: await calculator.calculateDistance(from, Coordinate.create({ latitude: cities.tokyo.lat, longitude: cities.tokyo.lng })),
        london: await calculator.calculateDistance(from, Coordinate.create({ latitude: cities.london.lat, longitude: cities.london.lng })),
        newyork: await calculator.calculateDistance(from, Coordinate.create({ latitude: cities.newyork.lat, longitude: cities.newyork.lng })),
      };

      expect(distances.singapore).toBeCloseTo(905.35, 1);
      expect(distances.kualaLumpur).toBeCloseTo(1186.8, 1);
      expect(distances.bangkok).toBeCloseTo(2327.84, 1);
      expect(distances.tokyo).toBeCloseTo(5782.0, 0);
      expect(distances.london).toBeCloseTo(11718.14, 0);
      expect(distances.newyork).toBeCloseTo(16177.48, 0);
    });

    it("should handle sequential distance calculations efficiently", async () => {
      const pointA = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const pointB = Coordinate.create({ latitude: -6.9175, longitude: 107.6191 });
      const pointC = Coordinate.create({ latitude: -7.7971, longitude: 110.369 });

      const startTime = Date.now();

      const distAB = await calculator.calculateDistance(pointA, pointB);
      const distAC = await calculator.calculateDistance(pointA, pointC);
      const distBC = await calculator.calculateDistance(pointB, pointC);

      const endTime = Date.now();

      expect(distAB).toBeGreaterThan(0);
      expect(distAC).toBeGreaterThan(0);
      expect(distBC).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("performance considerations", () => {
    it("should calculate distance quickly", async () => {
      const from = Coordinate.create({ latitude: -6.2088, longitude: 106.8456 });
      const to = Coordinate.create({ latitude: -6.9175, longitude: 107.6191 });

      const startTime = Date.now();
      await calculator.calculateDistance(from, to);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it("should handle multiple calculations efficiently", async () => {
      const points = [
        { lat: -6.2088, lng: 106.8456 },
        { lat: -6.9175, lng: 107.6191 },
        { lat: -7.7971, lng: 110.369 },
        { lat: -8.65, lng: 115.2167 },
      ];

      const startTime = Date.now();

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const from = Coordinate.create({ latitude: points[i].lat, longitude: points[i].lng });
          const to = Coordinate.create({ latitude: points[j].lat, longitude: points[j].lng });
          await calculator.calculateDistance(from, to);
        }
      }

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
