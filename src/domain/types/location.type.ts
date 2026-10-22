import { CoordinateCreationData, CoordinateRebuildData } from "./coordinate.type";

export interface LocationCreationData extends CoordinateCreationData {
  address: string;
}

export interface LocationRebuildData extends CoordinateRebuildData {
  address: string;
}
