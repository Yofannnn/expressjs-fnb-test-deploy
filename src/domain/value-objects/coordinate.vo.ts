import { InvalidCoordinateException, InvalidCoordinateFormatException } from "../exceptions/coordinate.exceptions";
import { CoordinateCreationData, CoordinateRebuildData } from "../types/coordinate.type";

export class Coordinate {
  constructor(
    private readonly latitude: number,
    private readonly longitude: number,
  ) {
    if (latitude < -90 || latitude > 90) throw new InvalidCoordinateException("Latitude must be between -90 and 90.");
    if (longitude < -180 || longitude > 180) throw new InvalidCoordinateException("Longitude must be between -180 and 180.");
  }

  getLatitude(): number {
    return this.latitude;
  }

  getLongitude(): number {
    return this.longitude;
  }

  static fromString(value: string): Coordinate {
    if (!value || value.trim().length === 0) throw new InvalidCoordinateFormatException("Coordinate cannot be empty.");

    const parts = value.split(",");

    if (parts.length !== 2) throw new InvalidCoordinateFormatException("Coordinate must be in the format 'latitude,longitude'.");

    const latitude = Number(parts[0].trim());
    const longitude = Number(parts[1].trim());

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new InvalidCoordinateFormatException("Latitude and longitude must be valid numbers.");
    }

    return new Coordinate(latitude, longitude);
  }

  static create(data: CoordinateCreationData): Coordinate {
    return new Coordinate(data.latitude, data.longitude);
  }

  static rebuild(data: CoordinateRebuildData): Coordinate {
    return new Coordinate(data.latitude, data.longitude);
  }
}
