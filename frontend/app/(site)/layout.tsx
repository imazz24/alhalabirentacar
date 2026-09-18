import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Toaster } from "@/components/ui/Toaster";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster />
    </div>
  );
}