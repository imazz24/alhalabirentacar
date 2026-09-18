"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Power, Save, Trash2, MapPin, X } from "lucide-react";
import { adminCreateLocation, adminDeleteLocation, adminListLocations, adminUpdateLocation } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { Location } from "@/types";
import { PageHeader, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import Modal from "@/components/ui/Modal";
import MapPicker, { type PickedPoint } from "@/components/ui/MapPicker";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

export default function AdminLocationsPage() {
  const { t } = useI18n();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<PickedPoint | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminListLocations(token)
      .then(setLocations)
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setPoint(null);
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setName(location.name);
    setAddress(location.address ?? "");
    setPoint(
      location.latitude != null && location.longitude != null
        ? { latitude: location.latitude, longitude: location.longitude, label: location.name }
        : null,
    );
    setActive(location.is_active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error(t("admin.locations.nameRequired"));
      return;
    }
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateLocation(
          editing.id,
          {
            name: name.trim(),
            address: address.trim() || undefined,
            latitude: point?.latitude ?? null,
            longitude: point?.longitude ?? null,
            is_active: active,
          },
          token,
        );
        toast.success(t("admin.locations.updated"));
      } else {
        await adminCreateLocation(
          {
            name: name.trim(),
            address: address.trim() || undefined,
            latitude: point?.latitude ?? null,
            longitude: point?.longitude ?? null,
            is_active: active,
          },
          token,
        );
        toast.success(t("admin.locations.added"));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showErrorToast(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(location: Location) {
    const token = getAdminToken();
    if (!token) return;
    try {
      await adminUpdateLocation(location.id, { is_active: !location.is_active }, token);
      load();
    } catch (err) {
      showErrorToast(err);
    }
  }

  async function handleDelete() {
    const token = getAdminToken();
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteLocation(deleteTarget.id, token);
      toast.success(t("admin.locations.deleted"));
      setDeleteTarget(null);
      load();
    } catch (err) {
      showErrorToast(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("admin.locations.title")}
        subtitle={t("admin.locations.subtitle")}
        action={
          <button onClick={openCreate} className="btn-accent py-2.5! text-sm">
            <Plus className="h-4 w-4" /> {t("admin.locations.add")}
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : locations.length === 0 ? (
        <EmptyState title={t("admin.locations.emptyTitle")} text={t("admin.locations.emptyText")} action={<button onClick={openCreate} className="btn-accent py-2.5! text-sm"><Plus className="h-4 w-4" /> {t("admin.locations.add")}</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div key={location.id} className={`card p-5 ${!location.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-ink">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{location.name}</p>
                    {location.address && <p className="mt-0.5 truncate text-xs text-slate-500">{location.address}</p>}
                  </div>
                </div>
                <span className={`badge ${location.is_active ? "bg-emerald-50 text-emerald-700" : "bg-white/5 text-slate-500"}`}>
                  {location.is_active ? t("admin.locations.active") : t("status.inactive")}
                </span>
              </div>
              <div className="mt-4 flex justify-end gap-1 border-t border-line pt-3">
                <button onClick={() => toggleActive(location)} className="rounded-lg p-2 text-slate-500 transition hover:bg-surface-2 hover:text-accent" title={location.is_active ? t("admin.locations.deactivate") : t("admin.locations.activate")}>
                  <Power className="h-4 w-4" />
                </button>
                <button onClick={() => openEdit(location)} className="rounded-lg p-2 text-slate-500 transition hover:bg-surface-2 hover:text-accent" title={t("common.edit")}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(location)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" title={t("common.delete")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modalOpen} title={editing ? t("admin.locations.editModal") : t("admin.locations.addModal")} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">{t("admin.locations.name")} *</label>
            <input className="input" placeholder={t("admin.locations.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("admin.locations.address")}</label>
            <input className="input" placeholder={t("admin.locations.addressPlaceholder")} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("admin.locations.mapPosition")}</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMapOpen(true)} className="btn-outline py-2! text-sm">
                <MapPin className="h-4 w-4" /> {point ? t("common.changeOnMap") : t("common.setOnMap")}
              </button>
              {point ? (
                <span className="font-mono text-xs text-slate-500">
                  {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                </span>
              ) : (
                <span className="text-xs text-slate-400">{t("common.notPlaced")}</span>
              )}
              {point && (
                <button
                  type="button"
                  onClick={() => setPoint(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-red-400"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {t("admin.locations.mapsHint")}
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-slate-500">{t("admin.locations.activeForBookings")}</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-outline py-2.5! text-sm">
            <X className="h-4 w-4" /> {t("common.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary py-2.5! text-sm">
            <Save className="h-4 w-4" /> {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </Modal>

      <MapPicker
        open={mapOpen}
        title={name.trim() || t("admin.locations.officeTitle")}
        initial={point}
        onCancel={() => setMapOpen(false)}
        onConfirm={(picked) => {
          setPoint(picked);
          setMapOpen(false);
        }}
      />

      {/* Delete modal */}
      <Modal open={Boolean(deleteTarget)} title={t("admin.locations.deleteModal")} onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600">
          {t("admin.locations.deleteConfirm", { name: deleteTarget?.name ?? "" })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-outline py-2.5! text-sm">{t("common.cancel")}</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger py-2.5! text-sm">
            {deleting ? t("common.deleting") : t("common.delete")}
          </button>
        </div>
      </Modal>
    </div>
  );
}