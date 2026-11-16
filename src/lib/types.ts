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
  originalPrice?: number | null;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  availableRooms: number;
  roomSize: string;
  unitType?: string;
  bedrooms: number;
  bathrooms: number;
  isVerified: boolean;
  electricityIncluded: boolean;
  allowDirectBooking: boolean;
  roomFacilities: string[];
  publicFacilities: string[];
  rules: string[];
  images: string[];
  ownerId: number;
  ownerName: string;
  ownerPhone?: string;
  nearbyLandmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  boostedUntil?: string | null;
  boostTier?: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
  pointsBalance?: number;
  totalPointsEarned?: number;
  loyaltyLevel?: string;
}

export interface Booking {
  id: number;
  kostId: number;
  kost?: Kost | null;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  bookingType: string;
  surveyDateTime?: string;
  status: string;
  durationCount: number;
  durationUnit: string;
  totalAmount: number;
  platformFee: number;
  ownerNetAmount: number;
  paymentOrderId?: string | null;
  snapToken?: string | null;
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

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function resolveImageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const hostBase = apiBase.replace(/\/api\/?$/, "");
  return pathOrUrl.startsWith("/") ? `${hostBase}${pathOrUrl}` : `${hostBase}/${pathOrUrl}`;
}

export function getDisplayPrice(kost: Kost): { amount: number; unit: string } {
  const isDaily = (kost.propertyCategory || "").toUpperCase() === "HUNIAN_HARIAN";
  if (isDaily && (kost.pricePerDay ?? 0) > 0) {
    return { amount: Number(kost.pricePerDay), unit: "/hari" };
  }
  return { amount: Number(kost.pricePerMonth || 0), unit: "/bulan" };
}
