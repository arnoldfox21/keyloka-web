"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("GlobalError", "Unhandled application error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
        Terjadi Kendala Sementara
      </h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-600">
        Maaf, sistem mengalami gangguan saat memuat halaman ini. Silakan muat ulang atau kembali ke beranda.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition"
        >
          <RotateCcw className="h-4 w-4" />
          Coba Lagi
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
        >
          <Home className="h-4 w-4" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
