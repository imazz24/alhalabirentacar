"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { adminLogin } from "@/services/admin";
import { storeAuth } from "@/lib/admin-auth";
import { toast } from "@/components/ui/toast-store";
import { Toaster } from "@/components/ui/Toaster";
import ThemeToggle from "@/components/site/ThemeToggle";
import { useI18n } from "@/lib/i18n";

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await adminLogin(email.trim(), password);
      storeAuth(response.access_token, response.admin as unknown as Record<string, unknown>);
      toast.success(t("admin.login.welcome", { name: response.admin.full_name }));
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <Toaster />

      {/* Gold wash behind the card, the same treatment as the site's dark bands. */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> {t("admin.login.back")}
          </Link>
          <ThemeToggle />
        </div>

        <div className="card gold-edge p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-full overflow-hidden rounded-2xl bg-primary px-4 py-5">
              <Image
                src="/halabilogo.jpeg"
                alt="Al Halabi Rent"
                width={1500}
                height={1163}
                priority
                className="mx-auto h-16 w-auto"
              />
            </div>
            <span className="rule-gold mt-5" aria-hidden />
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-ink">{t("admin.login.title")}</h1>
            <p className="mt-1 text-xs text-slate-500">{t("admin.login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label flex items-center gap-1" htmlFor="admin-email">
                <Mail className="h-3.5 w-3.5 text-accent" /> {t("admin.login.email")}
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                className="input"
                placeholder="admin@alhalabirent.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label flex items-center gap-1" htmlFor="admin-password">
                <Lock className="h-3.5 w-3.5 text-accent" /> {t("admin.login.password")}
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent"
                  aria-label={t("admin.login.togglePassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-accent w-full py-3.5!">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("admin.login.signIn")}
            </button>
          </form>

          <p className="mt-6 rounded-xl border border-line bg-surface-2 p-3 text-center text-xs text-slate-500">
            {t("admin.login.default", { email: "admin@alhalabirent.com", password: "Admin@2026" })}
            <span className="mt-1 block text-[11px] text-slate-400">{t("admin.login.changeHint")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
