import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookingsClient } from "@/components/BookingsClient";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Booking, LoyaltySummary, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Booking Saya");

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const user = await serverFetch<UserProfile>("/auth/me").catch(() => null);
  if (!user) {
    redirect("/login");
  }

  const role = (user.role || "").toUpperCase();
  const isOwner = role === "PEMILIK_KOST";
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";

  const bookingsEndpoint = isOwner
    ? `/bookings?ownerId=${user.id}`
    : isStaffOrAdmin
      ? "/bookings?all=true"
      : "/bookings";

  const [params, bookings, loyalty] = await Promise.all([
    searchParams,
    serverFetch<Booking[]>(bookingsEndpoint).catch(() => [] as Booking[]),
    isOwner || isStaffOrAdmin
      ? Promise.resolve(null)
      : serverFetch<LoyaltySummary>("/bookings/loyalty/me").catch(() => null),
  ]);

  return (
    <BookingsClient
      initialBookings={bookings}
      loyalty={loyalty}
      initialPaymentStatus={params.payment}
      userRole={role}
      ownerId={isOwner ? user.id : undefined}
    />
  );
}
