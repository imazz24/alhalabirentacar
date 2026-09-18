import { apiFetch } from "@/lib/api";
import type { CompanySettings } from "@/types";

export async function getPublicSettings(): Promise<CompanySettings> {
  return apiFetch<CompanySettings>("/settings");
}