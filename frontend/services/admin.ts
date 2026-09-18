import { apiFetch, jsonBody } from "@/lib/api";
import type {
  Admin,
  Booking,
  BookingListResponse,
  Car,
  CarListResponse,
  CompanySettings,
  CustomerWithStats,
  DashboardData,
  Location,
  LoyaltyListResponse,
  Paged,
  RentalReport,
  RentalReportData,
  RentalReportListResponse,
  TokenResponse,
} from "@/types";

export async function adminLogin(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/admin/login", jsonBody({ email, password }));
}

export function adminGetMe(token: string): Promise<Admin> {
  return apiFetch<Admin>("/admin/me", undefined, token);
}

export function getDashboard(token: string): Promise<DashboardData> {
  return apiFetch<DashboardData>("/admin/dashboard", undefined, token);
}

export interface AdminListOptions {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  category?: string;
}

export function adminListCars(options: AdminListOptions = {}, token: string): Promise<CarListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return apiFetch<CarListResponse>(`/admin/cars?${params.toString()}`, undefined, token);
}

export type CarPayload = Partial<{
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel_type: string;
  passengers: number;
  doors: number;
  luggage_capacity: number;
  has_air_conditioning: boolean;
  daily_price: number;
  discount_daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  description: string;
  status: string;
}>;

export function adminCreateCar(payload: CarPayload, token: string): Promise<Car> {
  return apiFetch<Car>("/admin/cars", jsonBody(payload), token);
}

export function adminUpdateCar(id: number, payload: CarPayload, token: string): Promise<Car> {
  return apiFetch<Car>(`/admin/cars/${id}`, { ...jsonBody(payload), method: "PUT" }, token);
}

export interface BulkPricePayload {
  category?: string;
  percent?: number;
  set_price?: number;
  min_price?: number;
  include_weekly_monthly?: boolean;
}

export function adminBulkPrice(
  payload: BulkPricePayload,
  token: string,
): Promise<{ updated: number; category: string | null }> {
  return apiFetch<{ updated: number; category: string | null }>("/admin/cars/bulk-price", jsonBody(payload), token);
}

export interface BulkDiscountPayload {
  /** Restrict the discount to one category; omit for every car. */
  category?: string;
  /** Percentage off the daily price, e.g. 10 means "10% off". */
  percent?: number;
  /** Clear the discount on the matching cars instead of applying one. */
  remove?: boolean;
}

export function adminBulkDiscount(
  payload: BulkDiscountPayload,
  token: string,
): Promise<{ updated: number; category: string | null }> {
  return apiFetch<{ updated: number; category: string | null }>("/admin/cars/discount", jsonBody(payload), token);
}

export function adminDeleteCar(id: number, token: string): Promise<void> {
  return apiFetch<void>(`/admin/cars/${id}`, { method: "DELETE" }, token);
}

export interface CarImageMeta {
  /** Which side of the car the photo shows. */
  angle: string;
  /** Set only when the photo shows one specific paint colour. */
  colorName?: string | null;
  colorHex?: string | null;
}

export function adminUploadCarImage(
  carId: number,
  file: File,
  isMain: boolean,
  meta: CarImageMeta,
  token: string,
): Promise<Car> {
  const form = new FormData();
  form.append("file", file);
  const query = new URLSearchParams({ is_main: String(isMain), angle: meta.angle });
  if (meta.colorName) query.set("color_name", meta.colorName);
  if (meta.colorHex) query.set("color_hex", meta.colorHex);
  return apiFetch<Car>(`/admin/cars/${carId}/images?${query.toString()}`, { method: "POST", body: form }, token);
}

