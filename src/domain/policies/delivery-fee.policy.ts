export interface DeliveryFeePolicy {
  freeDeliveryRadiusKm: number;
  baseFee: number;
  perKmRateBeyondBase: number;
  baseFeeCoversUpToKm: number;
  maxDeliveryDistanceKm: number;
}
