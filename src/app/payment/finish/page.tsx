import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export default async function PaymentFinishPage({
  searchParams,
}: {
  searchParams: Promise<{
    order_id?: string;
    transaction_status?: string;
    status_code?: string;
  }>;
}) {
  const params = await searchParams;
  const txStatus = (params.transaction_status || "").toLowerCase();
  const orderId = params.order_id || "";

  const isSuccess = txStatus === "settlement" || txStatus === "capture";
  const isFailed =
    txStatus === "cancel" || txStatus === "deny" || txStatus === "expire" || txStatus === "failure";

  const targetHref = orderId.startsWith("HNV-BOOK-") ? "/bookings" : "/dashboard";
  const targetLabel = orderId.startsWith("HNV-BOOK-")
    ? "Lihat Status Booking"
    : "Kembali ke Dashboard";

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
            ? "Terima kasih! Pembayaran Anda telah diterima oleh Midtrans. Silakan cek status terbaru pada halaman booking Anda."
            : isFailed
              ? "Transaksi dibatalkan, ditolak, atau kedaluwarsa. Anda dapat mencoba membayar ulang atau memeriksa status booking."
              : "Status pembayaran sedang disinkronkan. Klik tombol di bawah untuk melihat status terbaru."}
        </p>

        {orderId && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-500">
            Order ID: {orderId}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={targetHref}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {targetLabel}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
