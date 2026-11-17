"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Flag,
  Gavel,
  MessageCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import {
  formatApprovalStatusLabel,
  formatBookingStatusLabel,
  formatBookingTypeLabel,
  formatCategoryLabel,
  formatEscrowStatusLabel,
  formatRupiah,
  getDisplayPrice,
  type BoostPackageOption,
  type Booking,
  type Kost,
  type UserProfile,
  type WalletTransaction,
} from "@/lib/types";

interface PayoutItem {
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
}

interface DashboardUserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isBanned?: boolean;
  isVerified?: boolean;
  verificationStatus?: string;
  verificationSurveyDate?: string;
  verificationNotes?: string;
  verificationRejectionReason?: string;
}

interface DashboardKostItem extends Kost {
  approvalStatus?: string;
  rejectionReason?: string;
}

interface ReviewReportItem {
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
}

interface DashboardClientProps {
  currentUser: UserProfile;
  initialMyKosts: DashboardKostItem[];
  initialKostsTotal: number;
  initialKostsHasMore: boolean;
  initialBookings: Booking[];
  initialBookingsHasMore: boolean;
  initialCreditBalance: number;
  initialPayoutBalance: number;
  initialWalletTransactions?: WalletTransaction[];
  initialMyPayouts: PayoutItem[];
  initialPendingKosts: DashboardKostItem[];
  initialAllPayouts: PayoutItem[];
  initialReviewReports: ReviewReportItem[];
  initialCreated?: boolean;
  initialUpdated?: boolean;
  initialTab?: string;
}

type TabKey =
  | "PROPERTIES"
  | "BOOKINGS"
  | "WALLET"
  | "APPROVAL"
  | "WITHDRAWALS"
  | "USERS";

