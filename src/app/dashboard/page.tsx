import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Booking, Kost, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Dashboard");

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialCreated = resolvedSearchParams?.created === "1";
  const initialUpdated = resolvedSearchParams?.updated === "1";
  const initialTab = resolvedSearchParams?.tab?.toUpperCase();

  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const user = await serverFetch<UserProfile>("/auth/me").catch(() => null);
  if (!user) {
    redirect("/login");
  }

  const role = (user.role || "").toUpperCase();
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";
  const canAccess = role === "PEMILIK_KOST" || isStaffOrAdmin;
  if (!canAccess) {
    redirect("/bookings");
  }

  const [myKostsRes, bookingsRes, walletRes, myPayoutsRes, pendingRes, allPayoutsRes, reviewReportsRes] =
    await Promise.all([
      serverFetch<Kost[] | { data: Kost[]; total?: number; hasMore?: boolean }>(
        isStaffOrAdmin
          ? "/kosts?includePending=true&page=1&limit=24&sortBy=newest"
          : `/kosts?ownerId=${user.id}&includePending=true&page=1&limit=24&sortBy=newest`,
      ).catch(() => []),
      serverFetch<Booking[]>(
        isStaffOrAdmin
          ? "/bookings?all=true&page=1&limit=30"
          : `/bookings?ownerId=${user.id}&page=1&limit=30`,
      ).catch(() => []),
      serverFetch<{
        creditBalance: number;
        payoutBalance: number;
        transactions?: Array<{
          id: number;
          amount: number;
          type: string;
          description: string;
          status?: string;
          referenceId?: string | null;
          createdAt: string;
        }>;
      }>("/wallet/me").catch(() => ({
        creditBalance: 0,
        payoutBalance: 0,
        transactions: [],
      })),
      serverFetch<Array<{
        id: number;
        amount: number;
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        status: string;
        adminNote?: string;
        createdAt: string;
      }>>("/wallet/payout-requests/me").catch(() => []),
      isStaffOrAdmin
        ? serverFetch<Kost[] | { data: Kost[] }>(
            "/kosts?approvalStatus=PENDING&includePending=true",
          ).catch(() => [])
        : Promise.resolve([]),
      isStaffOrAdmin
        ? serverFetch<Array<{
            id: number;
            amount: number;
            bankName: string;
            accountNumber: string;
            accountHolder: string;
            status: string;
            adminNote?: string;
            ownerName?: string;
            ownerEmail?: string;
            createdAt: string;
          }>>("/wallet/payout-requests").catch(() => [])
        : Promise.resolve([]),
      isStaffOrAdmin
        ? serverFetch<Array<{
            id: number;
            reviewId: number;
            kostId: number;
            kostName: string;
            reporterName: string;
            reason: string;
            details?: string;
            reviewComment: string;
            reviewAuthorName: string;
            reviewOverallRating: number;
            createdAt: string;
          }>>("/reviews/reports").catch(() => [])
        : Promise.resolve([]),
    ]);

  const initialMyKosts = Array.isArray(myKostsRes)
    ? myKostsRes
    : myKostsRes.data || [];
  const initialKostsTotal = Array.isArray(myKostsRes)
    ? myKostsRes.length
    : Number(myKostsRes.total ?? initialMyKosts.length);
  const initialKostsHasMore = Array.isArray(myKostsRes)
    ? false
    : Boolean(myKostsRes.hasMore);
  const initialBookingsHasMore = Array.isArray(bookingsRes) && bookingsRes.length >= 30;
  const initialPendingKosts = Array.isArray(pendingRes)
    ? pendingRes
    : pendingRes.data || [];

  return (
    <DashboardClient
      currentUser={user}
      initialMyKosts={initialMyKosts}
      initialKostsTotal={initialKostsTotal}
      initialKostsHasMore={initialKostsHasMore}
      initialBookings={bookingsRes}
      initialBookingsHasMore={initialBookingsHasMore}
      initialCreditBalance={walletRes.creditBalance}
      initialPayoutBalance={walletRes.payoutBalance}
      initialWalletTransactions={walletRes.transactions || []}
      initialMyPayouts={myPayoutsRes}
      initialPendingKosts={initialPendingKosts}
      initialAllPayouts={allPayoutsRes}
      initialReviewReports={reviewReportsRes}
      initialCreated={initialCreated}
      initialUpdated={initialUpdated}
      initialTab={initialTab}
    />
  );
}
