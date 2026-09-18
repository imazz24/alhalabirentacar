import { Suspense } from "react";
import CarsPageClient, { CarGridSkeleton } from "./CarsPageClient";
import { getCarsMeta } from "@/services/cars";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return { title: translate(locale, "cars.browseTitle") + " | Al Halabi Rent" };
}

export default async function CarsPage() {
  const meta = await getCarsMeta();
  return (
    <Suspense fallback={<CarGridSkeleton />}>
      <CarsPageClient meta={meta} />
    </Suspense>
  );
}