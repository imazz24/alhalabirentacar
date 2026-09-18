"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetMe, adminUpdateCar } from "@/services/admin";
import { getCar } from "@/services/cars";
import { getAdminToken } from "@/lib/admin-auth";
import type { Car } from "@/types";
import CarForm from "@/components/admin/CarForm";
import CarImageManager from "@/components/admin/CarImageManager";
import type { CarSubmitValues } from "@/components/admin/CarForm";
import { LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

interface EditCarPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCarPage({ params }: EditCarPageProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        const [data] = await Promise.all([getCar(Number(id)), adminGetMe(getAdminToken() ?? "").catch(() => null)]);
        if (!cancelled) setCar(data);
      } catch (err) {
        showErrorToast(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (loading) return <LoadingSpinner />;
  if (!car) return <EmptyState title={t("errors.carNotFound")} text={t("errors.carDeleted")} action={<button onClick={() => router.push("/admin/cars")} className="btn-outline py-2.5! text-sm">{t("errors.backToCars")}</button>} />;

  const currentCar = car;

  async function handleFormSubmit(values: CarSubmitValues) {
    const token = getAdminToken();
    if (!token) return;
    await adminUpdateCar(currentCar.id, values, token);
    const updated = await getCar(currentCar.id);
    setCar(updated);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold text-ink">{t("admin.cars.editCar", { name: car.name })}</h1>

      <CarForm initial={car} onSubmit={handleFormSubmit} submittingLabel={t("admin.cars.updateCar")} />

      <CarImageManager car={currentCar} onChange={setCar} />

    </div>
  );
}