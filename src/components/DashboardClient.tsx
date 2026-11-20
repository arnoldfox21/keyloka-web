"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
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
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { validateWithdrawAccount } from "@/lib/validation";

const INDONESIAN_BANKS = [
  "BCA",
  "BRI",
  "BNI",
  "Bank Mandiri",
  "BSI (Bank Syariah Indonesia)",
  "BTN",
  "CIMB Niaga",
  "Bank Danamon",
  "Bank Permata",
  "OCBC NISP",
  "Panin Bank",
  "Maybank Indonesia",
  "Bank Mega",
  "Bank Sinarmas",
  "BTPN / Jenius",
  "SeaBank",
  "Bank Jago",
  "Bank Neo Commerce (BNC)",
  "Blu by BCA Digital",
  "Allo Bank",
  "Superbank",
  "Krom Bank",
  "Bank Muamalat",
  "BCA Syariah",
  "Bank Mega Syariah",
  "Bank DKI",
  "Bank BJB",
  "Bank Jateng",
  "Bank Jatim",
  "Bank Sumut",
  "Bank Nagari",
  "Bank Riau Kepri",
  "Bank Sumsel Babel",
  "Bank Lampung",
  "Bank Kalbar",
  "Bank Kalsel",
  "Bank Kaltimtara",
  "Bank Sulselbar",
  "BPD Bali",
  "Bank Aceh Syariah",
  "Bank NTB Syariah",
  "Bank Victoria",
  "Bank Ina Perdana",
  "Bank Nobu",
  "Bank Sahabat Sampoerna",
  "Bank Mestika",
  "Bank Ganesha",
  "Bank Index",
  "Bank Bumi Arta",
  "Standard Chartered",
  "HSBC Indonesia",
  "Citibank",
  "UOB Indonesia",
];
import {
  formatApprovalStatusLabel,
  formatArticleCategoryLabel,
  formatBookingStatusLabel,
  formatBookingTypeLabel,
  formatCategoryLabel,
  formatEscrowStatusLabel,
  formatRoleLabel,
  formatRupiah,
  getDisplayPrice,
  type Article,
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
  roles?: string[];
  isBanned?: boolean;
  isVerified?: boolean;
  verificationStatus?: string;
  verificationKostId?: number | null;
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

interface KostReportItem {
  id: number;
  kostId: number;
  kostName: string;
  kostCity?: string;
  kostDistrict?: string;
  kostOwnerName?: string;
  reporterId?: number | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reason: string;
  details?: string | null;
  status: string;
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
  initialKostReports?: KostReportItem[];
  initialCreated?: boolean;
  initialUpdated?: boolean;
  initialTab?: string;
}

type TabKey =
  | "PROPERTIES"
  | "DISPUTES"
  | "FINANCE"
  | "WALLET"
  | "APPROVAL"
  | "WITHDRAWALS"
  | "USERS"
  | "ARTICLES";

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
  initialKostReports = [],
  initialCreated = false,
  initialUpdated = false,
  initialTab,
}: DashboardClientProps) {
  const role = (currentUser.role || "").toUpperCase();
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";
  const isAdmin = role === "ADMINISTRATOR";

  const validTabs: TabKey[] = isAdmin
    ? ["PROPERTIES", "DISPUTES", "APPROVAL", "WITHDRAWALS", "USERS", "ARTICLES"]
    : isStaffOrAdmin
      ? ["PROPERTIES", "DISPUTES", "APPROVAL", "WITHDRAWALS", "USERS"]
      : ["PROPERTIES", "DISPUTES", "FINANCE", "WALLET"];
  const normalizedInitialTab = initialTab === "BOOKINGS" ? "DISPUTES" : initialTab;
  const resolvedInitialTab: TabKey =
    normalizedInitialTab && validTabs.includes(normalizedInitialTab as TabKey)
      ? (normalizedInitialTab as TabKey)
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
  const [bookingSearch, setBookingSearch] = useState("");

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState("SEMUA");
  const [creditBalance, setCreditBalance] = useState(initialCreditBalance);
  const [payoutBalance, setPayoutBalance] = useState(initialPayoutBalance);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(
    initialWalletTransactions,
  );
  const [financePeriod, setFinancePeriod] = useState<
    "ALL" | "THIS_MONTH" | "LAST_3_MONTHS" | "THIS_YEAR"
  >("ALL");
  const [financeKostId, setFinanceKostId] = useState<string>("ALL");
  const [myPayouts, setMyPayouts] = useState<PayoutItem[]>(initialMyPayouts);
  const [pendingKosts, setPendingKosts] =
    useState<DashboardKostItem[]>(initialPendingKosts);
  const [allPayouts, setAllPayouts] = useState<PayoutItem[]>(initialAllPayouts);
  const [reviewReports, setReviewReports] =
    useState<ReviewReportItem[]>(initialReviewReports);
  const [kostReports, setKostReports] =
    useState<KostReportItem[]>(initialKostReports);
  const [adminArticles, setAdminArticles] = useState<Article[]>([]);
  const [adminArticlesLoaded, setAdminArticlesLoaded] = useState(false);
  const [adminArticlesLoading, setAdminArticlesLoading] = useState(false);
  const [adminArticleSearch, setAdminArticleSearch] = useState("");

  const [users, setUsers] = useState<DashboardUserItem[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("SEMUA");
  const [userPage, setUserPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"BANK" | "EWALLET">("BANK");
  const [bankName, setBankName] = useState("");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState(currentUser.name || "");
  const [reviewingPayout, setReviewingPayout] = useState<PayoutItem | null>(null);
  const [reviewRevisedAmount, setReviewRevisedAmount] = useState("");
  const [reviewAdminNote, setReviewAdminNote] = useState("");

  const [topupAmount, setTopupAmount] = useState("50000");
  const [openingPaymentOrder, setOpeningPaymentOrder] = useState<{
    orderId?: string;
    paymentUrl?: string | null;
  } | null>(null);
  const [syncingTopupOrderId, setSyncingTopupOrderId] = useState<string | null>(
    null,
  );
  const [selectedWalletTx, setSelectedWalletTx] =
    useState<WalletTransaction | null>(null);
  const [boostTargetKost, setBoostTargetKost] = useState<DashboardKostItem | null>(
    null,
  );
  const [boostPackages, setBoostPackages] = useState<BoostPackageOption[]>([]);
  const [transferTargetKost, setTransferTargetKost] =
    useState<DashboardKostItem | null>(null);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferCandidates, setTransferCandidates] = useState<
    DashboardUserItem[]
  >([]);
  const [transferLoading, setTransferLoading] = useState(false);

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
          fetch("/api/proxy/kosts/reports"),
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
        if (Array.isArray(d.transactions)) {
          setWalletTransactions(d.transactions);
        }
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
        if (responses[7]?.ok) {
          const d = await responses[7].json();
          setKostReports(Array.isArray(d) ? d : []);
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

  async function handleToggleDirectBooking(kost: DashboardKostItem) {
    const nextAllow = !kost.allowDirectBooking;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/kosts/${kost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowDirectBooking: nextAllow }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d?.message || "Gagal memperbarui status Booking Langsung.");
      }
      setMyKosts((prev) =>
        prev.map((k) =>
          k.id === kost.id ? { ...k, allowDirectBooking: nextAllow } : k,
        ),
      );
      setNotice({
        type: "ok",
        text: nextAllow
          ? `Booking Langsung untuk "${kost.name}" diaktifkan.`
          : `Booking Langsung untuk "${kost.name}" dinonaktifkan.`,
      });
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Gagal memperbarui Booking Langsung.",
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
    const resolvedBankName =
      withdrawMethod === "EWALLET" ? "ShopeePay" : bankName.trim();
    if (!resolvedBankName) {
      setNotice({ type: "err", text: "Nama bank wajib diisi." });
      return;
    }
    const accountCheck = validateWithdrawAccount(accountNumber, withdrawMethod);
    if (!accountCheck.valid) {
      setNotice({
        type: "err",
        text: accountCheck.error || "Nomor rekening / E-Wallet tidak valid.",
      });
      return;
    }
    if (!accountHolder.trim() || accountHolder.trim().length < 2) {
      setNotice({
        type: "err",
        text: "Nama pemilik rekening wajib diisi (minimal 2 karakter).",
      });
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
          bankName: resolvedBankName,
          accountNumber: accountCheck.normalized,
          accountHolder: accountHolder.trim(),
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

  function openPayoutReviewModal(p: PayoutItem) {
    setReviewingPayout(p);
    setReviewRevisedAmount(String(p.amount));
    setReviewAdminNote(p.adminNote || "");
  }

  async function handleProcessPayout(
    id: number,
    action: "APPROVE" | "REJECT",
    adminNote = "",
    revisedAmount?: number,
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/wallet/payout-requests/${id}/process`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNote,
          ...(action === "APPROVE" && revisedAmount !== undefined
            ? { revisedAmount }
            : {}),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal memproses withdraw.");
      setReviewingPayout(null);
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
                verificationKostId: d.verificationKostId ?? null,
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
            ? u.verificationKostId
              ? `Klaim properti #${u.verificationKostId} oleh ${u.name} disetujui & akun terverifikasi.`
              : `${u.name} berhasil diverifikasi.`
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
        body: JSON.stringify({ role: nextRole, requesterId: currentUser.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(d?.message) ? d.message.join(", ") : d?.message;
        throw new Error(msg || "Gagal mengubah role.");
      }
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

  function isPayablePendingTopup(tx: WalletTransaction): boolean {
    if (
      (tx.type || "").toUpperCase() !== "TOPUP" ||
      (tx.status || "").toUpperCase() !== "PENDING"
    ) {
      return false;
    }
    const url = (tx.paymentUrl || "").toLowerCase();
    if (url && !url.includes("midtrans.com")) return false;
    return Boolean(tx.snapToken || tx.paymentUrl);
  }

  function getWalletTxStatusBadge(status?: string) {
    const s = (status || "").toUpperCase();
    if (s === "PAID") {
      return {
        label: "Lunas",
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    }
    if (s === "PENDING") {
      return {
        label: "Menunggu Pembayaran",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    if (s === "FAILED") {
      return {
        label: "Gagal",
        className: "bg-red-100 text-red-700 border-red-200",
      };
    }
    if (s === "EXPIRED") {
      return {
        label: "Kedaluwarsa",
        className: "bg-gray-200 text-gray-700 border-gray-300",
      };
    }
    return {
      label: s || "Selesai",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  async function refreshWalletSummary() {
    try {
      const wRes = await fetch("/api/proxy/wallet/me");
      if (!wRes.ok) return;
      const wData = await wRes.json().catch(() => ({}));
      if (typeof wData?.creditBalance === "number") {
        setCreditBalance(wData.creditBalance);
      }
      if (typeof wData?.payoutBalance === "number") {
        setPayoutBalance(wData.payoutBalance);
      }
      if (Array.isArray(wData?.transactions)) {
        const nextList: WalletTransaction[] = wData.transactions;
        setWalletTransactions(nextList);
        setSelectedWalletTx((prev) =>
          prev ? nextList.find((item) => item.id === prev.id) ?? prev : null,
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("keyloka:notifications-unread-update"));
      }
    } catch {
      // Ignore background refresh failure
    }
  }

  async function syncTopupOrder(orderId?: string, silent = false) {
    if (!orderId) return;
    if (!silent) setSyncingTopupOrderId(orderId);
    try {
      const prevTx = walletTransactions.find((item) => item.orderId === orderId);
      const wasPaid = (prevTx?.status || "").toUpperCase() === "PAID";

      const sRes = await fetch(
        `/api/proxy/wallet/topup/${encodeURIComponent(orderId)}/sync`,
        {
          method: "POST",
        },
      );
      const sData = await sRes.json().catch(() => ({}));
      if (sRes.ok && typeof sData?.creditBalance === "number") {
        setCreditBalance(sData.creditBalance);
        const newStatus = (sData?.transaction?.status || "").toUpperCase();
        const txAmount = Number(sData?.transaction?.amount ?? prevTx?.amount ?? 0);
        if (newStatus === "PAID" && (!wasPaid || !silent)) {
          setNotice({
            type: "ok",
            text: `Pembayaran top-up ${formatRupiah(txAmount)} berhasil! Saldo kredit Anda telah ditambahkan.`,
          });
        } else if (!silent && (newStatus === "FAILED" || newStatus === "EXPIRED")) {
          setNotice({
            type: "err",
            text:
              newStatus === "FAILED"
                ? "Pembayaran top-up gagal diproses."
                : "Invoice top-up telah kedaluwarsa.",
          });
        } else if (!silent && newStatus === "PENDING") {
          setNotice({
            type: "ok",
            text: `Transaksi ${orderId} masih menunggu pembayaran di Midtrans.`,
          });
        }
        await refreshWalletSummary();
      } else if (!silent && !sRes.ok) {
        setNotice({
          type: "err",
          text: sData?.message || "Gagal menyinkronkan status top-up.",
        });
      }
    } catch {
      if (!silent) {
        setNotice({
          type: "err",
          text: "Gagal memeriksa status pembayaran top-up.",
        });
      }
    } finally {
      if (!silent) setSyncingTopupOrderId(null);
    }
  }

  function openTopupCheckout(target: {
    orderId?: string;
    snapToken?: string | null;
    paymentUrl?: string | null;
  }) {
    const { orderId, snapToken, paymentUrl } = target;
    if (snapToken && typeof window !== "undefined" && window.snap) {
      setOpeningPaymentOrder({ orderId, paymentUrl });

      let cleared = false;
      const clearOpening = () => {
        if (cleared) return;
        cleared = true;
        setOpeningPaymentOrder(null);
      };

      const safetyTimer = window.setTimeout(clearOpening, 25000);
      const snapCallbacks = {
        onSuccess: () => {
          window.clearTimeout(safetyTimer);
          clearOpening();
          void syncTopupOrder(orderId, false);
        },
        onPending: () => {
          window.clearTimeout(safetyTimer);
          clearOpening();
          void syncTopupOrder(orderId, false);
        },
        onClose: () => {
          window.clearTimeout(safetyTimer);
          clearOpening();
          void syncTopupOrder(orderId, true);
        },
        onError: () => {
          window.clearTimeout(safetyTimer);
          clearOpening();
          void syncTopupOrder(orderId, true);
          setNotice({
            type: "err",
            text: "Pembayaran top-up gagal atau dibatalkan.",
          });
        },
      };

      try {
        try {
          window.snap.pay(snapToken, snapCallbacks);
        } catch {
          window.snap.hide?.();
          window.snap.pay(snapToken, snapCallbacks);
        }
        window.clearTimeout(safetyTimer);
        clearOpening();
      } catch {
        window.clearTimeout(safetyTimer);
        clearOpening();
        if (paymentUrl) {
          window.open(paymentUrl, "_blank", "noopener,noreferrer");
        }
      }
    } else if (paymentUrl) {
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
      setNotice({
        type: "ok",
        text: `Halaman pembayaran top-up (${orderId || "-"}) dibuka di tab baru. Selesaikan pembayaran lalu klik Cek Status.`,
      });
    } else {
      setNotice({
        type: "err",
        text: "Tautan pembayaran tidak tersedia untuk transaksi ini.",
      });
    }
  }

  useEffect(() => {
    if (tab !== "WALLET") return;
    const pendingTopups = walletTransactions
      .filter(
        (tx) =>
          (tx.type || "").toUpperCase() === "TOPUP" &&
          (tx.status || "").toUpperCase() === "PENDING" &&
          Boolean(tx.orderId) &&
          Date.now() - new Date(tx.createdAt).getTime() <= 24 * 60 * 60 * 1000 &&
          !(tx.paymentUrl || "").toLowerCase().includes("midtrans.com"),
      )
      .slice(0, 2);

    if (pendingTopups.length === 0) return;

    const timer = window.setInterval(() => {
      for (const tx of pendingTopups) {
        if (tx.orderId) {
          void syncTopupOrder(tx.orderId, true);
        }
      }
    }, 10000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, walletTransactions]);

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
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setNotice({ type: "err", text: msg || "Gagal membuat transaksi top-up." });
        return;
      }
      const orderId: string | undefined =
        data.transaction?.orderId || data.orderId || data.paymentOrderId;
      const snapToken: string | undefined = data.snapToken;
      const paymentUrl: string | undefined = data.paymentUrl;

      if (data.transaction && typeof data.transaction === "object") {
        const createdTx = data.transaction as WalletTransaction;
        setWalletTransactions((prev) =>
          prev.some((item) => item.id === createdTx.id)
            ? prev
            : [createdTx, ...prev],
        );
      }

      openTopupCheckout({
        orderId,
        snapToken,
        paymentUrl,
      });
    } catch (err) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat membuat top-up.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadTransferCandidates(query = "") {
    setTransferLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        role: "PEMILIK_KOST",
      });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/proxy/auth/users?${params.toString()}`);
      if (res.ok) {
        const list: DashboardUserItem[] = await res.json();
        const ownerCandidates = (Array.isArray(list) ? list : []).filter(
          (u) => {
            const active = (u.role || "").toUpperCase();
            const roles = Array.isArray(u.roles)
              ? u.roles.map((r) => String(r || "").toUpperCase())
              : [];
            return active === "PEMILIK_KOST" || roles.includes("PEMILIK_KOST");
          },
        );
        setTransferCandidates(ownerCandidates);
      }
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleTransferOwner(kost: DashboardKostItem) {
    setTransferTargetKost(kost);
    setTransferSearch("");
    setTransferCandidates([]);
    await loadTransferCandidates("");
  }

  async function submitTransferOwner(targetOwnerId: number) {
    if (!transferTargetKost) return;
    const candidate = transferCandidates.find((u) => u.id === targetOwnerId);
    const targetLabel = candidate
      ? `${candidate.name} (${candidate.email})`
      : `pengguna #${targetOwnerId}`;
    if (
      !window.confirm(
        `Pindahkan kepemilikan "${transferTargetKost.name}" ke ${targetLabel}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/kosts/${transferTargetKost.id}/transfer-owner`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetOwnerId }),
        },
      );
      if (res.ok) {
        setNotice({
          type: "ok",
          text: "Kepemilikan properti berhasil dipindahkan.",
        });
        setTransferTargetKost(null);
        await loadKosts(1, false);
      } else {
        const d = await res.json().catch(() => ({}));
        setNotice({
          type: "err",
          text: d?.message || "Gagal memindahkan pemilik.",
        });
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

  async function handleDismissKostReport(reportId: number) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/proxy/kosts/reports/${reportId}/dismiss`, {
        method: "PATCH",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal menandai laporan.");
      setKostReports((prev) => prev.filter((r) => r.id !== reportId));
      setNotice({ type: "ok", text: "Laporan properti ditandai selesai." });
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
  const moderationCount =
    pendingKosts.length + reviewReports.length + kostReports.length;

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = isStaffOrAdmin
    ? [
        {
          key: "PROPERTIES",
          label: "Kelola Semua Properti",
          badge: kostsTotal,
        },
        {
          key: "APPROVAL",
          label: "Approval & Moderasi",
          badge: moderationCount,
        },
        {
          key: "DISPUTES",
          label: "Sengketa",
          badge: disputedCount,
        },
        {
          key: "WITHDRAWALS",
          label: "Ajuan Withdraw",
          badge: pendingWithdrawCount,
        },
        { key: "USERS", label: "Kelola Pengguna" },
        ...(isAdmin ? [{ key: "ARTICLES" as TabKey, label: "Moderasi Artikel" }] : []),
      ]
    : [
        { key: "PROPERTIES", label: "Properti Saya", badge: kostsTotal },
        {
          key: "DISPUTES",
          label: "Sengketa",
          badge: disputedCount,
        },
        { key: "FINANCE", label: "Keuangan" },
        { key: "WALLET", label: "Dompet & Tarik Dana" },
      ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header + Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-800">
            Dashboard {formatRoleLabel(role)}
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
          <Link
            href="/bookings"
            className="rounded-2xl border border-gray-200 bg-white p-4 hover:border-emerald-300 transition block"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Booking / Survei</span>
              <CalendarClock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {bookings.length}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
              Kelola di menu Booking →
            </p>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "USERS" && !usersLoaded) {
                loadUsers(1, false);
              }
              if (t.key === "ARTICLES" && !adminArticlesLoaded) {
                void (async () => {
                  setAdminArticlesLoading(true);
                  try {
                    const res = await fetch("/api/proxy/articles/admin/all");
                    if (res.ok) {
                      const list: Article[] = await res.json();
                      setAdminArticles(Array.isArray(list) ? list : []);
                      setAdminArticlesLoaded(true);
                    }
                  } finally {
                    setAdminArticlesLoading(false);
                  }
                })();
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
                            <button
                              type="button"
                              disabled={busy || (!isStaffOrAdmin && !currentUser.isVerified)}
                              onClick={() => handleToggleDirectBooking(k)}
                              title={
                                !isStaffOrAdmin && !currentUser.isVerified
                                  ? "Khusus pemilik terverifikasi"
                                  : k.allowDirectBooking
                                    ? "Nonaktifkan Booking Langsung"
                                    : "Aktifkan Booking Langsung"
                              }
                              className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition disabled:opacity-40 ${
                                k.allowDirectBooking
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {k.allowDirectBooking ? "Booking: ON" : "Booking: OFF"}
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

      {/* Tab Content: DISPUTES */}
      {tab === "DISPUTES" && (() => {
        const q = bookingSearch.trim().toLowerCase();
        const disputedBookings = bookings.filter((b) => b.escrowStatus === "DISPUTED");
        const visibleDisputes = disputedBookings.filter((b) => {
          if (q) {
            const hay = [
              b.tenantName,
              b.tenantPhone,
              b.kost?.name,
              b.disputeReason,
              String(b.id),
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
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
              <div>
                <p className="font-bold">Daftar Sengketa Escrow</p>
                <p className="mt-0.5 text-[11px] text-emerald-900">
                  Pengelolaan pengajuan survei dan booking masuk kini tersedia terpusat di menu Booking &amp; Survei.
                </p>
              </div>
              <Link
                href="/bookings"
                className="shrink-0 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Buka Booking &amp; Survei →
              </Link>
            </div>

            {disputedBookings.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Cari nama penyewa, no. HP, properti, atau alasan sengketa..."
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
                  />
                </div>
                {q.length > 0 && (
                  <button
                    onClick={() => setBookingSearch("")}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
                <span className="text-xs font-semibold text-gray-500">
                  Menampilkan {visibleDisputes.length} dari {disputedBookings.length} sengketa
                </span>
              </div>
            )}

            {visibleDisputes.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                {q.length > 0
                  ? "Tidak ada sengketa yang cocok dengan pencarian Anda."
                  : "Tidak ada sengketa escrow saat ini."}
              </div>
            ) : (
              visibleDisputes.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-amber-200 bg-white p-5 space-y-3"
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
                        <span className="rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                          Escrow: {formatEscrowStatusLabel(b.escrowStatus)}
                        </span>
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
                        {b.ownerNetAmount > 0 && (
                          <p className="text-[11px] font-bold text-gray-800">
                            Bersih ke Saldo: {formatRupiah(b.ownerNetAmount)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {b.userId && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/chat?kostId=${b.kostId}&peerId=${b.userId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Chat Penyewa
                      </Link>
                    </div>
                  )}

                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                      <Gavel className="h-4 w-4" />
                      {isStaffOrAdmin ? "Sengketa Escrow (Admin/Staff)" : "Sengketa Escrow (Sedang Ditinjau Admin/Staff)"}
                    </p>
                    {b.disputeReason && (
                      <p className="text-xs text-amber-900">
                        Alasan: {b.disputeReason}
                      </p>
                    )}
                    {isStaffOrAdmin && (
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
                    )}
                  </div>
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
                  {bookingsLoadingMore ? "Memuat..." : "Muat Data Lainnya"}
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
                disabled={busy || Boolean(openingPaymentOrder)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {(busy || Boolean(openingPaymentOrder)) && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                {busy
                  ? "Membuat Invoice..."
                  : openingPaymentOrder
                    ? "Membuka Popup Midtrans..."
                    : "Top-Up Saldo"}
              </button>
            </div>
            {openingPaymentOrder && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-xs text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
                  <span>
                    Menyiapkan & membuka popup pembayaran Midtrans
                    {openingPaymentOrder.orderId
                      ? ` (${openingPaymentOrder.orderId})`
                      : ""}
                    , mohon tunggu beberapa detik...
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {openingPaymentOrder.paymentUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = openingPaymentOrder.paymentUrl;
                        try {
                          window.snap?.hide?.();
                        } catch {
                          // ignore
                        }
                        setOpeningPaymentOrder(null);
                        if (url) {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      Buka di Tab Baru
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpeningPaymentOrder(null)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Tutup Info
                  </button>
                </div>
              </div>
            )}
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
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Metode Penarikan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod("BANK");
                    if (bankName === "ShopeePay") setBankName("");
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    withdrawMethod === "BANK"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Transfer Bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod("EWALLET");
                    setBankName("ShopeePay");
                    setBankDropdownOpen(false);
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    withdrawMethod === "EWALLET"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  E-Wallet (ShopeePay)
                </button>
              </div>
            </div>

            {withdrawMethod === "BANK" ? (
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Bank
                </label>
                <input
                  required
                  value={bankName}
                  onFocus={() => setBankDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setBankDropdownOpen(false), 150)}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    setBankDropdownOpen(true);
                  }}
                  placeholder="Ketik nama bank (mis. BCA, Mandiri, SeaBank...)"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                {bankDropdownOpen && (() => {
                  const qBank = bankName.trim().toLowerCase();
                  const matches = INDONESIAN_BANKS.filter((b) =>
                    !qBank ? true : b.toLowerCase().includes(qBank),
                  ).slice(0, 8);
                  if (matches.length === 0) return null;
                  return (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      {matches.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBankName(b);
                            setBankDropdownOpen(false);
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-2.5 text-xs text-orange-900">
                E-Wallet dipilih: <strong>ShopeePay</strong>{" "}
                <span className="text-orange-700/80">(opsi E-Wallet sementara khusus ShopeePay)</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {withdrawMethod === "EWALLET"
                  ? "Nomor HP ShopeePay"
                  : "Nomor Rekening"}
              </label>
              <input
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={
                  withdrawMethod === "EWALLET" ? "08xxxxxxxxxx" : "Nomor rekening bank"
                }
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-gray-900">
                Riwayat Transaksi Kredit ({walletTransactions.length})
              </h2>
              <button
                type="button"
                onClick={() => void refreshWalletSummary()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Segarkan
              </button>
            </div>
            {walletTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada riwayat transaksi kredit atau boost iklan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {walletTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const badge = getWalletTxStatusBadge(tx.status);
                  const canPay = isPayablePendingTopup(tx);
                  const isSyncingThis =
                    Boolean(tx.orderId) && syncingTopupOrderId === tx.orderId;

                  return (
                    <div
                      key={tx.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-extrabold text-gray-900">
                            {tx.description || tx.type}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 break-all">
                          {new Date(tx.createdAt).toLocaleString("id-ID")}
                          {tx.orderId ? ` • ${tx.orderId}` : ""}
                          {tx.paymentMethod
                            ? ` • ${tx.paymentMethod.toUpperCase()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span
                          className={`text-sm font-black ${
                            isPositive ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatRupiah(tx.amount)}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {canPay && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(openingPaymentOrder)}
                                onClick={() => openTopupCheckout(tx)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Bayar Sekarang
                              </button>
                              {tx.orderId && (
                                <button
                                  type="button"
                                  disabled={isSyncingThis}
                                  onClick={() =>
                                    void syncTopupOrder(tx.orderId, false)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  <RefreshCw
                                    className={`h-3 w-3 ${
                                      isSyncingThis ? "animate-spin" : ""
                                    }`}
                                  />
                                  {isSyncingThis ? "Mengecek..." : "Cek Status"}
                                </button>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedWalletTx(tx)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Tab Content: FINANCE (Pemilik Properti) */}
      {tab === "FINANCE" && !isStaffOrAdmin && (() => {
        const now = new Date();
        const paidBookings = bookings.filter((b) => {
          const isPaidOrEscrow =
            (b.paymentStatus || "").toUpperCase() === "PAID" ||
            ["HELD", "RELEASED", "DISPUTED", "REFUNDED"].includes(
              (b.escrowStatus || "").toUpperCase(),
            );
          if (!isPaidOrEscrow) return false;
          if (financeKostId !== "ALL" && String(b.kostId) !== financeKostId) {
            return false;
          }
          const created = new Date(b.createdAt);
          if (financePeriod === "THIS_MONTH") {
            return (
              created.getFullYear() === now.getFullYear() &&
              created.getMonth() === now.getMonth()
            );
          }
          if (financePeriod === "LAST_3_MONTHS") {
            const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            return created >= cutoff;
          }
          if (financePeriod === "THIS_YEAR") {
            return created.getFullYear() === now.getFullYear();
          }
          return true;
        });

        const settledBookings = paidBookings.filter(
          (b) => (b.escrowStatus || "").toUpperCase() !== "REFUNDED",
        );

        const totalGross = settledBookings.reduce(
          (acc, b) => acc + Number(b.paidAmount ?? b.totalAmount ?? 0),
          0,
        );
        const totalFees = settledBookings.reduce(
          (acc, b) => acc + Number(b.platformFee ?? 0) + Number(b.serviceFee ?? 0),
          0,
        );
        const totalNet = settledBookings.reduce(
          (acc, b) => acc + Number(b.ownerNetAmount ?? 0),
          0,
        );
        const heldAmount = settledBookings
          .filter((b) => (b.escrowStatus || "").toUpperCase() === "HELD")
          .reduce((acc, b) => acc + Number(b.ownerNetAmount ?? 0), 0);
        const releasedAmount = settledBookings
          .filter((b) => (b.escrowStatus || "").toUpperCase() === "RELEASED")
          .reduce((acc, b) => acc + Number(b.ownerNetAmount ?? 0), 0);
        const withdrawnAmount = myPayouts
          .filter((p) => (p.status || "").toUpperCase() === "APPROVED")
          .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);

        // Breakdown per property
        const propertyMap = new Map<
          number,
          { kostId: number; name: string; count: number; gross: number; net: number }
        >();
        for (const b of settledBookings) {
          const prev = propertyMap.get(b.kostId) || {
            kostId: b.kostId,
            name: b.kost?.name || `Properti #${b.kostId}`,
            count: 0,
            gross: 0,
            net: 0,
          };
          prev.count += 1;
          prev.gross += Number(b.paidAmount ?? b.totalAmount ?? 0);
          prev.net += Number(b.ownerNetAmount ?? 0);
          propertyMap.set(b.kostId, prev);
        }
        const propertyBreakdown = Array.from(propertyMap.values()).sort(
          (a, b) => b.net - a.net,
        );

        // Breakdown per month (YYYY-MM)
        const monthMap = new Map<
          string,
          { key: string; label: string; count: number; gross: number; net: number }
        >();
        for (const b of settledBookings) {
          const d = new Date(b.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric",
          });
          const prev = monthMap.get(key) || { key, label, count: 0, gross: 0, net: 0 };
          prev.count += 1;
          prev.gross += Number(b.paidAmount ?? b.totalAmount ?? 0);
          prev.net += Number(b.ownerNetAmount ?? 0);
          monthMap.set(key, prev);
        }
        const monthlyBreakdown = Array.from(monthMap.values()).sort((a, b) =>
          b.key.localeCompare(a.key),
        );
        const maxMonthlyNet = Math.max(
          1,
          ...monthlyBreakdown.map((m) => m.net),
        );

        function handleExportFinanceCsv() {
          const headers = [
            "Tanggal",
            "ID Booking",
            "Properti",
            "Penyewa",
            "Skema",
            "Pendapatan Kotor (Rp)",
            "Potongan Fee (Rp)",
            "Pendapatan Bersih (Rp)",
            "Status Escrow",
          ];
          const escapeCell = (val: string | number) =>
            `"${String(val).replace(/"/g, '""')}"`;
          const rows = paidBookings.map((b) => {
            const gross = Number(b.paidAmount ?? b.totalAmount ?? 0);
            const fee = Number(b.platformFee ?? 0) + Number(b.serviceFee ?? 0);
            const net = Number(b.ownerNetAmount ?? 0);
            return [
              new Date(b.createdAt).toLocaleDateString("id-ID"),
              b.id,
              b.kost?.name || `Properti #${b.kostId}`,
              b.tenantName,
              b.paymentScheme === "DP" ? "DP 30%" : "Full",
              gross,
              fee,
              net,
              b.escrowStatus || b.paymentStatus,
            ]
              .map(escapeCell)
              .join(",");
          });
          const csvContent = `\uFEFF${[headers.map(escapeCell).join(","), ...rows].join("\n")}`;
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `laporan-keuangan-keyloka-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        }

        return (
          <div className="space-y-6">
            {/* Filter & Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={financePeriod}
                  onChange={(e) =>
                    setFinancePeriod(
                      e.target.value as "ALL" | "THIS_MONTH" | "LAST_3_MONTHS" | "THIS_YEAR",
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800"
                >
                  <option value="ALL">Semua Periode</option>
                  <option value="THIS_MONTH">Bulan Ini</option>
                  <option value="LAST_3_MONTHS">3 Bulan Terakhir</option>
                  <option value="THIS_YEAR">Tahun Ini</option>
                </select>
                <select
                  value={financeKostId}
                  onChange={(e) => setFinanceKostId(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800"
                >
                  <option value="ALL">Semua Properti ({myKosts.length})</option>
                  {myKosts.map((k) => (
                    <option key={k.id} value={String(k.id)}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={paidBookings.length === 0}
                onClick={handleExportFinanceCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition"
              >
                <Download className="h-4 w-4" />
                Unduh Laporan CSV
              </button>
            </div>

            {/* 4 Finance KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Pendapatan Kotor</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-gray-900">
                  {formatRupiah(totalGross)}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Dari {settledBookings.length} transaksi sewa
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Potongan Fee (1% + PG)</span>
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-700">
                  {formatRupiah(totalFees)}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Biaya platform 1% + payment gateway
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>Pendapatan Bersih</span>
                  <Banknote className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-700">
                  {formatRupiah(totalNet)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-700/80">
                  Cair: {formatRupiah(releasedAmount)} • Tertahan: {formatRupiah(heldAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Sudah Ditarik</span>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-blue-700">
                  {formatRupiah(withdrawnAmount)}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Saldo siap tarik: {formatRupiah(payoutBalance)}
                </p>
              </div>
            </div>

            {/* Rekap per Properti & Rekap Bulanan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
                <h2 className="text-base font-black text-gray-900">
                  Pendapatan per Properti
                </h2>
                {propertyBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Belum ada pemasukan sewa pada periode ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {propertyBreakdown.map((item) => (
                      <div
                        key={item.kostId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {item.count} transaksi • Kotor {formatRupiah(item.gross)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-emerald-700">
                          {formatRupiah(item.net)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
                <h2 className="text-base font-black text-gray-900">
                  Rekap Pendapatan Bulanan
                </h2>
                {monthlyBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Belum ada transaksi bulanan untuk ditampilkan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {monthlyBreakdown.map((m) => (
                      <div key={m.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800">
                            {m.label} ({m.count} trx)
                          </span>
                          <span className="font-black text-emerald-700">
                            {formatRupiah(m.net)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.max(4, Math.round((m.net / maxMonthlyNet) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mutasi Pemasukan Sewa (Revenue Ledger) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-gray-900">
                  Mutasi Pemasukan Sewa ({paidBookings.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setTab("WALLET")}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Tarik Dana di Dompet →
                </button>
              </div>
              {paidBookings.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Belum ada mutasi pemasukan sewa pada filter yang dipilih.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        <th className="py-2.5 pr-3">Tanggal</th>
                        <th className="py-2.5 pr-3">Properti & Penyewa</th>
                        <th className="py-2.5 pr-3">Skema</th>
                        <th className="py-2.5 pr-3 text-right">Kotor</th>
                        <th className="py-2.5 pr-3 text-right">Fee</th>
                        <th className="py-2.5 pr-3 text-right">Bersih</th>
                        <th className="py-2.5 text-right">Escrow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paidBookings.map((b) => {
                        const gross = Number(b.paidAmount ?? b.totalAmount ?? 0);
                        const fee =
                          Number(b.platformFee ?? 0) + Number(b.serviceFee ?? 0);
                        const net = Number(b.ownerNetAmount ?? 0);
                        return (
                          <tr key={b.id} className="hover:bg-gray-50/70">
                            <td className="py-3 pr-3 whitespace-nowrap text-gray-500">
                              {new Date(b.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 pr-3">
                              <p className="font-bold text-gray-900">
                                {b.kost?.name || `Properti #${b.kostId}`}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {b.tenantName}
                              </p>
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap">
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                {b.paymentScheme === "DP" ? "DP 30%" : "Full"}
                              </span>
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-gray-700">
                              {formatRupiah(gross)}
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap text-right text-gray-500">
                              -{formatRupiah(fee)}
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap text-right font-black text-emerald-700">
                              {formatRupiah(net)}
                            </td>
                            <td className="py-3 whitespace-nowrap text-right">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  b.escrowStatus === "RELEASED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : b.escrowStatus === "HELD"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {formatEscrowStatusLabel(b.escrowStatus)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tab Content: APPROVAL & MODERATION (Staff/Admin) */}
      {tab === "APPROVAL" && isStaffOrAdmin && (
        <div className="space-y-6">
          {/* Laporan Properti Masuk */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              Laporan Properti ({kostReports.length})
            </h2>
            {kostReports.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                Tidak ada laporan properti yang menunggu peninjauan.
              </div>
            ) : (
              kostReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-rose-100 bg-white p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                        {r.reason}
                      </span>
                      <h3 className="mt-1 text-base font-extrabold text-gray-900">
                        <Link
                          href={`/kost/${r.kostId}`}
                          target="_blank"
                          className="hover:text-emerald-700 hover:underline"
                        >
                          {r.kostName || `Properti #${r.kostId}`}
                        </Link>
                      </h3>
                      <p className="text-xs text-gray-500">
                        {[r.kostDistrict, r.kostCity].filter(Boolean).join(", ")}
                        {r.kostOwnerName ? ` • Pemilik: ${r.kostOwnerName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Pengirim:{" "}
                        {r.reporterName ? (
                          <span className="font-semibold text-gray-900">
                            {r.reporterName}
                            {r.reporterEmail ? ` (${r.reporterEmail})` : ""}
                          </span>
                        ) : (
                          <span className="italic text-gray-500">
                            Pengunjung (Anonim)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {new Date(r.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {r.details && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs text-gray-700">
                      <span className="font-bold text-gray-900">Catatan pelapor: </span>
                      {r.details}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/kost/${r.kostId}`}
                      target="_blank"
                      className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Lihat Properti
                    </Link>
                    <button
                      disabled={busy}
                      onClick={() => handleDismissKostReport(r.id)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

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
                    {p.adminNote && (
                      <p className="mt-1 text-xs italic text-gray-500">
                        Catatan staff: {p.adminNote}
                      </p>
                    )}
                  </div>
                  {p.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => openPayoutReviewModal(p)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Review & Proses
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
              <option value="PEMILIK_KOST">Pemilik Properti</option>
              <option value="PENULIS">Penulis</option>
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
                      {u.verificationStatus === "PENDING" && (
                        <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                          {u.verificationKostId
                            ? `KLAIM PROPERTI #${u.verificationKostId}`
                            : "MENUNGGU VERIFIKASI"}
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
                        {u.verificationKostId
                          ? `Klaim Properti #${u.verificationKostId}`
                          : "Pengajuan Verifikasi"}
                        {u.verificationSurveyDate ? ` • ${u.verificationSurveyDate}` : ""}
                        {u.verificationNotes ? ` • "${u.verificationNotes}"` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {targetRole !== "STAFF" && targetRole !== "ADMINISTRATOR" && (
                      <>
                        {!u.isVerified || (u.verificationStatus === "PENDING" && Boolean(u.verificationKostId)) ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleVerifyUser(u, true)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {u.verificationKostId ? "Setujui Klaim" : "Verifikasi"}
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
                            Tolak
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
                        <option value="PEMILIK_KOST">Pemilik Properti</option>
                        <option value="PENULIS">Penulis</option>
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

      {/* Transfer Owner Modal */}
      {transferTargetKost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Pindahkan Pemilik Properti
              </h3>
              <button
                type="button"
                onClick={() => setTransferTargetKost(null)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Properti:{" "}
              <span className="font-bold text-gray-900">
                {transferTargetKost.name}
              </span>
              {transferTargetKost.ownerName && (
                <>
                  <br />
                  Pemilik saat ini:{" "}
                  <span className="font-semibold text-gray-800">
                    {transferTargetKost.ownerName}
                  </span>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadTransferCandidates(transferSearch);
                  }
                }}
                placeholder="Cari nama atau email pemilik baru..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => loadTransferCandidates(transferSearch)}
                className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Cari
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-2xl border border-gray-200">
              {transferLoading ? (
                <p className="p-4 text-center text-xs text-gray-500">
                  Memuat daftar pengguna...
                </p>
              ) : transferCandidates.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-500">
                  Akun pemilik properti tidak ditemukan.
                </p>
              ) : (
                transferCandidates.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={busy || u.id === transferTargetKost.ownerId}
                    onClick={() => submitTransferOwner(u.id)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-blue-50/60 disabled:opacity-45"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-gray-900">
                        {u.name}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {u.email} • Pemilik Properti
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      {u.id === transferTargetKost.ownerId ? "Saat Ini" : "Pilih"}
                    </span>
                  </button>
                ))
              )}
            </div>
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

      {/* Tab Content: ARTICLES (Admin Moderation) */}
      {tab === "ARTICLES" && isAdmin && (() => {
        const qArt = adminArticleSearch.trim().toLowerCase();
        const filteredArts = qArt
          ? adminArticles.filter((a) =>
              [a.title, a.slug, a.author?.name, a.category]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(qArt),
            )
          : adminArticles;

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={adminArticleSearch}
                  onChange={(e) => setAdminArticleSearch(e.target.value)}
                  placeholder="Cari judul artikel atau nama penulis..."
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
                />
              </div>
              <span className="text-xs font-bold text-gray-500">
                Total: {filteredArts.length} artikel
              </span>
            </div>

            {adminArticlesLoading ? (
              <p className="py-10 text-center text-xs text-gray-400">
                Memuat daftar artikel...
              </p>
            ) : filteredArts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-xs text-gray-500">
                Belum ada artikel blog.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArts.map((art) => (
                  <div
                    key={art.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            art.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {art.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {formatArticleCategoryLabel(art.category)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          • Penulis: {art.author?.name || `#${art.authorId}`} •{" "}
                          {art.viewCount} views
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-extrabold text-gray-900">
                        {art.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {art.status === "PUBLISHED" && (
                        <Link
                          href={`/blog/${art.slug}`}
                          target="_blank"
                          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >
                          Lihat
                        </Link>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          const nextStatus =
                            art.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
                          setBusy(true);
                          try {
                            const res = await fetch(
                              `/api/proxy/articles/${art.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: nextStatus }),
                              },
                            );
                            if (res.ok) {
                              const updated: Article = await res.json();
                              setAdminArticles((prev) =>
                                prev.map((x) =>
                                  x.id === updated.id ? updated : x,
                                ),
                              );
                              setNotice({
                                type: "ok",
                                text:
                                  nextStatus === "DRAFT"
                                    ? `Artikel "${art.title}" di-unpublish.`
                                    : `Artikel "${art.title}" dipublikasikan.`,
                              });
                            }
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {art.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (!window.confirm(`Hapus artikel "${art.title}"?`))
                            return;
                          setBusy(true);
                          try {
                            const res = await fetch(
                              `/api/proxy/articles/${art.id}`,
                              { method: "DELETE" },
                            );
                            if (res.ok) {
                              setAdminArticles((prev) =>
                                prev.filter((x) => x.id !== art.id),
                              );
                              setNotice({
                                type: "ok",
                                text: `Artikel "${art.title}" dihapus.`,
                              });
                            }
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Review & Revisi Withdraw (Staff/Admin) */}
      {reviewingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                Review Pengajuan Withdraw #{reviewingPayout.id}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingPayout(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-xs space-y-1">
              <p className="font-bold text-gray-900">
                {reviewingPayout.ownerName} ({reviewingPayout.ownerEmail})
              </p>
              <p className="text-gray-600">
                Tujuan:{" "}
                <span className="font-semibold text-gray-900">
                  {reviewingPayout.bankName} • {reviewingPayout.accountNumber}
                </span>
              </p>
              <p className="text-gray-600">
                Atas Nama:{" "}
                <span className="font-semibold text-gray-900">
                  {reviewingPayout.accountHolder}
                </span>
              </p>
              <p className="text-gray-600">
                Nominal Diajukan:{" "}
                <span className="font-black text-emerald-700">
                  {formatRupiah(reviewingPayout.amount)}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nominal Disetujui / Revisi (Rp)
              </label>
              <input
                type="number"
                min={10000}
                value={reviewRevisedAmount}
                onChange={(e) => setReviewRevisedAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Jika nominal dikurangi, selisihnya otomatis dikembalikan ke saldo pemilik.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Catatan Staff / Referensi Transfer (Opsional)
              </label>
              <textarea
                rows={2}
                value={reviewAdminNote}
                onChange={(e) => setReviewAdminNote(e.target.value)}
                placeholder="Mis. Sudah ditransfer via BCA / Alasan revisi atau penolakan..."
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleProcessPayout(
                    reviewingPayout.id,
                    "REJECT",
                    reviewAdminNote,
                  )
                }
                className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Tolak & Kembalikan Saldo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const parsed = Math.round(Number(reviewRevisedAmount));
                  if (!Number.isFinite(parsed) || parsed < 10000) {
                    setNotice({
                      type: "err",
                      text: "Nominal revisi minimal Rp10.000.",
                    });
                    return;
                  }
                  void handleProcessPayout(
                    reviewingPayout.id,
                    "APPROVE",
                    reviewAdminNote,
                    parsed,
                  );
                }}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Setujui Penarikan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedWalletTx && (() => {
        const badge = getWalletTxStatusBadge(selectedWalletTx.status);
        const isPositive = selectedWalletTx.amount > 0;
        const canPay = isPayablePendingTopup(selectedWalletTx);
        const isSyncingThis =
          Boolean(selectedWalletTx.orderId) &&
          syncingTopupOrderId === selectedWalletTx.orderId;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Detail Transaksi Kredit
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedWalletTx.description || selectedWalletTx.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWalletTx(null)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Tutup
                </button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Nominal</span>
                  <span
                    className={`text-sm font-black ${
                      isPositive ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatRupiah(selectedWalletTx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Tipe Transaksi</span>
                  <span className="font-bold text-gray-900">
                    {selectedWalletTx.type}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Order ID</span>
                  <span className="font-mono font-semibold text-gray-900 text-right break-all">
                    {selectedWalletTx.orderId || "-"}
                  </span>
                </div>
                {selectedWalletTx.snapToken && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 shrink-0">
                      Token Pembayaran
                    </span>
                    <span className="font-mono font-semibold text-gray-900 text-right break-all">
                      {selectedWalletTx.snapToken}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Metode Pembayaran</span>
                  <span className="font-semibold text-gray-900">
                    {selectedWalletTx.paymentMethod
                      ? selectedWalletTx.paymentMethod.toUpperCase()
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Waktu Dibuat</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedWalletTx.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                {selectedWalletTx.paidAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Waktu Lunas</span>
                    <span className="font-semibold text-emerald-700">
                      {new Date(selectedWalletTx.paidAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {canPay && (
                  <>
                    {selectedWalletTx.orderId && (
                      <button
                        type="button"
                        disabled={isSyncingThis}
                        onClick={() =>
                          void syncTopupOrder(selectedWalletTx.orderId, false)
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            isSyncingThis ? "animate-spin" : ""
                          }`}
                        />
                        {isSyncingThis ? "Mengecek..." : "Cek Status"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={Boolean(openingPaymentOrder)}
                      onClick={() => {
                        const tx = selectedWalletTx;
                        setSelectedWalletTx(null);
                        openTopupCheckout(tx);
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Bayar Sekarang
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedWalletTx(null)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {openingPaymentOrder && (
        <div
          style={{ zIndex: 1000000 }}
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900">
                Memuat Halaman Pembayaran Midtrans...
              </h3>
              <p className="text-xs text-gray-500">
                Mohon tunggu beberapa detik hingga popup pembayaran muncul
                {openingPaymentOrder.orderId
                  ? ` (${openingPaymentOrder.orderId})`
                  : ""}
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {openingPaymentOrder.paymentUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const url = openingPaymentOrder.paymentUrl;
                    try {
                      window.snap?.hide?.();
                    } catch {
                      // ignore
                    }
                    setOpeningPaymentOrder(null);
                    if (url) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  Buka di Tab Baru
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    window.snap?.hide?.();
                  } catch {
                    // ignore
                  }
                  setOpeningPaymentOrder(null);
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