export function adminUpdateCarImage(
  carId: number,
  imageId: number,
  payload: { angle?: string; color_name?: string | null; color_hex?: string | null; sort_order?: number },
  token: string,
): Promise<Car> {
  return apiFetch<Car>(
    `/admin/cars/${carId}/images/${imageId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export function adminDeleteCarImage(imageId: number, token: string): Promise<void> {
  return apiFetch<void>(`/admin/cars/images/${imageId}`, { method: "DELETE" }, token);
}

export function adminSetMainImage(carId: number, imageId: number, token: string): Promise<Car> {
  return apiFetch<Car>(`/admin/cars/${carId}/images/${imageId}/main`, { method: "PUT" }, token);
}

export interface AdminBookingOptions {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export function adminListBookings(options: AdminBookingOptions = {}, token: string): Promise<BookingListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return apiFetch<BookingListResponse>(`/admin/bookings?${params.toString()}`, undefined, token);
}

/** Cars that are out with a customer and due back within `hours`. */
export function adminDueReturns(hours: number, token: string): Promise<Booking[]> {
  return apiFetch<Booking[]>(`/admin/bookings/due-returns?hours=${hours}`, undefined, token);
}

export function adminGetBooking(id: number, token: string): Promise<Booking> {
  return apiFetch<Booking>(`/admin/bookings/${id}`, undefined, token);
}

export function adminUpdateBooking(
  id: number,
  payload: { status?: string; final_price?: number; admin_notes?: string },
  token: string,
): Promise<Booking> {
  return apiFetch<Booking>(`/admin/bookings/${id}`, { ...jsonBody(payload), method: "PUT" }, token);
}

export function adminListCustomers(
  options: AdminListOptions = {},
  token: string,
): Promise<Paged<CustomerWithStats>> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return apiFetch<Paged<CustomerWithStats>>(`/admin/customers?${params.toString()}`, undefined, token);
}

export function adminGetCustomer(id: number, token: string): Promise<{ customer: CustomerWithStats; bookings: Booking[] }> {
  return apiFetch(`/admin/customers/${id}`, undefined, token);
}

export function adminListLocations(token: string): Promise<Location[]> {
  return apiFetch<Location[]>("/admin/locations", undefined, token);
}

export interface AdminLoyaltyOptions {
  page?: number;
  page_size?: number;
  search?: string;
  redeemed_only?: boolean;
}

export function adminListLoyalty(options: AdminLoyaltyOptions = {}, token: string): Promise<LoyaltyListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return apiFetch<LoyaltyListResponse>(`/admin/loyalty?${params.toString()}`, undefined, token);
}

export interface LocationPayload {
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

export function adminCreateLocation(payload: LocationPayload, token: string): Promise<Location> {
  return apiFetch<Location>("/admin/locations", jsonBody(payload), token);
}

export function adminUpdateLocation(id: number, payload: Partial<LocationPayload>, token: string): Promise<Location> {
  return apiFetch<Location>(`/admin/locations/${id}`, { ...jsonBody(payload), method: "PUT" }, token);
}

export function adminDeleteLocation(id: number, token: string): Promise<void> {
  return apiFetch<void>(`/admin/locations/${id}`, { method: "DELETE" }, token);
}

export function getAdminSettings(token: string): Promise<CompanySettings> {
  return apiFetch<CompanySettings>("/admin/settings", undefined, token);
}

export function updateAdminSettings(payload: Partial<CompanySettings>, token: string): Promise<CompanySettings> {
  return apiFetch<CompanySettings>("/admin/settings", { ...jsonBody(payload), method: "PUT" }, token);
}

export type RentalReportPayload = Partial<{
  report_date: string;
  client_name: string;
  client_phone: string;
  data: RentalReportData;
}>;

export function adminListReports(
  options: AdminBookingOptions = {},
  token: string,
): Promise<RentalReportListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return apiFetch<RentalReportListResponse>(`/admin/reports?${params.toString()}`, undefined, token);
}

export function adminGetReport(id: number, token: string): Promise<RentalReport> {
  return apiFetch<RentalReport>(`/admin/reports/${id}`, undefined, token);
}

export function adminCreateReport(payload: RentalReportPayload, token: string): Promise<RentalReport> {
  return apiFetch<RentalReport>("/admin/reports", jsonBody(payload), token);
}

export function adminUpdateReport(id: number, payload: RentalReportPayload, token: string): Promise<RentalReport> {
  return apiFetch<RentalReport>(`/admin/reports/${id}`, { ...jsonBody(payload), method: "PUT" }, token);
}

export function adminDeleteReport(id: number, token: string): Promise<void> {
  return apiFetch<void>(`/admin/reports/${id}`, { method: "DELETE" }, token);
}