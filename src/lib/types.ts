export interface Kost {
  id: number;
  name: string;
  slug: string;
  propertyCategory: string;
  type: string;
  city: string;
  district: string;
  address: string;
  description: string;
  pricePerMonth: number;
  pricePerDay?: number | null;
  pricePerYear?: number | null;
  depositAmount?: number | null;
  originalPrice?: number | null;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  availableRooms: number;
  roomSize: string;
  unitType?: string;
  furnishing?: string;
  floorLevel?: number | null;
  buildingArea?: number | null;
  landArea?: number | null;
  bedrooms: number;
  bathrooms: number;
  hasCarport?: boolean;
  isVerified: boolean;
  electricityIncluded: boolean;
  isSinggahsini?: boolean;
  isInstantBooking?: boolean;
  allowDirectBooking: boolean;
  roomFacilities: string[];
  publicFacilities: string[];
  rules: string[];
  images: string[];
  ownerId: number;
  ownerName: string;
  ownerPhone?: string;
  showOwnerWhatsapp?: boolean;
  isStaffPosted?: boolean;
  staffWhatsapp?: string;
  nearbyLandmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  isFavorite?: boolean;
  approvalStatus?: string;
  rejectionReason?: string;
  boostedUntil?: string | null;
  boostTier?: string;
}

export interface MapPoint {
  id: number;
  name: string;
  propertyCategory: string;
  type: string;
  city: string;
  district: string;
  pricePerMonth: number;
  pricePerDay?: number | null;
  pricePerYear?: number | null;
  rating: number;
  availableRooms: number;
  latitude: number;
  longitude: number;
  images?: string[];
  allowDirectBooking?: boolean;
  boostedUntil?: string | null;
}

