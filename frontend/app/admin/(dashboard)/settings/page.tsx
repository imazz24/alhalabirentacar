"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { getAdminSettings, updateAdminSettings } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { CompanySettings } from "@/types";
import { PageHeader, LoadingSpinner } from "@/components/admin/ui";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CompanySettings>>({});

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    getAdminSettings(token)
      .then((data) => {
        setSettings(data);
        setForm(data);
      })
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof CompanySettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateAdminSettings(form, token);
      setSettings(updated);
      setForm(updated);
      toast.success(t("admin.settings.saved"));
    } catch (err) {
      showErrorToast(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!settings) return null;

  const field = (label: string, key: keyof CompanySettings, placeholder = "") => (
    <div>
      <label className="label">{label}</label>
      <input className="input" placeholder={placeholder} value={form[key] ?? ""} onChange={(e) => updateField(key, e.target.value)} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title={t("admin.settings.title")}
        subtitle={t("admin.settings.subtitle")}
        action={
          <button onClick={handleSave} disabled={saving} className="btn-accent py-2.5! text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("admin.settings.save")}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.settings.company")}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {field(t("admin.settings.companyName"), "company_name", "Al Halabi Rent")}
            {field(t("admin.settings.currency"), "currency", "$")}
            {field(t("admin.settings.workingHours"), "working_hours", "Mon - Sat: 9:00 AM - 6:00 PM")}
            {field(t("admin.settings.address"), "address", "Beirut, Lebanon")}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.settings.contactWhatsapp")}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {field(t("admin.settings.phoneNumber"), "phone_number", "+961 70 000 000")}
            {field(t("admin.settings.whatsappNumber"), "whatsapp_number", "96170000000")}
            <div className="sm:col-span-2">{field(t("admin.settings.email"), "email", "info@company.com")}</div>
          </div>
          <p className="mt-4 rounded-xl bg-accent/10 p-3 text-xs text-accent-dark">
            {t("admin.settings.whatsappHint")}
          </p>
        </section>

        <section className="card p-6 xl:col-span-2">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.settings.social")}</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {field(t("admin.settings.facebook"), "facebook_url", "https://facebook.com/...")}
            {field(t("admin.settings.instagram"), "instagram_url", "https://instagram.com/...")}
            {field(t("admin.settings.twitter"), "twitter_url", "https://twitter.com/...")}
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-accent px-8!">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("admin.settings.save")}
        </button>
      </div>
    </div>
  );
}