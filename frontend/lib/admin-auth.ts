const TOKEN_KEY = "alhalabi_admin_token";
const ADMIN_KEY = "alhalabi_admin_user";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredAdmin(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(token: string, admin: Record<string, unknown>): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}