export interface UserProfile {
  id: number;
  googleId?: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified?: boolean;
  verificationStatus?: string;
  verificationSurveyDate?: string;
  verificationKostId?: number | null;
  verificationNotes?: string;
  verificationRejectionReason?: string;
  avatarUrl: string;
  username?: string;
  bio?: string;
  city?: string;
  coverUrl?: string;
  showWhatsapp?: boolean;
  isBanned?: boolean;
  bannedAt?: string | null;
  onboardingCompleted?: boolean;
  preferredCategory?: string | null;
  hasPassword?: boolean;
  creditBalance?: number;
  payoutBalance?: number;
  pointsBalance?: number;
  totalPointsEarned?: number;
  loyaltyLevel?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Booking {
  id: number;
  kostId: number;
  userId?: number;
  kost?: Kost | null;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  bookingType: string;
  surveyDateTime?: string;
  status: string;
  notes?: string;
  durationCount: number;
  durationUnit: string;
  totalAmount: number;
  platformFee: number;
  ownerNetAmount: number;
  serviceFee?: number;
  paymentScheme?: "FULL" | "DP" | string;
  paidAmount?: number;
  remainingAmount?: number;
  paymentOrderId?: string | null;
  paymentReference?: string | null;
  paymentUrl?: string | null;
  paymentStatus: string;
  escrowStatus: string;
  disputeReason?: string;
  pointsUsed: number;
  pointsDiscountAmount: number;
  pointsEarned: number;
  createdAt: string;
}

export interface ReviewItem {
  id: number;
  kostId: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  overallRating: number;
  ratingCleanliness: number;
  ratingSecurity: number;
  ratingAccuracy: number;
  comment: string;
  ownerReply?: string | null;
  createdAt: string;
}

export interface LoyaltySummary {
  pointsBalance: number;
  totalPointsEarned: number;
  level: string;
  nextLevel: string | null;
  currentMin: number;
  nextTarget: number;
  pointValueRupiah: number;
  transactions: Array<{
    id: number;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

export interface KostFilters {
  cities: string[];
  types: string[];
  facilities: string[];
  cityStats: Array<{
    city: string;
    count: number;
    districts: Array<{ district: string; count: number }>;
  }>;
}

export interface WalletTransaction {
  id: number;
  orderId?: string;
  amount: number;
  type: string;
  description: string;
  status?: string;
  paymentReference?: string | null;
  paymentUrl?: string | null;
  paymentMethod?: string;
  paidAt?: string | null;
  referenceId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletSummary {
  creditBalance: number;
  payoutBalance: number;
  transactions: WalletTransaction[];
}

export interface BoostPackageOption {
  tier: string;
  label?: string;
  durationDays: number;
  price: number;
  description?: string;
}

export interface WalletPricing {
  propertySlotFee?: number;
  freePropertyLimit?: number;
  boostPackages: BoostPackageOption[];
}

export interface ChatBookingSummary {
  id: number;
  status: string;
  bookingType: string;
  startDate: string;
  surveyDateTime?: string | null;
  tenantName: string;
  ownerId: number;
}

export interface ChatMessage {
  id: number;
  kostId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  receiverId: number;
  message: string;
  bookingId?: number | null;
  booking?: ChatBookingSummary | null;
  status: string;
  createdAt: string;
  unreadCount?: number;
  kost?: Kost | null;
  peerUser?: {
    id: number;
    name: string;
    avatarUrl?: string;
    role?: string;
  } | null;
}

export interface KostGroupRoom {
  kostId: number;
  kostName: string;
  kostImage?: string;
  memberCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isAdmin?: boolean;
}

export interface KostGroupMember {
  userId: number;
  name: string;
  avatarUrl?: string;
  role?: string;
  isAdmin?: boolean;
  joinedAt?: string;
}

export interface KostGroupMessage {
  id: number;
  kostId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  message: string;
  createdAt: string;
}

export interface KostGroupDetail {
  kostId: number;
  kostName: string;
  kostImage?: string;
  ownerId: number;
  settings: {
    pinnedAnnouncement?: string | null;
    adminOnly?: boolean;
  };
  members: KostGroupMember[];
  messages: KostGroupMessage[];
}

export interface OwnerPost {
  id: number;
  ownerId: number;
  ownerName?: string;
  ownerAvatar?: string;
  kostId?: number | null;
  kostName?: string | null;
  content: string;
  imageUrl?: string | null;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface OwnerPostComment {
  id: number;
  postId: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt: string;
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const ROLE_LABELS: Record<string, string> = {
  PENYEWA: "Penyewa",
  PEMILIK_KOST: "Pemilik Kost",
  PENULIS: "Penulis",
  STAFF: "Staff",
  ADMINISTRATOR: "Administrator",
};

const CATEGORY_LABELS: Record<string, string> = {
  KOST: "Kost",
  APARTEMEN: "Apartemen",
  KONTRAKAN: "Kontrakan",
  HUNIAN_HARIAN: "Hunian Harian",
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  APPROVED: "Disetujui",
  PENDING: "Menunggu Review",
  REJECTED: "Ditolak",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
  SEWA: "Booking Langsung",
  SURVEI: "Survei",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  TERKIRIM: "Terkirim",
  "MENUNGGU KONFIRMASI": "Menunggu Konfirmasi",
  DISETUJUI: "Disetujui",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Belum Dibayar",
  PAID: "Lunas",
  EXPIRED: "Kedaluwarsa",
  REFUNDED: "Dikembalikan",
};

const ESCROW_STATUS_LABELS: Record<string, string> = {
  NONE: "Tidak Ada",
  HELD: "Dana Ditahan",
  RELEASED: "Dana Diteruskan",
  DISPUTED: "Dalam Sengketa",
  REFUNDED: "Dikembalikan",
};

function formatEnumLabel(
  value: string | null | undefined,
  labels: Record<string, string>,
  fallback = "-",
): string {
  const raw = (value || "").trim();
  if (!raw) return fallback;
  return labels[raw.toUpperCase()] ?? raw;
}

export function formatRoleLabel(role?: string | null): string {
  return formatEnumLabel(role, ROLE_LABELS);
}

export function formatCategoryLabel(category?: string | null): string {
  return formatEnumLabel(category, CATEGORY_LABELS, "Kost");
}

export function isKostProperty(category?: string | null): boolean {
  return (category || "KOST").trim().toUpperCase() === "KOST";
}

export function formatApprovalStatusLabel(status?: string | null): string {
  return formatEnumLabel(status, APPROVAL_STATUS_LABELS);
}

export function formatBookingTypeLabel(bookingType?: string | null): string {
  return formatEnumLabel(bookingType, BOOKING_TYPE_LABELS, "Survei");
}

export function formatBookingStatusLabel(status?: string | null): string {
  return formatEnumLabel(status, BOOKING_STATUS_LABELS);
}

export function formatPaymentStatusLabel(status?: string | null): string {
  return formatEnumLabel(status, PAYMENT_STATUS_LABELS);
}

export function formatEscrowStatusLabel(status?: string | null): string {
  return formatEnumLabel(status, ESCROW_STATUS_LABELS);
}

export function resolveImageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const hostBase = apiBase ? apiBase.replace(/\/api\/?$/, "") : "";

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    if (hostBase) {
      try {
        const parsed = new URL(pathOrUrl);
        if (parsed.pathname.startsWith("/uploads/")) {
          return `${hostBase}${parsed.pathname}`;
        }
      } catch {
        // ignore invalid URL
      }
    }
    return pathOrUrl;
  }

  if (!hostBase) {
    return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  }
  return pathOrUrl.startsWith("/") ? `${hostBase}${pathOrUrl}` : `${hostBase}/${pathOrUrl}`;
}

export function getSocketBaseUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  if (!apiBase) return "";
  return apiBase.replace(/\/api\/?$/, "");
}

export function getDisplayPrice(kost: Pick<Kost, "propertyCategory" | "pricePerDay" | "pricePerYear" | "pricePerMonth">): { amount: number; unit: string } {
  const cat = (kost.propertyCategory || "").toUpperCase();
  const isDaily = cat === "HUNIAN_HARIAN";
  const isKontrakan = cat === "KONTRAKAN";
  if (isDaily && (kost.pricePerDay ?? 0) > 0) {
    return { amount: Number(kost.pricePerDay), unit: "/hari" };
  }
  if (isKontrakan && (kost.pricePerYear ?? 0) > 0) {
    return { amount: Number(kost.pricePerYear), unit: "/tahun" };
  }
  return { amount: Number(kost.pricePerMonth || 0), unit: "/bulan" };
}

export interface BookingBreakdown {
  baseTotal: number;
  canUseDp: boolean;
  effectiveScheme: "FULL" | "DP";
  payableRent: number;
  remainingRent: number;
  depositAmount: number;
  platformFee: number;
  serviceFee: number;
  maxUsablePoints: number;
  appliedDiscount: number;
  finalPayNow: number;
}

/**
 * Menghitung rincian pembayaran booking dengan perlindungan fee payment gateway
 * agar platform tidak mengalami kerugian pada transaksi kecil maupun penggunaan poin.
 */
export function calculateBookingBreakdown(params: {
  priceAmount: number;
  durationCount: number;
  isDaily: boolean;
  isYearly: boolean;
  paymentScheme: "FULL" | "DP";
  userPoints: number;
  usePoints: boolean;
  depositAmount?: number | null;
}): BookingBreakdown {
  const baseTotal = Math.max(0, params.priceAmount * params.durationCount);
  const canUseDp = !params.isDaily && (params.durationCount > 1 || params.isYearly);
  const effectiveScheme: "FULL" | "DP" =
    canUseDp && params.paymentScheme === "DP" ? "DP" : "FULL";

  const payableRent =
    effectiveScheme === "DP" ? Math.round(baseTotal * 0.3) : baseTotal;
  const remainingRent = Math.max(0, baseTotal - payableRent);

  const platformFee = Math.round(payableRent * 0.01);
  const maxPointDiscount = Math.floor(platformFee * 0.5);
  const pointCapByPayable = Math.max(0, payableRent - 1000);
  const maxUsablePoints = Math.min(
    Math.max(0, params.userPoints),
    Math.floor(Math.min(maxPointDiscount, pointCapByPayable) / 50),
  );
  const appliedDiscount = params.usePoints ? maxUsablePoints * 50 : 0;

  const netRentPayNow = Math.max(1000, payableRent - appliedDiscount);
  // Biaya layanan & transaksi ditanggung oleh pemilik properti, penyewa bebas biaya tambahan
  const serviceFee = 0;
  const finalPayNow = netRentPayNow;

  return {
    baseTotal,
    canUseDp,
    effectiveScheme,
    payableRent,
    remainingRent,
    depositAmount: Math.max(0, Number(params.depositAmount || 0)),
    platformFee,
    serviceFee,
    maxUsablePoints,
    appliedDiscount,
    finalPayNow,
  };
}

export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  targetUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  TIPS_KOST: "Tips Cari Kost",
  PANDUAN_AREA: "Panduan Area & Kampus",
  INFO_KONTRAKAN: "Info Kontrakan & Apartemen",
  GAYA_HIDUP: "Gaya Hidup Anak Kost",
  KEUANGAN: "Keuangan & Promo",
};

export function formatArticleCategoryLabel(category?: string | null): string {
  return formatEnumLabel(category, ARTICLE_CATEGORY_LABELS, "Tips Cari Kost");
}

export interface ArticleAuthor {
  id: number;
  name: string;
  avatarUrl?: string | null;
  bio?: string;
}

export interface ArticleCategoryItem {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl?: string | null;
  category: string;
  tags: string[];
  city?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "DRAFT" | "PUBLISHED";
  isFeatured: boolean;
  viewCount: number;
  readingTimeMinutes: number;
  authorId: number;
  author?: ArticleAuthor;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResponse {
  data: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
