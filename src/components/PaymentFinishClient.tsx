"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

interface PaymentFinishClientProps {
  orderId: string;
  txStatus: string;
  targetHref: string;
  targetLabel: string;
  isTopupOrder: boolean;
}

export function PaymentFinishClient({
  orderId,
  txStatus,
  targetHref,
  targetLabel,
  isTopupOrder,
}: PaymentFinishClientProps) {
  const router = useRouter();
  const normalizedStatus = txStatus.toLowerCase();
  const isSuccess = normalizedStatus === "paid" || normalizedStatus === "00";
  const isFailed =
    normalizedStatus === "failed" ||
    normalizedStatus === "expired" ||
    normalizedStatus === "02";

  const [syncing, setSyncing] = useState(isTopupOrder && Boolean(orderId));
  const [countdown, setCountdown] = useState<number | null>(
    isSuccess ? 4 : null,
  );

  const destinationHref = isSuccess
    ? targetHref === "/bookings"
      ? "/bookings?payment=success"
      : `${targetHref}?payment=success`
    : targetHref;

  useEffect(() => {
    if (!isTopupOrder || !orderId) return;
    let active = true;
    (async () => {
      try {
        await fetch(`/api/proxy/wallet/topup/${encodeURIComponent(orderId)}/sync`, {
          method: "POST",
        });
      } catch {
        // Abaikan jika gagal sync manual; callback Duitku tetap memproses di background
      } finally {
        if (active) setSyncing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isTopupOrder, orderId]);

  useEffect(() => {
    if (!isSuccess || countdown === null) return;
    if (countdown <= 0) {
      router.push(destinationHref);
      router.refresh();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, destinationHref, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
          {isSuccess ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          ) : isFailed ? (
            <XCircle className="h-8 w-8 text-red-600" />
          ) : (
            <Clock className="h-8 w-8 text-amber-600" />
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          {isSuccess
            ? "Pembayaran Berhasil"
            : isFailed
              ? "Pembayaran Tidak Selesai"
              : "Pembayaran Sedang Diproses"}
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          {isSuccess
            ? isTopupOrder
              ? "Terima kasih! Saldo kredit iklan Anda sedang disinkronkan dan Anda akan diarahkan ke dashboard."
              : "Terima kasih! Pembayaran Anda telah diterima. Anda akan diarahkan ke halaman status booking."
            : isFailed
              ? "Transaksi dibatalkan, ditolak, atau kedaluwarsa. Anda dapat mencoba membayar ulang atau memeriksa status terbaru."
              : "Status pembayaran sedang disinkronkan. Klik tombol di bawah untuk melihat status terbaru."}
        </p>

        {orderId && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-500">
            Order ID: {orderId}
          </p>
        )}

        {syncing && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Menyinkronkan status pembayaran...
          </p>
        )}

        {isSuccess && countdown !== null && countdown > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            Mengarahkan otomatis dalam{" "}
            <span className="font-bold text-emerald-700">{countdown}</span> detik...
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={destinationHref}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            {targetLabel}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
