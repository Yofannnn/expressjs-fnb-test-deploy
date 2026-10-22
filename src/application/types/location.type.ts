export interface CoordinatePlainObject {
  latitude: number;
  longitude: number;
}

export interface LocationPlainObject extends CoordinatePlainObject {
  address: string;
}
