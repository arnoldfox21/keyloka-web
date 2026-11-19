import { PaymentFinishClient } from "@/components/PaymentFinishClient";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const upperOrderId = orderId.toUpperCase();

  let userRole = "";
  const token = await getServerToken();
  if (token) {
    try {
      const user = await serverFetch<UserProfile>("/auth/me");
      userRole = (user?.role || "").toUpperCase();
    } catch {
      // Abaikan jika session tidak tersedia
    }
  }

  const isTopupOrder =
    upperOrderId.includes("TOPUP") || upperOrderId.includes("WALLET");
  const isDashboardRole =
    userRole === "PEMILIK_KOST" ||
    userRole === "STAFF" ||
    userRole === "ADMINISTRATOR";

  // Booking selalu diarahkan ke /bookings kecuali jelas transaksi top-up oleh pengelola
  const isBookingTarget =
    upperOrderId.includes("BOOK") || (!isTopupOrder && !isDashboardRole);

  const targetHref = isBookingTarget ? "/bookings" : "/dashboard";
  const targetLabel = isBookingTarget
    ? "Lihat Status Booking"
    : "Kembali ke Dashboard";

  return (
    <PaymentFinishClient
      orderId={orderId}
      txStatus={txStatus}
      targetHref={targetHref}
      targetLabel={targetLabel}
      isTopupOrder={isTopupOrder}
    />
  );
}
