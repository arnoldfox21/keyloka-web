import { redirect } from "next/navigation";
import { BookingsClient } from "@/components/BookingsClient";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Booking, LoyaltySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const [bookings, loyalty] = await Promise.all([
    serverFetch<Booking[]>("/bookings").catch(() => [] as Booking[]),
    serverFetch<LoyaltySummary>("/bookings/loyalty/me").catch(() => null),
  ]);

  return <BookingsClient initialBookings={bookings} loyalty={loyalty} />;
}
