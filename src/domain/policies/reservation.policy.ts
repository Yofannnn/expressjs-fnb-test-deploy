export interface ReservationPolicy {
  requiresPhoneVerification: boolean;
  maxAdvanceBookingDays: number; // can't book further than this
  minAdvanceBookingMinutes: number; // can't book last-minute below this
  maxActiveReservationsPerCustomer: number;
  unconfirmedHoldExpiryMinutes: number; // auto-cancel if not verified in time
  noShowBlockThreshold: number; // block after N no-shows...
  noShowLookbackDays: number; // ...within this rolling window
  depositRequiredForPartySize: number | null; // e.g. deposit kicks in for party >= 8
  depositAmount: number | null;
  minimumOrderQuantityIfOrderIncluded: number;
}