export function DashboardClient({
  currentUser,
  initialMyKosts,
  initialKostsTotal,
  initialKostsHasMore,
  initialBookings,
  initialBookingsHasMore,
  initialCreditBalance,
  initialPayoutBalance,
  initialWalletTransactions = [],
  initialMyPayouts,
  initialPendingKosts,
  initialAllPayouts,
  initialReviewReports,
  initialCreated = false,
  initialUpdated = false,
  initialTab,
}: DashboardClientProps) {
  const role = (currentUser.role || "").toUpperCase();
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";
  const isAdmin = role === "ADMINISTRATOR";

  const validTabs: TabKey[] = isStaffOrAdmin
    ? ["PROPERTIES", "BOOKINGS", "APPROVAL", "WITHDRAWALS", "USERS"]
    : ["PROPERTIES", "BOOKINGS", "WALLET"];
  const resolvedInitialTab: TabKey =
    initialTab && validTabs.includes(initialTab as TabKey)
      ? (initialTab as TabKey)
      : initialCreated || initialUpdated
        ? "PROPERTIES"
        : isStaffOrAdmin
          ? "APPROVAL"
          : "PROPERTIES";

  const [tab, setTab] = useState<TabKey>(resolvedInitialTab);
  const [myKosts, setMyKosts] = useState<DashboardKostItem[]>(initialMyKosts);
  const [kostsTotal, setKostsTotal] = useState(initialKostsTotal);
  const [kostsPage, setKostsPage] = useState(1);
  const [kostsHasMore, setKostsHasMore] = useState(initialKostsHasMore);
  const [kostsLoading, setKostsLoading] = useState(false);
  const [kostSearch, setKostSearch] = useState("");
  const [kostCategory, setKostCategory] = useState("SEMUA");
  const [kostApproval, setKostApproval] = useState("SEMUA");
  const [kostSort, setKostSort] = useState("newest");

  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsHasMore, setBookingsHasMore] = useState(initialBookingsHasMore);
  const [bookingsLoadingMore, setBookingsLoadingMore] = useState(false);
  const [onlyDisputedBookings, setOnlyDisputedBookings] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("SEMUA");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("SEMUA");

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState("SEMUA");
  const [creditBalance, setCreditBalance] = useState(initialCreditBalance);
  const [payoutBalance, setPayoutBalance] = useState(initialPayoutBalance);
  const [myPayouts, setMyPayouts] = useState<PayoutItem[]>(initialMyPayouts);
  const [pendingKosts, setPendingKosts] =
    useState<DashboardKostItem[]>(initialPendingKosts);
  const [allPayouts, setAllPayouts] = useState<PayoutItem[]>(initialAllPayouts);
  const [reviewReports, setReviewReports] =
    useState<ReviewReportItem[]>(initialReviewReports);

  const [users, setUsers] = useState<DashboardUserItem[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("SEMUA");
  const [userPage, setUserPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState(currentUser.name || "");

  const [topupAmount, setTopupAmount] = useState("50000");
  const [boostTargetKost, setBoostTargetKost] = useState<DashboardKostItem | null>(
    null,
  );
  const [boostPackages, setBoostPackages] = useState<BoostPackageOption[]>([]);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(
    initialCreated
      ? {
          type: "ok",
          text: isStaffOrAdmin
            ? "Properti baru berhasil ditambahkan dan langsung berstatus APPROVED."
            : "Properti baru berhasil diajukan dan sedang menunggu persetujuan Staff/Admin.",
        }
      : initialUpdated
        ? {
            type: "ok",
            text: "Perubahan properti berhasil disimpan.",
          }
        : null,
  );

  function buildKostQueryString(
    nextPage: number,
    overrides?: {
      search?: string;
      category?: string;
      approval?: string;
      sortBy?: string;
    },
  ) {
    const qSearch = overrides?.search ?? kostSearch;
    const qCat = overrides?.category ?? kostCategory;
    const qApproval = overrides?.approval ?? kostApproval;
    const qSort = overrides?.sortBy ?? kostSort;

    const params = new URLSearchParams({
      includePending: "true",
      page: String(nextPage),
      limit: "24",
      sortBy: qSort,
    });
    if (!isStaffOrAdmin) {
      params.set("ownerId", String(currentUser.id));
    }
    if (qSearch.trim()) params.set("search", qSearch.trim());
    if (qCat !== "SEMUA") params.set("propertyCategory", qCat);
    if (qApproval !== "SEMUA") params.set("approvalStatus", qApproval);
    return params.toString();
  }

  async function loadKosts(
    nextPage = 1,
    append = false,
    overrides?: {
      search?: string;
      category?: string;
      approval?: string;
      sortBy?: string;
    },
  ) {
    setKostsLoading(true);
    try {
      const qs = buildKostQueryString(nextPage, overrides);
      const res = await fetch(`/api/proxy/kosts?${qs}`);
      if (!res.ok) throw new Error("Gagal memuat daftar properti.");
      const d = await res.json();
      const rows: DashboardKostItem[] = Array.isArray(d) ? d : d.data || [];
      const total = Array.isArray(d) ? rows.length : Number(d.total ?? rows.length);
      const more = Array.isArray(d) ? false : Boolean(d.hasMore);

      setMyKosts((prev) => {
        if (!append) return rows;
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...rows.filter((item) => !existingIds.has(item.id))];
      });
      setKostsTotal(total);
      setKostsHasMore(more);
      setKostsPage(nextPage);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Gagal memuat properti.",
      });
    } finally {
      setKostsLoading(false);
    }
  }

  async function loadMoreBookings() {
    const nextPage = bookingsPage + 1;
    setBookingsLoadingMore(true);
    try {
      const url = isStaffOrAdmin
        ? `/api/proxy/bookings?all=true&page=${nextPage}&limit=30`
        : `/api/proxy/bookings?ownerId=${currentUser.id}&page=${nextPage}&limit=30`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal memuat booking lainnya.");
      const list: Booking[] = await res.json();
      setBookings((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...list.filter((item) => !existingIds.has(item.id))];
      });
      setBookingsPage(nextPage);
      setBookingsHasMore(Array.isArray(list) && list.length >= 30);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Gagal memuat booking.",
      });
    } finally {
      setBookingsLoadingMore(false);
    }
  }

  async function refreshDashboardData() {
    setBusy(true);
    try {
      const kostQs = buildKostQueryString(1);
      const requests: Array<Promise<Response>> = [
        fetch(`/api/proxy/kosts?${kostQs}`),
        fetch(
          isStaffOrAdmin
            ? "/api/proxy/bookings?all=true&page=1&limit=30"
            : `/api/proxy/bookings?ownerId=${currentUser.id}&page=1&limit=30`,
        ),
        fetch("/api/proxy/wallet/me"),
        fetch("/api/proxy/wallet/payout-requests/me"),
      ];
      if (isStaffOrAdmin) {
        requests.push(
          fetch("/api/proxy/kosts?approvalStatus=PENDING&includePending=true"),
          fetch("/api/proxy/wallet/payout-requests"),
          fetch("/api/proxy/reviews/reports"),
        );
      }

      const responses = await Promise.all(requests);
      if (responses[0]?.ok) {
        const d = await responses[0].json();
        const rows: DashboardKostItem[] = Array.isArray(d) ? d : d.data || [];
        setMyKosts(rows);
        setKostsTotal(Array.isArray(d) ? rows.length : Number(d.total ?? rows.length));
        setKostsHasMore(Array.isArray(d) ? false : Boolean(d.hasMore));
        setKostsPage(1);
      }
      if (responses[1]?.ok) {
        const d = await responses[1].json();
        const list: Booking[] = Array.isArray(d) ? d : [];
        setBookings(list);
        setBookingsPage(1);
        setBookingsHasMore(list.length >= 30);
      }
      if (responses[2]?.ok) {
        const d = await responses[2].json();
        setCreditBalance(Number(d.creditBalance ?? 0));
        setPayoutBalance(Number(d.payoutBalance ?? 0));
      }
      if (responses[3]?.ok) {
        const d = await responses[3].json();
        setMyPayouts(Array.isArray(d) ? d : []);
      }
      if (isStaffOrAdmin) {
        if (responses[4]?.ok) {
          const d = await responses[4].json();
          setPendingKosts(Array.isArray(d) ? d : d.data || []);
        }
        if (responses[5]?.ok) {
          const d = await responses[5].json();
          setAllPayouts(Array.isArray(d) ? d : []);
        }
        if (responses[6]?.ok) {
          const d = await responses[6].json();
          setReviewReports(Array.isArray(d) ? d : []);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers(nextPage = 1, append = false, overrides?: {
    search?: string;
    role?: string;
  }) {
    setBusy(true);
    try {
      const qSearch = overrides?.search ?? userSearch;
      const qRole = overrides?.role ?? userRoleFilter;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
      });
      if (qSearch.trim()) params.set("search", qSearch.trim());
      if (qRole !== "SEMUA") params.set("role", qRole);

      const res = await fetch(`/api/proxy/auth/users?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat daftar pengguna.");
      const list: DashboardUserItem[] = await res.json();
      setUsers((prev) => (append ? [...prev, ...list] : list));
      setUserPage(nextPage);
      setUsersHasMore(list.length >= 20);
      setUsersLoaded(true);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Gagal memuat pengguna.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickUpdateRooms(kost: DashboardKostItem, delta: number) {
    const nextRooms = Math.max(0, Number(kost.availableRooms) + delta);
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/kosts/${kost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableRooms: nextRooms }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui sisa kamar.");
      setMyKosts((prev) =>
        prev.map((k) => (k.id === kost.id ? { ...k, availableRooms: nextRooms } : k)),
      );
      setNotice({
        type: "ok",
        text: `Sisa kamar "${kost.name}" diperbarui menjadi ${nextRooms}.`,
      });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Gagal memperbarui kamar.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleBookingStatus(bookingId: number, status: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal memperbarui status.");
      setNotice({ type: "ok", text: `Status booking diubah ke ${status}.` });
      await refreshDashboardData();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
      setBusy(false);
    }
  }

  async function handleResolveDispute(
    bookingId: number,
    resolution: "RELEASE" | "REFUND",
  ) {
    const label =
      resolution === "RELEASE"
        ? "Cairkan dana escrow ke pemilik?"
        : "Refund dana ke penyewa & batalkan booking?";
    if (!confirm(label)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/resolve-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal menyelesaikan sengketa.");
      setNotice({
        type: "ok",
        text:
          resolution === "RELEASE"
            ? "Sengketa selesai: dana dicairkan ke pemilik."
            : "Sengketa selesai: booking di-refund ke penyewa.",
      });
      await refreshDashboardData();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
      setBusy(false);
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    const amount = Math.round(Number(withdrawAmount));
    if (!Number.isFinite(amount) || amount < 10000) {
      setNotice({ type: "err", text: "Minimal penarikan dana Rp10.000." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/proxy/wallet/payout-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankName,
          accountNumber,
          accountHolder,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal mengajukan penarikan.");
      setWithdrawAmount("");
      setNotice({
        type: "ok",
        text: "Pengajuan tarik dana dikirim dan menunggu proses admin.",
      });
      await refreshDashboardData();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
      setBusy(false);
    }
  }

  async function handleApprovalKost(
    kostId: number,
    status: "APPROVED" | "REJECTED",
  ) {
    let rejectionReason = "";
    if (status === "REJECTED") {
      rejectionReason = prompt("Alasan penolakan (opsional):") || "";
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/kosts/${kostId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal memproses approval.");
      setNotice({
        type: "ok",
        text:
          status === "APPROVED"
            ? "Properti disetujui & tayang di beranda."
            : "Properti ditolak.",
      });
      await refreshDashboardData();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
      setBusy(false);
    }
  }

  async function handleProcessPayout(
    id: number,
    action: "APPROVE" | "REJECT",
  ) {
    const adminNote =
      prompt(
        action === "APPROVE"
          ? "Catatan transfer (opsional):"
          : "Alasan penolakan (opsional):",
      ) || "";
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/wallet/payout-requests/${id}/process`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal memproses withdraw.");
      setNotice({
        type: "ok",
        text:
          action === "APPROVE"
            ? "Withdraw disetujui."
            : "Withdraw ditolak & saldo dikembalikan ke pemilik.",
      });
      await refreshDashboardData();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
      setBusy(false);
    }
  }

  async function handleToggleVerifyUser(
    u: DashboardUserItem,
    nextVerified: boolean,
    reject = false,
  ) {
    let rejectionReason = "";
    if (reject) {
      const input = prompt(`Alasan penolakan verifikasi untuk ${u.name}:`);
      if (input === null) return;
      rejectionReason = input.trim();
    } else if (
      !confirm(
        nextVerified
          ? `Verifikasi akun ${u.name} (${u.email})? Pemilik akan dapat mengaktifkan Booking Langsung & Tarik Dana.`
          : `Cabut status verifikasi ${u.name}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/auth/users/${u.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reject
            ? { isVerified: false, status: "REJECTED", rejectionReason }
            : { isVerified: nextVerified, status: nextVerified ? "VERIFIED" : "NONE" },
        ),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal memperbarui verifikasi user.");
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id
            ? {
                ...item,
                isVerified: d.isVerified ?? nextVerified,
                verificationStatus: d.verificationStatus ?? (reject ? "REJECTED" : nextVerified ? "VERIFIED" : "NONE"),
                verificationRejectionReason: d.verificationRejectionReason ?? rejectionReason,
              }
            : item,
        ),
      );
      setNotice({
        type: "ok",
        text: reject
          ? `Pengajuan verifikasi ${u.name} ditolak.`
          : nextVerified
            ? `${u.name} berhasil diverifikasi.`
            : `Verifikasi ${u.name} dicabut.`,
      });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBan(u: DashboardUserItem) {
    const nextBan = !u.isBanned;
    if (
      !confirm(
        nextBan
          ? `Ban akun ${u.name} (${u.email})?`
          : `Buka ban akun ${u.name}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/auth/users/${u.id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: nextBan }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal mengubah status ban.");
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? { ...item, isBanned: nextBan } : item,
        ),
      );
      setNotice({
        type: "ok",
        text: nextBan ? `${u.name} berhasil dibanned.` : `${u.name} dibuka bannya.`,
      });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeUserRole(u: DashboardUserItem, nextRole: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/auth/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal mengubah role.");
      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, role: nextRole } : item)),
      );
      setNotice({ type: "ok", text: `Role ${u.name} diubah ke ${nextRole}.` });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenBoost(kost: DashboardKostItem) {
    setBoostTargetKost(kost);
    if (boostPackages.length === 0) {
      try {
        const res = await fetch("/api/proxy/wallet/pricing");
        if (res.ok) {
          const data = await res.json();
          setBoostPackages(data?.boostPackages || []);
        }
      } catch {
        // ignore
      }
    }
  }

  async function handleBoostKost(tier: string) {
    if (!boostTargetKost) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/wallet/boost/${boostTargetKost.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: "err", text: data?.message || "Gagal boost properti." });
        return;
      }
      if (typeof data?.creditBalance === "number") {
        setCreditBalance(data.creditBalance);
      }
      setNotice({
        type: "ok",
        text: `Properti "${boostTargetKost.name}" berhasil di-boost!`,
      });
      setBoostTargetKost(null);
      await loadKosts(1, false);
    } finally {
      setBusy(false);
    }
  }

  async function handleTopupCredit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(topupAmount);
    if (!Number.isFinite(amt) || amt < 10000) {
      setNotice({ type: "err", text: "Minimal top-up kredit adalah Rp10.000." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/proxy/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: "err", text: data?.message || "Gagal membuat transaksi top-up." });
        return;
      }
      const orderId = data.orderId || data.paymentOrderId;
      const snapToken = data.snapToken;
      const syncTopup = async () => {
        if (!orderId) return;
        const sRes = await fetch(`/api/proxy/wallet/topup/${orderId}/sync`, {
          method: "POST",
        });
        const sData = await sRes.json().catch(() => ({}));
        if (sRes.ok && typeof sData?.creditBalance === "number") {
          setCreditBalance(sData.creditBalance);
          setNotice({ type: "ok", text: "Saldo kredit berhasil ditambahkan!" });
        }
      };

      if (snapToken && typeof window !== "undefined" && (window as unknown as { snap?: { pay: (t: string, cb: Record<string, () => void>) => void } }).snap) {
        (window as unknown as { snap: { pay: (t: string, cb: Record<string, () => void>) => void } }).snap.pay(snapToken, {
          onSuccess: syncTopup,
          onPending: syncTopup,
          onClose: syncTopup,
        });
      } else if (data.paymentUrl) {
        window.open(data.paymentUrl, "_blank");
        setNotice({
          type: "ok",
          text: `Invoice top-up dibuat (${orderId}). Selesaikan pembayaran lalu muat ulang.`,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferOwner(kost: DashboardKostItem) {
    const newOwnerIdStr = window.prompt(
      `Masukkan ID User pemilik baru untuk "${kost.name}":`,
    );
    if (!newOwnerIdStr) return;
    const newOwnerId = Number(newOwnerIdStr);
    if (!Number.isFinite(newOwnerId)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/proxy/kosts/${kost.id}/transfer-owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId }),
      });
      if (res.ok) {
        setNotice({ type: "ok", text: "Kepemilikan properti berhasil dipindahkan." });
        await loadKosts(1, false);
      } else {
        const d = await res.json().catch(() => ({}));
        setNotice({ type: "err", text: d?.message || "Gagal memindahkan pemilik." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(u: DashboardUserItem) {
    if (!window.confirm(`Hapus permanen akun "${u.name}" (${u.email})?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/proxy/auth/users/${u.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
        setNotice({ type: "ok", text: `Akun ${u.name} berhasil dihapus.` });
      } else {
        const d = await res.json().catch(() => ({}));
        setNotice({ type: "err", text: d?.message || "Gagal menghapus user." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteKost(kost: DashboardKostItem) {
    if (!confirm(`Hapus properti "${kost.name}" secara permanen?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/kosts/${kost.id}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal menghapus properti.");
      setMyKosts((prev) => prev.filter((item) => item.id !== kost.id));
      setKostsTotal((prev) => Math.max(0, prev - 1));
      setPendingKosts((prev) => prev.filter((item) => item.id !== kost.id));
      setNotice({ type: "ok", text: `Properti "${kost.name}" dihapus.` });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissReviewReport(reportId: number) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/reviews/reports/${reportId}/dismiss`, {
        method: "PATCH",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal mengabaikan laporan.");
      setReviewReports((prev) => prev.filter((r) => r.id !== reportId));
      setNotice({ type: "ok", text: "Laporan ulasan diabaikan." });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteReportedReview(reviewId: number) {
    if (!confirm("Hapus ulasan ini secara permanen?")) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal menghapus ulasan.");
      setReviewReports((prev) => prev.filter((r) => r.reviewId !== reviewId));
      setNotice({ type: "ok", text: "Ulasan berhasil dihapus." });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  const disputedCount = bookings.filter((b) => b.escrowStatus === "DISPUTED").length;
  const pendingWithdrawCount = allPayouts.filter((p) => p.status === "PENDING").length;
  const moderationCount = pendingKosts.length + reviewReports.length;

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = isStaffOrAdmin
    ? [
        {
          key: "APPROVAL",
          label: "Approval & Moderasi",
          badge: moderationCount,
        },
        {
          key: "BOOKINGS",
          label: "Booking & Sengketa",
          badge: disputedCount > 0 ? disputedCount : bookings.length,
        },
        {
          key: "WITHDRAWALS",
          label: "Ajuan Withdraw",
          badge: pendingWithdrawCount,
        },
        { key: "USERS", label: "Kelola Pengguna" },
        {
          key: "PROPERTIES",
          label: "Semua Properti",
          badge: kostsTotal,
        },
      ]
    : [
        { key: "PROPERTIES", label: "Properti Saya", badge: kostsTotal },
        {
          key: "BOOKINGS",
          label: "Booking Masuk",
          badge: bookings.length,
        },
        { key: "WALLET", label: "Dompet & Tarik Dana" },
      ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header + Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-800">
            Dashboard {role}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900">
            Halo, {currentUser.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/new-property"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Properti
          </Link>
          <button
            disabled={busy}
            onClick={refreshDashboardData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Muat Ulang Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {isStaffOrAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Total Properti</span>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">{kostsTotal}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Approval & Laporan Ulasan</span>
              <Flag className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700">
              {moderationCount}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Sengketa Escrow</span>
              <Gavel className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-red-700">{disputedCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Ajuan Withdraw Pending</span>
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {pendingWithdrawCount}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Properti Dikelola</span>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">{kostsTotal}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Pendapatan Sewa (Escrow Cair)</span>
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {formatRupiah(payoutBalance)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Saldo Kredit Iklan</span>
              <Wallet className="h-4 w-4 text-teal-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {formatRupiah(creditBalance)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Booking / Survei</span>
              <CalendarClock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {bookings.length}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "USERS" && !usersLoaded) {
                loadUsers(1, false);
              }
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              tab === t.key
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span>{t.label}</span>
            {typeof t.badge === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  tab === t.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Tab Content: PROPERTIES */}
      {tab === "PROPERTIES" && (() => {
        const hasActiveKostFilter =
          kostSearch.trim().length > 0 ||
          kostCategory !== "SEMUA" ||
          kostApproval !== "SEMUA" ||
          kostSort !== "newest";
        return (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={kostSearch}
                    onChange={(e) => setKostSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadKosts(1, false);
                    }}
                    placeholder="Cari nama properti, kota, kecamatan, atau alamat..."
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
                  />
                </div>
                <button
                  disabled={kostsLoading}
                  onClick={() => loadKosts(1, false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  Cari
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={kostCategory}
                  onChange={(e) => {
                    setKostCategory(e.target.value);
                    loadKosts(1, false, { category: e.target.value });
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="SEMUA">Semua Kategori</option>
                  <option value="KOST">Kost</option>
                  <option value="APARTEMEN">Apartemen</option>
                  <option value="KONTRAKAN">Kontrakan</option>
                  <option value="HUNIAN_HARIAN">Hunian Harian</option>
                </select>

                <select
                  value={kostApproval}
                  onChange={(e) => {
                    setKostApproval(e.target.value);
                    loadKosts(1, false, { approval: e.target.value });
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="SEMUA">Semua Status Approval</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="PENDING">Menunggu Review</option>
                  <option value="REJECTED">Ditolak</option>
                </select>

                <select
                  value={kostSort}
                  onChange={(e) => {
                    setKostSort(e.target.value);
                    loadKosts(1, false, { sortBy: e.target.value });
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="newest">Urutkan: Terbaru</option>
                  <option value="recommended">Rekomendasi</option>
                  <option value="price_asc">Harga Termurah</option>
                  <option value="price_desc">Harga Termahal</option>
                </select>

                {hasActiveKostFilter && (
                  <button
                    disabled={kostsLoading}
                    onClick={() => {
                      setKostSearch("");
                      setKostCategory("SEMUA");
                      setKostApproval("SEMUA");
                      setKostSort("newest");
                      loadKosts(1, false, {
                        search: "",
                        category: "SEMUA",
                        approval: "SEMUA",
                        sortBy: "newest",
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}

                <span className="ml-auto text-xs font-semibold text-gray-500">
                  Menampilkan {myKosts.length} dari {kostsTotal} properti
                </span>
              </div>
            </div>

            {kostsLoading && myKosts.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
                  />
                ))}
              </div>
            ) : myKosts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-3">
                <p className="text-sm text-gray-500">
                  {hasActiveKostFilter
                    ? "Tidak ada properti yang cocok dengan pencarian atau filter Anda."
                    : isStaffOrAdmin
                      ? "Belum ada properti terdaftar."
                      : "Anda belum memiliki properti terdaftar."}
                </p>
                {!hasActiveKostFilter && (
                  <Link
                    href="/dashboard/new-property"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Properti Pertama
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myKosts.map((k) => {
                    const approval = (k.approvalStatus || "APPROVED").toUpperCase();
                    const displayPrice = getDisplayPrice(k);
                    return (
                      <div
                        key={k.id}
                        className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${
                                approval === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : approval === "REJECTED"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {formatApprovalStatusLabel(approval)}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">
                              {formatCategoryLabel(k.propertyCategory)}
                            </span>
                          </div>
                          <Link
                            href={`/kost/${k.id}`}
                            className="mt-2 block text-base font-extrabold text-gray-900 hover:text-emerald-700"
                          >
                            {k.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {k.district}, {k.city}
                          </p>
                          {isStaffOrAdmin && k.ownerName && (
                            <p className="mt-1 text-xs text-gray-500">
                              Pemilik:{" "}
                              <span className="font-semibold text-gray-700">
                                {k.ownerName}
                              </span>
                            </p>
                          )}
                          {approval === "REJECTED" && k.rejectionReason && (
                            <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                              Alasan ditolak: {k.rejectionReason}
                            </p>
                          )}
                          <p className="mt-2 text-sm font-black text-emerald-700">
                            {formatRupiah(displayPrice.amount)}
                            {displayPrice.unit}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-xs font-bold text-gray-700">
                            Sisa Kamar: {k.availableRooms}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={busy || k.availableRooms <= 0}
                              onClick={() => handleQuickUpdateRooms(k, -1)}
                              className="h-7 w-7 rounded-lg border border-gray-200 text-sm font-bold hover:bg-gray-100 disabled:opacity-40"
                            >
                              -
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => handleQuickUpdateRooms(k, 1)}
                              className="h-7 w-7 rounded-lg border border-gray-200 text-sm font-bold hover:bg-gray-100 disabled:opacity-40"
                            >
                              +
                            </button>
                            <Link
                              href={`/dashboard/edit-property/${k.id}`}
                              title="Edit Properti"
                              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleOpenBoost(k)}
                              title="Boost Iklan"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </button>
                            {isStaffOrAdmin && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleTransferOwner(k)}
                                title="Pindahkan Pemilik"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {(isStaffOrAdmin || k.ownerId === currentUser.id) && (
                              <button
                                disabled={busy}
                                onClick={() => handleDeleteKost(k)}
                                title="Hapus Properti"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {kostsHasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      disabled={kostsLoading}
                      onClick={() => loadKosts(kostsPage + 1, true)}
                      className="rounded-xl border border-emerald-600 bg-white px-6 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {kostsLoading
                        ? "Memuat..."
                        : `Muat Lebih Banyak (${myKosts.length}/${kostsTotal})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Tab Content: BOOKINGS & DISPUTES */}
      {tab === "BOOKINGS" && (() => {
        const q = bookingSearch.trim().toLowerCase();
        const visibleBookings = bookings.filter((b) => {
          if (onlyDisputedBookings && b.escrowStatus !== "DISPUTED") return false;
          if (
            bookingStatusFilter !== "SEMUA" &&
            (b.status || "").toUpperCase() !== bookingStatusFilter
          ) {
            return false;
          }
          if (
            bookingTypeFilter !== "SEMUA" &&
            (b.bookingType || "SURVEI").toUpperCase() !== bookingTypeFilter
          ) {
            return false;
          }
          if (q) {
            const hay = [
              b.tenantName,
              b.tenantPhone,
              b.kost?.name,
              String(b.id),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        const hasBookingFilter =
          q.length > 0 ||
          bookingStatusFilter !== "SEMUA" ||
          bookingTypeFilter !== "SEMUA" ||
          onlyDisputedBookings;

        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Cari nama penyewa, no. HP, atau nama properti..."
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
                  />
                </div>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="TERKIRIM">Terkirim</option>
                  <option value="MENUNGGU KONFIRMASI">Menunggu Konfirmasi</option>
                  <option value="DISETUJUI">Disetujui</option>
                  <option value="DITOLAK">Ditolak</option>
                  <option value="DIBATALKAN">Dibatalkan</option>
                  <option value="SELESAI">Selesai</option>
                </select>
                <select
                  value={bookingTypeFilter}
                  onChange={(e) => setBookingTypeFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="SEMUA">Semua Tipe</option>
                  <option value="SURVEI">Survei</option>
                  <option value="SEWA">Booking Langsung</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isStaffOrAdmin && (
                  <>
                    <button
                      onClick={() => setOnlyDisputedBookings(false)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        !onlyDisputedBookings
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Semua ({bookings.length})
                    </button>
                    <button
                      onClick={() => setOnlyDisputedBookings(true)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        onlyDisputedBookings
                          ? "bg-amber-600 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Sengketa Escrow ({disputedCount})
                    </button>
                  </>
                )}

                {hasBookingFilter && (
                  <button
                    onClick={() => {
                      setBookingSearch("");
                      setBookingStatusFilter("SEMUA");
                      setBookingTypeFilter("SEMUA");
                      setOnlyDisputedBookings(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}

                <span className="ml-auto text-xs font-semibold text-gray-500">
                  Menampilkan {visibleBookings.length} dari {bookings.length} booking dimuat
                </span>
              </div>
            </div>

            {visibleBookings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                {onlyDisputedBookings
                  ? "Tidak ada sengketa escrow saat ini."
                  : hasBookingFilter
                    ? "Tidak ada booking yang cocok dengan filter Anda."
                    : "Belum ada pengajuan masuk."}
              </div>
            ) : (
              visibleBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                        {formatBookingTypeLabel(b.bookingType)}
                      </span>
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-800">
                        {formatBookingStatusLabel(b.status)}
                      </span>
                      {b.escrowStatus && b.escrowStatus !== "NONE" && (
                        <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Escrow: {formatEscrowStatusLabel(b.escrowStatus)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-base font-extrabold text-gray-900">
                      {b.kost?.name || `Properti #${b.kostId}`}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Penyewa: <span className="font-bold">{b.tenantName}</span> ({b.tenantPhone}) • Mulai {b.startDate}
                    </p>
                  </div>
                  {b.totalAmount > 0 && (
                    <div className="sm:text-right space-y-0.5">
                      <p className="text-base font-black text-emerald-700">
                        {formatRupiah(b.totalAmount)}
                      </p>
                      {b.platformFee > 0 && (
                        <p className="text-[11px] text-gray-500">
                          Potongan Platform: -{formatRupiah(b.platformFee)}
                        </p>
                      )}
                      {b.ownerNetAmount > 0 && (
                        <p className="text-[11px] font-bold text-gray-800">
                          Bersih ke Saldo: {formatRupiah(b.ownerNetAmount)}
                        </p>
                      )}
                      {b.paymentScheme === "DP" && (b.remainingAmount ?? 0) > 0 && (
                        <p className="text-[11px] font-semibold text-amber-700">
                          Skema DP • Sisa saat Check-In: {formatRupiah(b.remainingAmount!)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {(b.status === "TERKIRIM" || b.status === "MENUNGGU KONFIRMASI") && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      disabled={busy}
                      onClick={() => handleBookingStatus(b.id, "DISETUJUI")}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Setujui
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => handleBookingStatus(b.id, "DITOLAK")}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      Tolak
                    </button>
                  </div>
                )}

                {b.userId && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/chat?kostId=${b.kostId}&peerId=${b.userId}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      Chat Penyewa
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const res = await fetch(
                          `/api/proxy/chats/groups/${b.kostId}/members`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: b.userId }),
                          },
                        );
                        if (res.ok) {
                          setNotice({
                            type: "ok",
                            text: `${b.tenantName} ditambahkan ke Grup Penghuni.`,
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Masukkan ke Grup
                    </button>
                  </div>
                )}

                {isStaffOrAdmin && b.escrowStatus === "DISPUTED" && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                      <Gavel className="h-4 w-4" />
                      Sengketa Escrow (Admin/Staff)
                    </p>
                    {b.disputeReason && (
                      <p className="text-xs text-amber-900">
                        Alasan: {b.disputeReason}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busy}
                        onClick={() => handleResolveDispute(b.id, "REFUND")}
                        className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Refund Penyewa
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => handleResolveDispute(b.id, "RELEASE")}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Cairkan ke Pemilik
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

            {bookingsHasMore && (
              <div className="flex justify-center pt-2">
                <button
                  disabled={bookingsLoadingMore}
                  onClick={loadMoreBookings}
                  className="rounded-xl border border-emerald-600 bg-white px-6 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {bookingsLoadingMore ? "Memuat..." : "Muat Booking Lainnya"}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab Content: WALLET & PAYOUT */}
      {tab === "WALLET" && (
        <div className="space-y-6">
          {/* Top-Up Saldo Kredit */}
          <form
            onSubmit={handleTopupCredit}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Top-Up Saldo Kredit Iklan & Boost
                </h2>
                <p className="text-xs text-gray-600">
                  Saldo kredit saat ini:{" "}
                  <span className="font-bold text-emerald-700">
                    {formatRupiah(creditBalance)}
                  </span>{" "}
                  (digunakan untuk slot properti ekstra & Boost Iklan)
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["25000", "50000", "100000", "250000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmount(preset)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition ${
                      topupAmount === preset
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {formatRupiah(Number(preset))}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                min={10000}
                step={5000}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Nominal top-up (min Rp10.000)"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Top-Up Saldo"}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleRequestPayout}
            className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Ajukan Tarik Dana Pendapatan Sewa
              </h2>
              <p className="text-xs text-gray-500">
                Saldo tersedia: <span className="font-bold text-emerald-700">{formatRupiah(payoutBalance)}</span> (minimal Rp10.000)
              </p>
            </div>
            {!currentUser.isVerified && !isStaffOrAdmin && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Akun Anda belum terverifikasi.{" "}
                <Link href="/profile" className="font-bold underline text-emerald-700">
                  Ajukan survei verifikasi di Profil
                </Link>{" "}
                untuk membuka fitur Tarik Dana.
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                required
                min={10000}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Contoh: 500000"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Bank / E-Wallet
              </label>
              <input
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Contoh: BCA / Mandiri / BRI"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nomor Rekening / Akun
              </label>
              <input
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                required
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy || payoutBalance < 10000 || (!currentUser.isVerified && !isStaffOrAdmin)}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Ajukan Penarikan Dana
            </button>
          </form>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">
              Riwayat Penarikan Dana ({myPayouts.length})
            </h2>
            {myPayouts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada pengajuan penarikan dana.
              </p>
            ) : (
              <div className="space-y-3">
                {myPayouts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-gray-900">
                        {formatRupiah(p.amount)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          p.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {formatApprovalStatusLabel(p.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {p.bankName} • {p.accountNumber} ({p.accountHolder})
                    </p>
                    {p.adminNote && (
                      <p className="mt-1 text-xs italic text-gray-500">
                        Catatan admin: {p.adminNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">
              Riwayat Transaksi Kredit ({initialWalletTransactions.length})
            </h2>
            {initialWalletTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada riwayat transaksi kredit atau boost iklan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {initialWalletTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-900">
                          {tx.description || tx.type}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {new Date(tx.createdAt).toLocaleString("id-ID")}
                          {tx.status ? ` • ${tx.status}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-black ${
                          isPositive ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatRupiah(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Tab Content: APPROVAL & MODERATION (Staff/Admin) */}
      {tab === "APPROVAL" && isStaffOrAdmin && (
        <div className="space-y-6">
          {/* Laporan Ulasan Terbuka */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              Laporan Ulasan ({reviewReports.length})
            </h2>
            {reviewReports.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                Tidak ada laporan ulasan yang menunggu moderasi.
              </div>
            ) : (
              reviewReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-red-100 bg-white p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        {r.reason}
                      </span>
                      <h3 className="mt-1 text-base font-extrabold text-gray-900">
                        {r.kostName || `Properti #${r.kostId}`}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Dilaporkan oleh <span className="font-semibold text-gray-700">{r.reporterName}</span>
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 self-start">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {Number(r.reviewOverallRating || 0).toFixed(1)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 text-xs text-gray-700 space-y-1">
                    <p className="font-bold text-gray-900">
                      Ulasan oleh {r.reviewAuthorName || "Penghuni"}:
                    </p>
                    <p className="italic">&ldquo;{r.reviewComment || "-"}&rdquo;</p>
                    {r.details && (
                      <p className="pt-1 text-gray-500">
                        Catatan pelapor: {r.details}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => handleDismissReviewReport(r.id)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Abaikan Laporan
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => handleDeleteReportedReview(r.reviewId)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Ulasan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Properti Menunggu Persetujuan */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              Properti Menunggu Persetujuan ({pendingKosts.length})
            </h2>
            {pendingKosts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                Tidak ada properti menunggu persetujuan.
              </div>
            ) : (
              pendingKosts.map((k) => (
                <div
                  key={k.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      PENDING APPROVAL
                    </span>
                    <Link
                      href={`/kost/${k.id}`}
                      className="mt-1 block text-base font-extrabold text-gray-900 hover:text-emerald-700"
                    >
                      {k.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {k.address}, {k.district}, {k.city} • Pemilik: {k.ownerName}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {formatRupiah(getDisplayPrice(k).amount)}
                      {getDisplayPrice(k).unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => handleApprovalKost(k.id, "REJECTED")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" />
                      Tolak
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => handleApprovalKost(k.id, "APPROVED")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Setujui
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: WITHDRAWALS (Staff/Admin) */}
      {tab === "WITHDRAWALS" && isStaffOrAdmin && (() => {
        const q = withdrawSearch.trim().toLowerCase();
        const visiblePayouts = allPayouts.filter((p) => {
          if (
            withdrawStatusFilter !== "SEMUA" &&
            (p.status || "").toUpperCase() !== withdrawStatusFilter
          ) {
            return false;
          }
          if (q) {
            const hay = [
              p.ownerName,
              p.ownerEmail,
              p.bankName,
              p.accountNumber,
              p.accountHolder,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={withdrawSearch}
                  onChange={(e) => setWithdrawSearch(e.target.value)}
                  placeholder="Cari pemilik, email, bank, atau nomor rekening..."
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
                />
              </div>
              <select
                value={withdrawStatusFilter}
                onChange={(e) => setWithdrawStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="PENDING">Menunggu Review</option>
                <option value="APPROVED">Disetujui</option>
                <option value="REJECTED">Ditolak</option>
              </select>
              {(q.length > 0 || withdrawStatusFilter !== "SEMUA") && (
                <button
                  onClick={() => {
                    setWithdrawSearch("");
                    setWithdrawStatusFilter("SEMUA");
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>

            {visiblePayouts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                {allPayouts.length === 0
                  ? "Belum ada pengajuan withdraw pemilik."
                  : "Tidak ada pengajuan withdraw yang cocok dengan filter."}
              </div>
            ) : (
              visiblePayouts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {p.ownerName} ({p.ownerEmail})
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          p.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {formatApprovalStatusLabel(p.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-black text-emerald-700">
                      {formatRupiah(p.amount)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {p.bankName} • {p.accountNumber} ({p.accountHolder})
                    </p>
                  </div>
                  {p.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => handleProcessPayout(p.id, "REJECT")}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        Tolak
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => handleProcessPayout(p.id, "APPROVE")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Setujui
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* Tab Content: USERS (Staff: Ban Penyewa/Pemilik, Admin: Full) */}
      {tab === "USERS" && isStaffOrAdmin && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row gap-3">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadUsers(1, false);
              }}
              placeholder="Cari nama, email, atau nomor HP..."
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
            />
            <select
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                loadUsers(1, false, { role: e.target.value });
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
            >
              <option value="SEMUA">Semua Role</option>
              <option value="PENYEWA">Penyewa</option>
              <option value="PEMILIK_KOST">Pemilik Kost</option>
              <option value="STAFF">Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
            <button
              onClick={() => loadUsers(1, false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
            >
              <Users className="h-4 w-4" />
              Cari
            </button>
          </div>

          <div className="space-y-3">
            {users.map((u) => {
              const targetRole = (u.role || "").toUpperCase();
              const isProtected = u.id === 1 || u.id === currentUser.id;
              const canBan =
                !isProtected &&
                (isAdmin ||
                  (targetRole !== "STAFF" && targetRole !== "ADMINISTRATOR"));

              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-gray-900">
                        {u.name}
                      </span>
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                        {targetRole}
                      </span>
                      {(u.isVerified || targetRole === "STAFF" || targetRole === "ADMINISTRATOR") && (
                        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                          TERVERIFIKASI
                        </span>
                      )}
                      {u.verificationStatus === "PENDING" && !u.isVerified && (
                        <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                          MENUNGGU SURVEI
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">
                          DIBANNED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {u.email} • {u.phone || "-"}
                    </p>
                    {u.verificationStatus === "PENDING" && (
                      <p className="mt-1 text-[11px] text-amber-800 font-semibold">
                        Usulan Survei: {u.verificationSurveyDate || "-"}
                        {u.verificationNotes ? ` • "${u.verificationNotes}"` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {targetRole !== "STAFF" && targetRole !== "ADMINISTRATOR" && (
                      <>
                        {!u.isVerified ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleVerifyUser(u, true)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verifikasi
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleVerifyUser(u, false)}
                            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Cabut Verif
                          </button>
                        )}
                        {u.verificationStatus === "PENDING" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleVerifyUser(u, false, true)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Tolak Verif
                          </button>
                        )}
                      </>
                    )}
                    {isAdmin && u.id !== 1 && (
                      <select
                        disabled={busy}
                        value={targetRole}
                        onChange={(e) => handleChangeUserRole(u, e.target.value)}
                        className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700"
                      >
                        <option value="PENYEWA">Penyewa</option>
                        <option value="PEMILIK_KOST">Pemilik Kost</option>
                        <option value="STAFF">Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    )}

                    {canBan && (
                      <button
                        disabled={busy}
                        onClick={() => handleToggleBan(u)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                          u.isBanned
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {u.isBanned ? "Buka Ban" : "Ban Akun"}
                      </button>
                    )}

                    {isAdmin && u.id !== currentUser.id && u.id !== 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDeleteUser(u)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {usersHasMore && (
              <div className="flex justify-center pt-2">
                <button
                  disabled={busy}
                  onClick={() => loadUsers(userPage + 1, true)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Muat Lebih Banyak
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {boostTargetKost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Boost Iklan Properti
              </h3>
              <button
                type="button"
                onClick={() => setBoostTargetKost(null)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Properti: <span className="font-bold text-gray-900">{boostTargetKost.name}</span>
              <br />
              Saldo Kredit Anda:{" "}
              <span className="font-bold text-emerald-700">
                {formatRupiah(creditBalance)}
              </span>
            </p>
            <div className="space-y-2.5">
              {boostPackages.length === 0 ? (
                <p className="text-xs text-gray-400">Memuat paket boost...</p>
              ) : (
                boostPackages.map((pkg) => (
                  <button
                    key={pkg.tier}
                    type="button"
                    disabled={busy}
                    onClick={() => handleBoostKost(pkg.tier)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 p-3.5 text-left hover:border-amber-400 hover:bg-amber-50/40 transition"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">
                        {pkg.label || pkg.tier} ({pkg.durationDays} Hari)
                      </p>
                      {pkg.description && (
                        <p className="text-xs text-gray-500">{pkg.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-amber-600">
                      {formatRupiah(pkg.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
