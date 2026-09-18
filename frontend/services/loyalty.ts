import { apiFetch, jsonBody } from "@/lib/api";
import type { LoyaltyAccount } from "@/types";

/** What a customer's phone number points to, if they have booked before. */
export function loyaltyLookup(phone: string): Promise<LoyaltyAccount> {
  return apiFetch<LoyaltyAccount>(`/loyalty/lookup?phone=${encodeURIComponent(phone)}`);
}

/** Spends 1,000 points to bank one 5%-off voucher for the next rental. */
export function loyaltyRedeem(phone: string): Promise<LoyaltyAccount> {
  return apiFetch<LoyaltyAccount>("/loyalty/redeem", jsonBody({ phone_number: phone }));
}