import { StoreLocation } from "@/domain/types/store-location.type";
import { env } from "./env-reader";

export class StoreLocationEnvConfig implements StoreLocation {
  readonly address: string;
  readonly coordinate: { latitude: number; longitude: number };

  constructor() {
    this.address = env.string("STORE_LOCATION_ADDRESS");
    this.coordinate = {
      latitude: env.number("STORE_LOCATION_LATITUDE"),
      longitude: env.number("STORE_LOCATION_LONGITUDE"),
    };
  }
}
