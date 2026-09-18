import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCar } from "@/services/cars";
import { getLocations } from "@/services/locations";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata = {
  title: "Book a Car | Al Halabi Rent",
};

export default async function BookingPage({ params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  const carIdNumber = Number(carId);

  let car;
  try {
    car = await getCar(carIdNumber);
  } catch {
    notFound();
  }

  const locations = await getLocations();

  return (
    <div className="bg-surface/60 min-h-screen pb-16">
      <div className="container-site py-10">
        <Suspense>
          <BookingWizard car={car} locations={locations} />
        </Suspense>
      </div>
    </div>
  );
}