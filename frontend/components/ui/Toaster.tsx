"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, getToasts, subscribe, type ToastItem } from "./toast-store";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const sync = () => setItems([...getToasts()]);
    sync();
    return subscribe(sync);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur ${
            item.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
              : item.type === "error"
                ? "border-red-500/30 bg-red-500/12 text-red-300"
                : "border-line bg-surface/95 text-ink"
          }`}
        >
          {item.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : item.type === "error" ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
          <button onClick={() => dismissToast(item.id)} className="shrink-0 opacity-50 transition hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}