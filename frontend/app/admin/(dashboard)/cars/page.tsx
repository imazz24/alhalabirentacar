"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { adminDeleteCar, adminListCars } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { Car } from "@/types";
import { CarStatusBadge } from "@/components/ui/Badges";
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from "@/components/admin/ui";
import FleetPricing from "@/components/admin/FleetPricing";
import FleetDiscount from "@/components/admin/FleetDiscount";
import InlinePrice from "@/components/admin/InlinePrice";
import InlineDiscount from "@/components/admin/InlineDiscount";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 10;

const CATEGORIES = ["Economy", "Sedan", "SUV", "Luxury", "Sports", "Van"];

export default function AdminCarsPage() {
  const { t } = useI18n();
  const [cars, setCars] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminListCars({ page, page_size: PAGE_SIZE, search, status: statusFilter }, token)
      .then((result) => {
        setCars(result.items);
        setTotal(result.total);
      })
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleDelete() {
    if (!deleteTarget) return;
    const token = getAdminToken();
    if (!token) return;
    setDeleting(true);
    try {
      await adminDeleteCar(deleteTarget.id, token);
      toast.success(t("admin.cars.deleted"));
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
        title={t("admin.cars.title")}
        subtitle={
          total === 1
            ? t("admin.cars.subtitle", { total })
            : t("admin.cars.subtitlePlural", { total })
        }
        action={
          <div className="flex flex-wrap gap-2">
            <FleetPricing categories={CATEGORIES} onDone={load} />
            <FleetDiscount categories={CATEGORIES} onDone={load} />
            <Link href="/admin/cars/new" className="btn-accent py-2.5! text-sm">
              <Plus className="h-4 w-4" /> {t("admin.cars.addCar")}
            </Link>
          </div>
        }
      />

      <div className="card mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10!"
              placeholder={t("admin.cars.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">{t("status.allStatuses")}</option>
            <option value="AVAILABLE">{t("status.available")}</option>
            <option value="RESERVED">{t("status.reserved")}</option>
            <option value="RENTED">{t("status.rented")}</option>
            <option value="MAINTENANCE">{t("status.maintenance")}</option>
            <option value="INACTIVE">{t("status.inactive")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : cars.length === 0 ? (
        <EmptyState title={t("errors.emptyCars")} text={t("errors.emptyCarsText")} action={<Link href="/admin/cars/new" className="btn-accent py-2.5! text-sm"><Plus className="h-4 w-4" /> {t("admin.cars.addCar")}</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{t("admin.cars.colCar")}</th>
                  <th className="px-5 py-3.5">{t("admin.cars.colCategory")}</th>
                  <th className="px-5 py-3.5">{t("admin.cars.colDaily")}</th>
                  <th className="px-5 py-3.5">{t("admin.cars.colDiscount")}</th>
                  <th className="px-5 py-3.5">{t("common.status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cars.map((car) => {
                  const image = car.images.find((img) => img.is_main) ?? car.images[0];
                  return (
                    <tr key={car.id} className="hover:bg-surface-2/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {image ? (
                            <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                              <Image src={image.image_url} alt={car.name} fill sizes="64px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-11 w-16 items-center justify-center rounded-lg bg-surface text-lg">——</div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{car.name}</p>
                            <p className="text-xs text-slate-500">{car.year} ··· {car.transmission}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{car.category}</td>
                      <td className="px-5 py-3.5">
                        <InlinePrice
                          car={car}
                          onSaved={(updated) =>
                            setCars((list) => list.map((item) => (item.id === updated.id ? updated : item)))
                          }
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <InlineDiscount
                          car={car}
                          onSaved={(updated) =>
                            setCars((list) => list.map((item) => (item.id === updated.id ? updated : item)))
                          }
                        />
                      </td>
                      <td className="px-5 py-3.5"><CarStatusBadge status={car.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/cars/${car.id}/edit`} className="rounded-lg p-2 text-slate-500 transition hover:bg-primary/5 hover:text-accent" title={t("admin.cars.editTitle")}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button onClick={() => setDeleteTarget(car)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" title={t("admin.cars.deleteTitle")}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={Boolean(deleteTarget)} title={t("admin.cars.deleteModalTitle")} onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600">
          {t("admin.cars.deleteConfirm", { name: deleteTarget?.name ?? "" })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-outline py-2.5! text-sm">{t("common.cancel")}</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger py-2.5! text-sm">
            {deleting ? t("common.deleting") : t("admin.cars.deleteModalTitle")}
          </button>
        </div>
      </Modal>
    </div>
  );
}