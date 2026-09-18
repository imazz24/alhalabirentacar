import { apiFetch } from "@/lib/api";
import type { Location } from "@/types";

export async function getLocations(): Promise<Location[]> {
  return apiFetch<Location[]>("/locations");
}