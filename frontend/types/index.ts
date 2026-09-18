export type CarStatus = "AVAILABLE" | "RESERVED" | "RENTED" | "MAINTENANCE" | "INACTIVE";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "RESERVED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface CarImage {
  id: number;
  image_url: string;
  /** Which side of the car the photo shows — "Front", "Side", "Rear"... */
  angle: string;
  /** Set when the photo shows one specific paint colour. */
  color_name: string | null;
  color_hex: string | null;
  is_main: boolean;
  sort_order: number;
}

export interface Car {
  id: number;
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
  /** Promotional per-day rate: shown struck-through on site when set (below daily). */
  discount_daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  description: string | null;
  status: CarStatus;
  name: string;
  images: CarImage[];
}

export interface CarListResponse {
  items: Car[];
  total: number;
  page: number;
  page_size: number;
}

export interface CarsMeta {
  categories: string[];
  transmissions: string[];
  brands: string[];
  image_angles: string[];
}

export interface Location {
  id: number;
  name: string;
  address: string | null;
  /** Where the office sits on the map, when the owner has placed it. */
  latitude: number | null;
  longitude: number | null;
  /** True for a point a customer dropped on the map for one booking. */
  is_custom?: boolean;
  is_active: boolean;
}

export interface CustomPoint {
  label: string | null;
  latitude: number;
  longitude: number;
}

export interface Customer {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  created_at: string;
}

export interface CustomerWithStats extends Customer {
  total_bookings: number;
  active_rentals: number;
  last_booking: string | null;
}

export interface LoyaltyAccount {
  id: number;
  phone_number: string;
  loyalty_code: string;
  points_balance: number;
  total_points_earned: number;
  /** Unused 5%-off vouchers bought with 1,000 points each. */
  pending_discounts: number;
  created_at: string;
}

export interface LoyaltyEarnResult {
  phone_number: string;
  loyalty_code: string;
  points_earned: number;
  points_balance: number;
}

export interface LoyaltyListResponse extends Paged<LoyaltyAccount> {
  total_points: number;
}

export interface Booking {
  id: number;
  booking_reference: string;
  customer_id: number;
  car_id: number;
  pickup_location_id: number;
  return_location_id: number;
  pickup_datetime: string;
  return_datetime: string;
  rental_days: number;
  estimated_price: number;
  final_price: number | null;
  loyalty_phone: string | null;
  points_earned: number;
  loyalty_discount_applied: number | null;
  status: BookingStatus;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer_full_name: string;
  customer_phone: string;
  customer_email: string | null;
  car_name: string;
  pickup_location_name: string;
  return_location_name: string;
  /** Set for offices placed on the map and for customer-dropped points. */
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  return_latitude?: number | null;
  return_longitude?: number | null;
}

export interface BookingListResponse {
  items: Booking[];
  total: number;
  page: number;
  page_size: number;
}

export interface BookingCreatePayload {
  car_id: number;
  pickup_datetime: string;
  return_datetime: string;
  /** Either an office id, or a point dropped on the map — one per end. */
  pickup_location_id?: number;
  return_location_id?: number;
  pickup_custom?: CustomPoint;
  return_custom?: CustomPoint;
  full_name: string;
  phone_number: string;
  email?: string | null;
  customer_notes?: string | null;
  /** Phone number to attach this rental to the customer's loyalty account. */
  loyalty_phone?: string;
  /** Spend an already-banked 5%-off voucher on this rental. */
  redeem_discount?: boolean;
}

export interface BookingCreateResult {
  booking: Booking;
  whatsapp_url: string;
  loyalty_earned: LoyaltyEarnResult | null;
}

export interface AvailabilityResult {
  available: boolean;
  car_id: number;
  message: string;
  conflicting_booking_reference: string | null;
}

export interface Admin {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  admin: Admin;
}

export interface CompanySettings {
  company_name: string;
  logo_url: string | null;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  address: string;
  working_hours: string;
  currency: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
}

export interface DashboardStats {
  total_cars: number;
  available_cars: number;
  active_rentals: number;
  pending_requests: number;
  total_customers: number;
  monthly_revenue: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_bookings: Booking[];
  upcoming_rentals: Booking[];
  recent_customers: Customer[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReportAdditionalDriver {
  driver_name: string;
  license_no: string;
  expiry_date: string;
  issue_date: string;
  issue_place: string;
}

export interface ReportRenter {
  renters_name: string;
  mothers_name: string;
  fathers_name: string;
  nationality: string;
  birth_date: string;
  birth_place: string;
  phone: string;
  local_address: string;
  driving_license_no: string;
  license_issue_date: string;
  license_issue_place: string;
  license_expiry_date: string;
}

export interface ReportVehicle {
  plate_no: string;
  model: string;
  car_type: string;
  color: string;
  manufacture_year: string;
  frame_no: string;
  engine_no: string;
}

export interface ReportDeliveryRow {
  desc: string;
  km: string;
  date: string;
  time: string;
}

export interface ReportCharges {
  days: string;
  rent_per_day: string;
  total_rent: string;
  vat: string;
  total: string;
  prepayment: string;
  balance: string;
  deposit: string;
  payment_method: string;
}

export interface ReportSignatures {
  renter_signature: string;
  company_signature: string;
}

export interface RentalReportData {
  date: string;
  rental_type: string;
  guarantee_name: string;
  renter: ReportRenter;
  additional_drivers: ReportAdditionalDriver[];
  vehicle: ReportVehicle;
  delivery: { in: ReportDeliveryRow; out: ReportDeliveryRow };
  charges: ReportCharges;
  signatures: ReportSignatures;
}

export interface RentalReport {
  id: number;
  report_no: string;
  nr: string;
  report_date: string;
  client_name: string | null;
  client_phone: string | null;
  data: RentalReportData;
  created_at: string;
  updated_at: string;
}

export type RentalReportListResponse = Paged<RentalReport>;