"use client";

import { useRouter } from "next/navigation";
import { adminCreateCar } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import CarForm from "@/components/admin/CarForm";
import type { CarSubmitValues } from "@/components/admin/CarForm";
import { useI18n } from "@/lib/i18n";

export default function NewCarPage() {
  const { t } = useI18n();
  const router = useRouter();

  async function handleSubmit(values: CarSubmitValues) {
    const token = getAdminToken();
    if (!token) return;
    const car = await adminCreateCar(values, token);
    router.push(`/admin/cars/${car.id}/edit`);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink">{t("admin.cars.addNew")}</h1>
      <CarForm onSubmit={handleSubmit} submittingLabel={t("admin.cars.createCar")} />
    </div>
  );
}