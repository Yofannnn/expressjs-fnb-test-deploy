import { Coordinate } from "@/domain/value-objects/coordinate.vo";

export interface DistanceCalculatorPort {
  calculateDistance(from: Coordinate, to: Coordinate): Promise<number>;
}
