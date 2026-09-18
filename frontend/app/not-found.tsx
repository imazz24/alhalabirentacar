import Link from "next/link";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = (key: string) => translate(locale, key);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <p className="text-6xl">🚗</p>
      <h1 className="mt-5 text-3xl font-extrabold text-ink">{t("notfound.title")}</h1>
      <p className="mt-2 max-w-md text-slate-500">
        {t("notfound.text")}
      </p>
      <Link href="/" className="btn-accent mt-6">
        {t("notfound.home")}
      </Link>
    </div>
  );
}