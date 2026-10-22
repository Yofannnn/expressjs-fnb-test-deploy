import { DistanceCalculatorPort } from "@/application/ports/driven/distance-calculator.port";
import { Coordinate } from "@/domain/value-objects/coordinate.vo";

export class HaversineDistanceCalculatorAdapter implements DistanceCalculatorPort {
  private static readonly EARTH_RADIUS_KM = 6371;

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }

  async calculateDistance(from: Coordinate, to: Coordinate): Promise<number> {
    const lat1 = this.toRadians(from.getLatitude());
    const lon1 = this.toRadians(from.getLongitude());

    const lat2 = this.toRadians(to.getLatitude());
    const lon2 = this.toRadians(to.getLongitude());

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return HaversineDistanceCalculatorAdapter.EARTH_RADIUS_KM * c;
  }
}
