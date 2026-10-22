export interface RequestContextData {
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  userId?: string;
}

export interface RequestContextPort {
  get(): RequestContextData;
}
