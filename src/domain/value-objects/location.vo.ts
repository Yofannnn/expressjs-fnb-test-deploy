import { LocationCreationData, LocationRebuildData } from "../types/location.type";
import { Coordinate } from "./coordinate.vo";

export class Location {
  constructor(
    private readonly address: string,
    private readonly coordinate: Coordinate,
  ) {}

  getAddress(): string {
    return this.address;
  }

  getCoordinate(): Coordinate {
    return this.coordinate;
  }

  static create({ address, latitude, longitude }: LocationCreationData): Location {
    return new Location(address, Coordinate.create({ latitude, longitude }));
  }

  static rebuild({ address, latitude, longitude }: LocationRebuildData): Location {
    return new Location(address, Coordinate.rebuild({ latitude, longitude }));
  }
}
