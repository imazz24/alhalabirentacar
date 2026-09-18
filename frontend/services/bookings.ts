import { apiFetch, jsonBody } from "@/lib/api";
import type { AvailabilityResult, BookingCreatePayload, BookingCreateResult } from "@/types";

export async function checkAvailability(carId: number, pickup_datetime: string, return_datetime: string): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>(
    "/bookings/check-availability",
    jsonBody({ car_id: carId, pickup_datetime, return_datetime }),
  );
}

export async function createBooking(payload: BookingCreatePayload): Promise<BookingCreateResult> {
  return apiFetch<BookingCreateResult>("/bookings", jsonBody(payload));
}