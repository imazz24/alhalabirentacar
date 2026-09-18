import { apiFetch } from "@/lib/api";
import type { Car, CarListResponse, CarsMeta } from "@/types";

export interface CarFilters {
  category?: string;
  transmission?: string;
  passengers?: number;
  brand?: string;
  min_price?: number;
  max_price?: number;
}

export async function getCars(
  filters: CarFilters = {},
  page = 1,
  pageSize = 12,
): Promise<CarListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return apiFetch<CarListResponse>(`/cars?${params.toString()}`);
}

export async function searchCars(
  filters: CarFilters & { pickup_date?: string; return_date?: string },
  page = 1,
  pageSize = 12,
): Promise<CarListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return apiFetch<CarListResponse>(`/cars/search?${params.toString()}`);
}

export async function getCar(id: number): Promise<Car> {
  return apiFetch<Car>(`/cars/${id}`);
}

export async function getSimilarCars(id: number, limit = 4): Promise<Car[]> {
  return apiFetch<Car[]>(`/cars/${id}/similar?limit=${limit}`);
}

export async function getCarsMeta(): Promise<CarsMeta> {
  return apiFetch<CarsMeta>("/cars/meta");
}