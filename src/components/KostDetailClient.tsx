"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Flag,
  Heart,
  Info,
  KeyRound,
  MapPin,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Reply,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { FacilityIcon } from "./FacilityIcon";
import {
  calculateBookingBreakdown,
  formatCategoryLabel,
  formatRupiah,
  getDisplayPrice,
  hasDualRoles,
  isKostProperty,
  resolveImageUrl,
  type Kost,
  type ReviewItem,
  type UserProfile,
} from "@/lib/types";
import { getSiteUrl } from "@/lib/seo";
import {
  normalizeAndValidateIndonesianPhone,
  toWhatsappDigits,
} from "@/lib/validation";
import { KostCard } from "./KostCard";

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks?: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
      hide?: () => void;
    };
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

interface KostDetailClientProps {
  kost: Kost;
  reviews: ReviewItem[];
  currentUser: UserProfile | null;
  recommendedKosts?: Kost[];
  activeBookingStatus?: string | null;
}

export function KostDetailClient({
  kost,
  reviews: initialReviews,
  currentUser,
  recommendedKosts = [],
  activeBookingStatus = null,
}: KostDetailClientProps) {
  const router = useRouter();
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(kost.isFavorite));
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [modalMode, setModalMode] = useState<"SURVEI" | "DIRECT" | null>(null);

  // Review states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cleanliness, setCleanliness] = useState(5);
  const [security, setSecurity] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    try {
      const key = "keyloka_recently_viewed";
      const existing: Kost[] = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [kost, ...existing.filter((x) => x.id !== kost.id)].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [kost]);

  const minSurveyDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [tenantName, setTenantName] = useState(currentUser?.name || "");
  const [tenantPhone, setTenantPhone] = useState(currentUser?.phone || "");
  const [startDate, setStartDate] = useState(minSurveyDate);
  const [bookingTime, setBookingTime] = useState("10:00");
  const [durationCount, setDurationCount] = useState(1);
  const [paymentScheme, setPaymentScheme] = useState<"FULL" | "DP">("FULL");
  const [usePoints, setUsePoints] = useState(false);
  const [showFeeInfo, setShowFeeInfo] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [propertyActionOpen, setPropertyActionOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [reportPropertyOpen, setReportPropertyOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Informasi atau harga tidak sesuai");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const recaptchaSiteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim();

  useEffect(() => {
    if (!reportPropertyOpen || !recaptchaSiteKey) return;

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !recaptchaContainerRef.current || !window.grecaptcha) return;
      window.grecaptcha.ready(() => {
        if (cancelled || !recaptchaContainerRef.current || !window.grecaptcha) return;
        if (recaptchaContainerRef.current.childElementCount > 0) return;
        recaptchaWidgetIdRef.current = window.grecaptcha.render(
          recaptchaContainerRef.current,
          {
            sitekey: recaptchaSiteKey,
            callback: (token) => {
              setRecaptchaToken(token);
              setReportError(null);
            },
            "expired-callback": () => {
              setRecaptchaToken("");
            },
          },
        );
      });
    };

    if (window.grecaptcha) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    const scriptId = "google-recaptcha-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderWidget);
    };
  }, [reportPropertyOpen, recaptchaSiteKey]);

  async function handleSubmitKostReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError(null);
    if (recaptchaSiteKey && !recaptchaToken) {
      setReportError("Harap selesaikan verifikasi reCAPTCHA terlebih dahulu.");
      return;
    }

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/proxy/kosts/${kost.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim() || undefined,
          recaptchaToken: recaptchaToken || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d?.message || "Gagal mengirim laporan properti.");
      }
      setReportSubmitted(true);
      setReportDetails("");
      setRecaptchaToken("");
      if (recaptchaWidgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      }
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Gagal mengirim laporan properti.",
      );
    } finally {
      setSubmittingReport(false);
    }
  }
  const [propertyActionTab, setPropertyActionTab] = useState<"CLAIM" | "DELETE">("CLAIM");
  const [claimPhone, setClaimPhone] = useState(currentUser?.phone || "");
  const [claimNotes, setClaimNotes] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(
    Boolean(
      currentUser?.verificationStatus === "PENDING" &&
        currentUser?.verificationKostId === kost.id,
    ),
  );

  const currentUserRole = (currentUser?.role || "").toUpperCase();
  const canShowClaim =
    Boolean(kost.isStaffPosted) &&
    currentUser?.id !== kost.ownerId &&
    currentUserRole !== "STAFF" &&
    currentUserRole !== "ADMINISTRATOR";

  const price = getDisplayPrice(kost);
  const cat = (kost.propertyCategory || "").toUpperCase();
  const isDaily = cat === "HUNIAN_HARIAN";
  const isYearly = cat === "KONTRAKAN" && (kost.pricePerYear ?? 0) > 0;
  const photos = (kost.images || []).map(resolveImageUrl).filter(Boolean);
  const maxDuration = isDaily ? 30 : isYearly ? 5 : 12;

  const breakdown = calculateBookingBreakdown({
    priceAmount: price.amount,
    durationCount,
    isDaily,
    isYearly,
    paymentScheme,
    userPoints: currentUser?.pointsBalance ?? 0,
    usePoints,
    depositAmount: kost.depositAmount,
  });
  const { maxUsablePoints, appliedDiscount } = breakdown;

  function openModal(mode: "SURVEI" | "DIRECT") {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUserRole === "PEMILIK_KOST") {
      return;
    }
    setFeedback(null);
    setBookingTime(mode === "DIRECT" ? "14:00" : "10:00");
    setModalMode(mode);
  }

  const [switchingToTenant, setSwitchingToTenant] = useState(false);
  const [switchRoleError, setSwitchRoleError] = useState<string | null>(null);

  async function handleEnterTenantMode() {
    if (!currentUser || switchingToTenant) return;
    setSwitchingToTenant(true);
    setSwitchRoleError(null);
    try {
      const endpoint = hasDualRoles(currentUser)
        ? "/api/auth/switch-role"
        : "/api/auth/register-role";
      const body = hasDualRoles(currentUser)
        ? { role: "PENYEWA" }
        : { role: "PENYEWA", switchNow: true };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setSwitchRoleError(data?.message || "Gagal beralih ke Mode Penyewa.");
      }
    } catch {
      setSwitchRoleError("Gagal terhubung ke server.");
    } finally {
      setSwitchingToTenant(false);
    }
  }

  function openPropertyActionModal() {
    setClaimFeedback(null);
    setPropertyActionTab("CLAIM");
    setPropertyActionOpen(true);
  }

  async function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    const phoneCheck = normalizeAndValidateIndonesianPhone(claimPhone, {
      required: true,
    });
    if (!phoneCheck.valid) {
      setClaimFeedback({
        type: "error",
        text: phoneCheck.error || "Nomor WhatsApp tidak valid.",
      });
      return;
    }
    setClaiming(true);
    setClaimFeedback(null);
    try {
      const res = await fetch("/api/proxy/auth/users/verification-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId: kost.id,
          phone: phoneCheck.normalized,
          notes: claimNotes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengirim pengajuan klaim.");
      }
      setClaimSubmitted(true);
      setClaimFeedback({
        type: "success",
        text: "Pengajuan klaim terkirim! Staff akan segera menghubungi Anda untuk verifikasi.",
      });
      router.refresh();
    } catch (err) {
      setClaimFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setClaiming(false);
    }
  }

  async function handleSubmitSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName.trim() || tenantName.trim().length < 2) {
      setFeedback({
        type: "error",
        text: "Nama lengkap minimal 2 karakter.",
      });
      return;
    }
    const phoneCheck = normalizeAndValidateIndonesianPhone(tenantPhone, {
      required: true,
      label: "Nomor HP / WhatsApp",
    });
    if (!phoneCheck.valid) {
      setFeedback({
        type: "error",
        text: phoneCheck.error || "Nomor HP / WhatsApp tidak valid.",
      });
      return;
    }
    if (!startDate || startDate < minSurveyDate) {
      setFeedback({
        type: "error",
        text: "Tanggal survei harus setelah hari ini (minimal besok).",
      });
      return;
    }
    if (!bookingTime) {
      setFeedback({
        type: "error",
        text: "Harap pilih jam survei.",
      });
      return;
    }
    const scheduleLabel = `${startDate} ${bookingTime} WIB`;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/proxy/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId: kost.id,
          tenantName: tenantName.trim(),
          tenantPhone: phoneCheck.normalized,
          startDate,
          bookingType: "SURVEI",
          surveyTime: bookingTime,
          surveyDateTime: scheduleLabel,
          notes: notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengirim pertanyaan ketersediaan.");
      }
      setFeedback({
        type: "success",
        text: "Pertanyaan ketersediaan & survei berhasil dikirim! Cek menu Booking & Poin.",
      });
      setTimeout(() => {
        setModalMode(null);
        router.push("/bookings");
      }, 1200);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function syncDirectPayment(
    bookingId: number,
    paymentState: "success" | "pending" = "pending",
  ) {
    try {
      await fetch(`/api/proxy/bookings/${bookingId}/sync-payment`, {
        method: "POST",
      });
    } catch {
      // Tetap arahkan ke /bookings agar user dapat memeriksa status pembayaran
    }
    router.push(`/bookings?payment=${paymentState}`);
    router.refresh();
  }

  async function handleSubmitDirect(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName.trim() || tenantName.trim().length < 2) {
      setFeedback({
        type: "error",
        text: "Nama lengkap minimal 2 karakter.",
      });
      return;
    }
    const phoneCheck = normalizeAndValidateIndonesianPhone(tenantPhone, {
      required: true,
      label: "Nomor HP / WhatsApp",
    });
    if (!phoneCheck.valid) {
      setFeedback({
        type: "error",
        text: phoneCheck.error || "Nomor HP / WhatsApp tidak valid.",
      });
      return;
    }
    if (!startDate || startDate < minSurveyDate) {
      setFeedback({
        type: "error",
        text: "Tanggal mulai masuk harus setelah hari ini (minimal besok).",
      });
      return;
    }
    if (!bookingTime) {
      setFeedback({
        type: "error",
        text: "Harap pilih perkiraan jam check-in.",
      });
      return;
    }
    const scheduleLabel = `${startDate} ${bookingTime} WIB`;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/proxy/bookings/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId: kost.id,
          tenantName: tenantName.trim(),
          tenantPhone: phoneCheck.normalized,
          startDate,
          checkInTime: bookingTime,
          surveyDateTime: scheduleLabel,
          durationCount,
          paymentScheme: breakdown.effectiveScheme,
          notes: notes.trim(),
          usePoints,
        }),
      });
      const booking = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(booking?.message || "Gagal membuat booking langsung.");
      }

      if (window.snap && booking.snapToken) {
        setModalMode(null);
        window.snap.pay(booking.snapToken, {
          onSuccess: () => syncDirectPayment(booking.id, "success"),
          onPending: () => syncDirectPayment(booking.id, "pending"),
          onClose: () => syncDirectPayment(booking.id, "pending"),
          onError: () => {
            setFeedback({
              type: "error",
              text: "Pembayaran gagal atau dibatalkan.",
            });
          },
        });
      } else if (booking.paymentUrl) {
        window.open(booking.paymentUrl, "_blank", "noopener,noreferrer");
        setFeedback({
          type: "success",
          text: "Halaman pembayaran dibuka di tab baru. Setelah bayar, cek status di Booking & Poin.",
        });
        setTimeout(() => {
          setModalMode(null);
          router.push("/bookings");
        }, 1800);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Photos + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <div className="relative aspect-[16/10] w-full bg-gray-100">
              {photos[activePhoto] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[activePhoto]}
                  alt={kost.name}
                  onClick={() => setLightboxOpen(true)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Foto belum tersedia
                </div>
              )}

              <div className="absolute right-3 top-3 flex items-center gap-2">
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    title="Perbesar Foto"
                    className="rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const url = window.location.href;
                    if (navigator.share) {
                      await navigator.share({ title: kost.name, url }).catch(() => {});
                    } else {
                      await navigator.clipboard.writeText(url).catch(() => {});
                      setCopiedMsg(true);
                      setTimeout(() => setCopiedMsg(false), 2000);
                    }
                  }}
                  title="Bagikan"
                  className="rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUser) {
                      router.push("/login");
                      return;
                    }
                    setIsFavorite((v) => !v);
                    await fetch(`/api/proxy/kosts/${kost.id}/favorite`, {
                      method: "PATCH",
                    }).catch(() => {});
                  }}
                  title="Simpan ke Favorit"
                  className="rounded-full bg-white/95 p-2 text-gray-700 shadow-sm hover:bg-white"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isFavorite ? "fill-rose-500 text-rose-500" : "text-gray-600"
                    }`}
                  />
                </button>
              </div>
              {copiedMsg && (
                <div className="absolute bottom-3 right-3 rounded-xl bg-gray-900/85 px-3 py-1.5 text-xs font-bold text-white">
                  Tautan disalin!
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50">
                {photos.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhoto(idx)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      activePhoto === idx
                        ? "border-emerald-600"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${kost.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {formatCategoryLabel(kost.propertyCategory)} • {kost.type}
                </span>
                {kost.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Terverifikasi
                  </span>
                )}
                {kost.allowDirectBooking && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Direct Booking + Escrow
                  </span>
                )}
              </div>

              {(canShowClaim || currentUser?.id !== kost.ownerId) && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((prev) => !prev)}
                    aria-label="Opsi properti lainnya"
                    aria-expanded={moreMenuOpen}
                    className={`rounded-full p-1.5 transition ${
                      claimSubmitted
                        ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {moreMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setMoreMenuOpen(false)}
                      />
                      <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg">
                        {canShowClaim && (
                          <button
                            type="button"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              openPropertyActionModal();
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            <KeyRound
                              className={`h-4 w-4 shrink-0 ${
                                claimSubmitted ? "text-amber-600" : "text-gray-500"
                              }`}
                            />
                            <span>
                              {claimSubmitted
                                ? "Klaim Properti (Diproses)"
                                : "Klaim atau Hapus Properti"}
                            </span>
                          </button>
                        )}
                        {currentUser?.id !== kost.ownerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setReportSubmitted(false);
                              setReportDetails("");
                              setReportPropertyOpen(true);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Flag className="h-4 w-4 shrink-0 text-rose-500" />
                            <span>Laporkan Properti</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                {kost.name}
              </h1>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {kost.address}, {kost.district}, {kost.city}
                  {kost.nearbyLandmark ? ` (Dekat ${kost.nearbyLandmark})` : ""}
                </span>
              </p>
              {kost.latitude && kost.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${kost.latitude},${kost.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buka Lokasi di Google Maps
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-gray-100 py-4 text-center">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-sm font-extrabold text-gray-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {Number(kost.rating || 0).toFixed(1)} ({kost.reviewCount})
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Sisa Kamar</p>
                <p className="mt-0.5 text-sm font-extrabold text-emerald-700">
                  {kost.availableRooms} Unit
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Ukuran</p>
                <p className="mt-0.5 text-sm font-extrabold text-gray-900">
                  {kost.roomSize || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Listrik</p>
                <p className="mt-0.5 text-sm font-extrabold text-gray-900">
                  {kost.electricityIncluded ? "Termasuk" : "Tidak Termasuk"}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Deskripsi Properti
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {kost.description}
              </p>
            </div>

            {kost.roomFacilities?.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Fasilitas Kamar
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {kost.roomFacilities.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      <FacilityIcon name={f} className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {kost.publicFacilities?.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Fasilitas Umum
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {kost.publicFacilities.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      <FacilityIcon name={f} className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {kost.rules?.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Peraturan Hunian
                </h2>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {kost.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">
                Ulasan Penghuni ({reviews.length})
              </h2>
              {currentUser && currentUser.id !== kost.ownerId && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  {showReviewForm ? "Tutup Form" : "Tulis Ulasan"}
                </button>
              )}
            </div>

            {showReviewForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingReview(true);
                  setReviewError(null);
                  try {
                    const res = await fetch("/api/proxy/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        kostId: kost.id,
                        ratingCleanliness: cleanliness,
                        ratingSecurity: security,
                        ratingAccuracy: accuracy,
                        comment: reviewComment.trim(),
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      setReviews((prev) => [data, ...prev]);
                      setReviewComment("");
                      setShowReviewForm(false);
                    } else {
                      setReviewError(
                        data?.message || "Gagal mengirim ulasan. Silakan coba lagi.",
                      );
                    }
                  } catch {
                    setReviewError("Gagal mengirim ulasan. Periksa koneksi Anda.");
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3"
              >
                {reviewError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {reviewError}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <label className="font-bold text-gray-700">
                    Kebersihan (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={cleanliness}
                      onChange={(e) => setCleanliness(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5"
                    />
                  </label>
                  <label className="font-bold text-gray-700">
                    Keamanan (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={security}
                      onChange={(e) => setSecurity(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5"
                    />
                  </label>
                  <label className="font-bold text-gray-700">
                    Akurasi Foto (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={accuracy}
                      onChange={(e) => setAccuracy(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5"
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Bagikan pengalaman Anda selama tinggal atau survei di properti ini..."
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada ulasan untuk properti ini.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => {
                  const canReply =
                    currentUser &&
                    (currentUser.id === kost.ownerId ||
                      currentUser.role === "STAFF" ||
                      currentUser.role === "ADMINISTRATOR");
                  return (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-bold text-gray-900">
                            {rev.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {Number(rev.overallRating).toFixed(1)}
                          </span>
                          {currentUser && currentUser.id !== rev.userId && (
                            <button
                              type="button"
                              title="Laporkan ulasan"
                              onClick={async () => {
                                const reason = window.prompt(
                                  "Alasan melaporkan ulasan ini:",
                                  "Tidak pantas / spam",
                                );
                                if (!reason) return;
                                await fetch(`/api/proxy/reviews/${rev.id}/report`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ reason }),
                                });
                                alert("Laporan ulasan terkirim.");
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{rev.comment}</p>
                      {rev.ownerReply && (
                        <div className="mt-2 rounded-xl bg-white p-3 border border-gray-200 text-xs text-gray-600">
                          <span className="font-bold text-emerald-700">
                            Balasan Pemilik:{" "}
                          </span>
                          {rev.ownerReply}
                        </div>
                      )}
                      {canReply && !rev.ownerReply && (
                        <div className="mt-2">
                          {replyingId === rev.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Tulis balasan pemilik..."
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!replyText.trim()) return;
                                  const res = await fetch(
                                    `/api/proxy/reviews/${rev.id}/reply`,
                                    {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        ownerReply: replyText.trim(),
                                      }),
                                    },
                                  );
                                  if (res.ok) {
                                    setReviews((prev) =>
                                      prev.map((item) =>
                                        item.id === rev.id
                                          ? { ...item, ownerReply: replyText.trim() }
                                          : item,
                                      ),
                                    );
                                    setReplyingId(null);
                                    setReplyText("");
                                  }
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                              >
                                Kirim
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReplyingId(rev.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                            >
                              <Reply className="h-3 w-3" />
                              Balas Ulasan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Action Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500">Harga Sewa</p>
              <p className="mt-1 text-3xl font-black text-emerald-700">
                {formatRupiah(price.amount)}
                <span className="text-sm font-semibold text-gray-500">
                  {price.unit}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Pengelola:{" "}
                <Link
                  href={`/owner/${kost.ownerId}`}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  {kost.ownerName}
                </Link>
              </p>
            </div>

            {kost.allowDirectBooking && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Dilindungi Escrow Keyloka
                </p>
                <p className="mt-1 text-emerald-800">
                  Uang sewa ditahan aman oleh Keyloka dan baru diteruskan ke pemilik setelah Anda konfirmasi check-in.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {currentUser?.id !== kost.ownerId && (
                <Link
                  href={
                    currentUser
                      ? `/chat?kostId=${kost.id}&peerId=${kost.ownerId}`
                      : "/login"
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 transition"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Tanya Pemilik (Chat)
                </Link>
              )}
              {kost.showOwnerWhatsapp && kost.ownerPhone && (() => {
                const waNumber = toWhatsappDigits(kost.ownerPhone);
                if (!waNumber) return null;
                const kostUrl = `${getSiteUrl()}/kost/${kost.id}`;
                const waText = encodeURIComponent(
                  `Halo, saya melihat ${kost.name} (${kost.city}) di platform Keyloka.\nBoleh info ketersediaan dan detail lengkapnya?\n\n${kostUrl}`,
                );
                return (
                  <a
                    href={`https://wa.me/${waNumber}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <Phone className="h-4 w-4 text-emerald-600" />
                    Chat Pemilik via WhatsApp
                  </a>
                );
              })()}
              {currentUser && isKostProperty(kost.propertyCategory) && (
                <Link
                  href={`/chat?groupKostId=${kost.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  <Users className="h-4 w-4 text-emerald-600" />
                  Grup Penghuni Kost
                </Link>
              )}
              {currentUser &&
                (currentUser.id === kost.ownerId ||
                  currentUserRole === "STAFF" ||
                  currentUserRole === "ADMINISTRATOR") && (
                  <Link
                    href={`/dashboard/edit-property/${kost.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <Edit3 className="h-4 w-4" />
                    Kelola / Edit Properti
                  </Link>
                )}
              {currentUser?.id === kost.ownerId ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-center text-xs font-bold text-gray-600">
                  Ini adalah properti milik Anda.
                </div>
              ) : currentUserRole === "PEMILIK_KOST" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-center space-y-2.5">
                  <p className="text-xs font-semibold text-amber-900">
                    Anda sedang berada di <strong>Mode Pemilik</strong>. Beralih ke Mode Penyewa untuk melakukan booking atau tanya ketersediaan.
                  </p>
                  <button
                    type="button"
                    disabled={switchingToTenant}
                    onClick={handleEnterTenantMode}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {switchingToTenant
                      ? "Mengaktifkan Mode Penyewa..."
                      : hasDualRoles(currentUser)
                        ? "Beralih ke Mode Penyewa"
                        : "Aktifkan Mode Penyewa untuk Booking"}
                  </button>
                  {switchRoleError && (
                    <p className="text-[11px] font-semibold text-red-600">
                      {switchRoleError}
                    </p>
                  )}
                </div>
              ) : activeBookingStatus ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center space-y-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-900 border border-amber-300">
                    {activeBookingStatus.toUpperCase() === "DIBAYAR"
                      ? "Sudah Dibooking (Menunggu Check-in)"
                      : "Dalam Proses Booking (Menunggu Pembayaran)"}
                  </span>
                  <p className="text-xs text-amber-900">
                    Properti ini masih dalam proses booking Anda.
                  </p>
                  <Link
                    href="/bookings"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                  >
                    Lihat di Menu Booking
                  </Link>
                </div>
              ) : kost.allowDirectBooking ? (
                kost.availableRooms > 0 ? (
                  <>
                    <button
                      onClick={() => openModal("DIRECT")}
                      className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      Booking Sekarang (Escrow)
                    </button>
                    <button
                      onClick={() => openModal("SURVEI")}
                      className="w-full rounded-xl border border-emerald-600 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      Tanyakan Ketersediaan
                    </button>
                  </>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-xl bg-gray-200 py-3.5 text-sm font-bold text-gray-500 cursor-not-allowed"
                  >
                    Kamar Penuh
                  </button>
                )
              ) : (
                <button
                  onClick={() => openModal("SURVEI")}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Tanyakan Ketersediaan
                </button>
              )}
              {currentUser?.id !== kost.ownerId && currentUserRole !== "PEMILIK_KOST" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] leading-relaxed text-amber-950">
                  <p className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Peringatan Keamanan:</strong>{" "}
                      {kost.allowDirectBooking
                        ? "Dilarang melakukan transfer langsung ke rekening pemilik di luar platform Keyloka. Gunakan pembayaran Escrow resmi agar dana Anda terlindungi."
                        : "Properti ini belum mengaktifkan pembayaran Escrow. Jangan melakukan transfer DP atau sewa langsung ke pemilik di luar platform sebelum survei di lokasi."}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rekomendasi Properti Serupa */}
      {recommendedKosts.length > 0 && (() => {
        const recCategoryLabel = formatCategoryLabel(kost.propertyCategory);
        return (
          <section className="mt-10 border-t border-gray-200/80 pt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">
                  Rekomendasi {recCategoryLabel} Lainnya
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                  Pilihan {recCategoryLabel.toLowerCase()} lain yang mungkin cocok untuk Anda
                </p>
              </div>
              <Link
                href={
                  isDaily
                    ? "/?stayMode=HUNIAN_HARIAN"
                    : `/?category=${encodeURIComponent(kost.propertyCategory || "KOST")}`
                }
                className="shrink-0 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Lihat Semua →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedKosts.map((item) => (
                <KostCard key={item.id} kost={item} />
              ))}
            </div>
          </section>
        );
      })()}

      {/* Modal Booking / Survei */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-gray-50/70">
              <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50/70">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {modalMode === "DIRECT" ? "Booking Langsung" : "Tanya Ketersediaan & Survei"}
                </span>
                <h3 className="mt-1 truncate text-base font-black text-gray-900">
                  {kost.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatRupiah(price.amount)} / {isDaily ? "hari" : isYearly ? "tahun" : "bulan"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="Tutup modal"
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                modalMode === "DIRECT" ? handleSubmitDirect : handleSubmitSurvey
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Nama sesuai KTP"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nomor HP / WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {modalMode === "DIRECT"
                        ? "Tanggal Mulai Masuk"
                        : "Rencana Tanggal Survei"}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        min={minSurveyDate}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {modalMode === "DIRECT"
                        ? "Perkiraan Jam Check-In (WIB)"
                        : "Jam Survei (WIB)"}
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        required
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {modalMode === "DIRECT" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Durasi ({isDaily ? "Hari" : isYearly ? "Tahun" : "Bulan"})
                    </label>
                    <div className="flex h-[42px] items-center justify-between rounded-xl border border-gray-200 bg-white px-2">
                      <button
                        type="button"
                        aria-label="Kurangi durasi"
                        disabled={durationCount <= 1}
                        onClick={() =>
                          setDurationCount((d) => Math.max(1, d - 1))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-base font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-gray-900">
                        {durationCount} {isDaily ? "Hari" : isYearly ? "Tahun" : "Bulan"}
                      </span>
                      <button
                        type="button"
                        aria-label="Tambah durasi"
                        disabled={durationCount >= maxDuration}
                        onClick={() =>
                          setDurationCount((d) => Math.min(maxDuration, d + 1))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-base font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {modalMode === "DIRECT" && (
                  <>
                    {breakdown.canUseDp && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700">
                          Skema Pembayaran
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentScheme("FULL")}
                            className={`rounded-xl border p-2.5 text-left transition ${
                              breakdown.effectiveScheme === "FULL"
                                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <p className="text-xs font-extrabold text-gray-900">
                              Bayar Penuh (100%)
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              Langsung lunas tanpa sisa tagihan
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentScheme("DP")}
                            className={`rounded-xl border p-2.5 text-left transition ${
                              breakdown.effectiveScheme === "DP"
                                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <p className="text-xs font-extrabold text-gray-900">
                              DP 30% (Booking Fee)
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              Kunci unit, lunasi sisa saat check-in
                            </p>
                          </button>
                        </div>
                      </div>
                    )}

                    {maxUsablePoints > 0 && (
                      <label className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs cursor-pointer">
                        <span className="flex items-center gap-2 font-bold text-amber-900">
                          <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                          Pakai {maxUsablePoints} Poin (-
                          {formatRupiah(maxUsablePoints * 50)})
                        </span>
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                      </label>
                    )}

                    <div className="rounded-xl bg-gray-50 p-3.5 text-xs space-y-1.5 border border-gray-100">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal Sewa ({durationCount} {isDaily ? "Hari" : isYearly ? "Tahun" : "Bulan"})</span>
                        <span className="font-semibold text-gray-800">{formatRupiah(breakdown.baseTotal)}</span>
                      </div>

                      {breakdown.effectiveScheme === "DP" && (
                        <>
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Tagihan DP Sekarang (30%)</span>
                            <span>{formatRupiah(breakdown.payableRent)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Sisa Pelunasan (saat Check-In)</span>
                            <span>{formatRupiah(breakdown.remainingRent)}</span>
                          </div>
                        </>
                      )}

                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Potongan Poin Loyalti</span>
                          <span>-{formatRupiah(appliedDiscount)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-gray-600">
                        <button
                          type="button"
                          onClick={() => setShowFeeInfo((v) => !v)}
                          className="inline-flex items-center gap-1 text-left hover:text-emerald-700 transition"
                          title="Klik untuk penjelasan biaya layanan"
                        >
                          <span>Biaya Layanan & Transaksi</span>
                          <Info className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                        <span className="font-semibold text-emerald-700">Gratis</span>
                      </div>

                      {showFeeInfo && (
                        <p className="rounded-lg bg-white border border-gray-200 p-2 text-[11px] leading-relaxed text-gray-600">
                          Gratis biaya layanan untuk penyewa. Seluruh biaya pemrosesan pembayaran ditanggung oleh pemilik properti.
                        </p>
                      )}

                      <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-black text-gray-900">
                        <span>{breakdown.effectiveScheme === "DP" ? "Total Bayar DP" : "Total Bayar Sekarang"}</span>
                        <span className="text-emerald-700">
                          {formatRupiah(breakdown.finalPayNow)}
                        </span>
                      </div>
                    </div>

                    {/* Info Penting untuk Penyewa (Keamanan, Deposit, Listrik) */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] leading-relaxed text-emerald-950 space-y-1.5">
                      <p className="flex items-start gap-1.5 font-semibold">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>
                          <strong>Pembayaran Terlindungi:</strong> Transaksi diproses aman dan diteruskan ke pemilik setelah Anda konfirmasi Check-In.
                        </span>
                      </p>
                      {breakdown.depositAmount > 0 && (
                        <p className="flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                          <span>
                            <strong>Info Deposit Keamanan:</strong> Pemilik mensyaratkan deposit{" "}
                            <span className="font-bold">{formatRupiah(breakdown.depositAmount)}</span>{" "}
                            yang dibayar terpisah saat Check-In dan dikembalikan saat Check-Out jika tidak ada kerusakan.
                          </span>
                        </p>
                      )}
                      <p className="flex items-start gap-1.5 text-emerald-900">
                        <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                        <span>
                          <strong>Listrik:</strong>{" "}
                          {kost.electricityIncluded
                            ? "Sudah termasuk dalam harga sewa."
                            : "Belum termasuk harga sewa (dibayar terpisah sesuai pemakaian/token)."}
                        </span>
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan (opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Rencana tiba sore hari"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] leading-relaxed text-amber-950">
                  <p className="flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Jangan transfer di luar Keyloka.</strong> Segala pembayaran langsung ke rekening pribadi pemilik berada di luar tanggung jawab kami.
                    </span>
                  </p>
                </div>

                {feedback && (
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold space-y-2 ${
                      feedback.type === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <p>{feedback.text}</p>
                    {feedback.type === "error" &&
                      (feedback.text.toLowerCase().includes("menunggu pembayaran") ||
                        feedback.text.toLowerCase().includes("belum dibayar")) && (
                        <Link
                          href="/bookings"
                          onClick={() => setModalMode(null)}
                          className="inline-flex items-center justify-center rounded-lg bg-red-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-800 transition"
                        >
                          Buka Halaman Booking
                        </Link>
                      )}
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                {modalMode === "DIRECT" && (
                  <div className="mb-2.5 flex items-center justify-between text-xs sm:hidden">
                    <span className="font-semibold text-gray-500">
                      {breakdown.effectiveScheme === "DP" ? "Total Bayar DP" : "Total Bayar"}
                    </span>
                    <span className="text-sm font-black text-emerald-700">
                      {formatRupiah(breakdown.finalPayNow)}
                    </span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {submitting
                    ? "Memproses..."
                    : modalMode === "DIRECT"
                      ? "Lanjut Pembayaran"
                      : "Kirim ke Pemilik"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Opsi Pemilik: Ajukan Klaim / Hapus Properti */}
      {propertyActionOpen && (() => {
        const rawStaffWa = (kost.staffWhatsapp || kost.ownerPhone || "").replace(/\D/g, "");
        const staffWaDigits = rawStaffWa.startsWith("0")
          ? `62${rawStaffWa.slice(1)}`
          : rawStaffWa;
        const kostUrl = `${getSiteUrl()}/kost/${kost.id}`;
        const buildStaffWaHref = (message: string) => {
          const encoded = encodeURIComponent(message);
          return staffWaDigits
            ? `https://wa.me/${staffWaDigits}?text=${encoded}`
            : `https://wa.me/?text=${encoded}`;
        };
        const claimEmailText = currentUser?.email || "[isi email akun Keyloka Anda]";
        const claimWaHref = buildStaffWaHref(
          `Halo Staff Keyloka, saya pemilik properti "${kost.name}" (ID #${kost.id}) ingin mengajukan klaim properti.\nEmail Akun Pengaju: ${claimEmailText}\n\n${kostUrl}`,
        );
        const deleteWaHref = buildStaffWaHref(
          `Halo Staff Keyloka, saya pemilik properti "${kost.name}" (ID #${kost.id}) ingin mengajukan penghapusan listing properti ini.\n\n${kostUrl}`,
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">
                  Opsi Pemilik Properti
                </h3>
                <button
                  type="button"
                  onClick={() => setPropertyActionOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Properti <strong>{kost.name}</strong> saat ini diposting oleh Staff Keyloka.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setPropertyActionTab("CLAIM")}
                  className={`rounded-lg py-2 text-xs font-bold transition ${
                    propertyActionTab === "CLAIM"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Ajukan Klaim
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyActionTab("DELETE")}
                  className={`rounded-lg py-2 text-xs font-bold transition ${
                    propertyActionTab === "DELETE"
                      ? "bg-white text-red-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Ajukan Hapus Properti
                </button>
              </div>

              {propertyActionTab === "CLAIM" ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-gray-900">Panduan Ajukan Klaim Properti:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Pastikan Anda sudah memiliki &amp; login ke akun Keyloka tujuan.</li>
                      <li>
                        <strong>Via Form:</strong> Isi nomor WhatsApp aktif Anda lalu kirim pengajuan. Staff akan menghubungi Anda untuk verifikasi kepemilikan.
                      </li>
                      <li>
                        <strong>Via WhatsApp Staff:</strong> Hubungi WA Staff menggunakan <strong>nomor WhatsApp yang sama</strong> dengan nomor pada properti ini serta cantumkan email akun Keyloka Anda.
                      </li>
                      <li>Setelah disetujui, pengelolaan listing properti otomatis berpindah ke akun Anda.</li>
                    </ol>
                  </div>
                  {!currentUser ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">
                        Anda harus <strong>login terlebih dahulu</strong> untuk mengajukan klaim properti (baik melalui form maupun WhatsApp Staff).
                      </div>
                      <Link
                        href="/login"
                        className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-extrabold text-white hover:bg-emerald-700 transition"
                      >
                        Login untuk Mengajukan Klaim
                      </Link>
                    </div>
                  ) : (
                    <>
                      {claimSubmitted ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center text-xs font-bold text-amber-800">
                          Pengajuan klaim properti sedang diproses oleh Staff.
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitClaim} className="space-y-3.5">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Nomor WhatsApp Aktif
                            </label>
                            <input
                              type="tel"
                              required
                              value={claimPhone}
                              onChange={(e) => setClaimPhone(e.target.value)}
                              placeholder="08xxxxxxxxxx"
                              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Catatan Tambahan (Opsional)
                            </label>
                            <textarea
                              rows={2}
                              value={claimNotes}
                              onChange={(e) => setClaimNotes(e.target.value)}
                              placeholder="Contoh: Saya pemilik langsung kost ini"
                              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                            />
                          </div>
                          {claimFeedback && (
                            <div
                              className={`rounded-xl p-3 text-xs font-semibold ${
                                claimFeedback.type === "success"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {claimFeedback.text}
                            </div>
                          )}
                          <button
                            type="submit"
                            disabled={claiming}
                            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {claiming ? "Mengirim..." : "Kirim Pengajuan Klaim"}
                          </button>
                        </form>
                      )}

                      <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-gray-200" />
                        <span className="mx-2.5 shrink-0 text-[11px] font-semibold text-gray-400">
                          atau via WhatsApp
                        </span>
                        <div className="flex-grow border-t border-gray-200" />
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 leading-relaxed">
                        <strong>Metode WhatsApp Staff:</strong> Gunakan <strong>nomor WhatsApp yang sama</strong> dengan nomor yang tertera pada properti ini. Template pesan otomatis menyertakan email akun Anda (<strong>{claimEmailText}</strong>).
                      </div>
                      <a
                        href={claimWaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white py-2.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        <Phone className="h-4 w-4" />
                        Hubungi WA Staff untuk Klaim
                      </a>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3.5">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-gray-900">Panduan Ajukan Hapus Properti:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Klik tombol <strong>Hubungi WA Staff untuk Hapus Properti</strong> di bawah.</li>
                      <li>Kirim pesan dari <strong>nomor WhatsApp yang sama</strong> dengan nomor yang tertera pada properti ini.</li>
                      <li>Staff akan memverifikasi kecocokan nomor sebelum menghapus listing properti dari Keyloka.</li>
                    </ol>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">
                    <strong>Syarat Wajib:</strong> Permintaan hapus hanya diproses jika dikirim melalui <strong>nomor WhatsApp yang sama</strong> dengan nomor pada properti ini.
                  </div>
                  <a
                    href={deleteWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white hover:bg-red-700 transition"
                  >
                    <Phone className="h-4 w-4" />
                    Hubungi WA Staff untuk Hapus Properti
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal Laporkan Properti */}
      {reportPropertyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-black text-gray-900">
                  Laporkan Properti
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportPropertyOpen(false)}
                aria-label="Tutup modal laporan"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Bantu kami menjaga kualitas listing di Keyloka. Laporan Anda akan langsung masuk ke tim Staff untuk ditinjau.
            </p>

            {reportSubmitted ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 leading-relaxed">
                  Terima kasih! Laporan Anda untuk <strong>{kost.name}</strong> telah berhasil dikirim dan akan ditinjau oleh tim Staff Keyloka.
                </div>
                <button
                  type="button"
                  onClick={() => setReportPropertyOpen(false)}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitKostReport} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Alasan Pelaporan
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Informasi atau harga tidak sesuai">
                      Informasi atau harga tidak sesuai
                    </option>
                    <option value="Properti fiktif atau indikasi penipuan">
                      Properti fiktif atau indikasi penipuan
                    </option>
                    <option value="Properti sudah tutup / tidak beroperasi">
                      Properti sudah tutup / tidak beroperasi
                    </option>
                    <option value="Foto tidak pantas atau melanggar aturan">
                      Foto tidak pantas atau melanggar aturan
                    </option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Jelaskan detail masalah yang Anda temukan..."
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {recaptchaSiteKey && (
                  <div className="pt-1">
                    <div ref={recaptchaContainerRef} />
                  </div>
                )}

                {reportError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {reportError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  <Flag className="h-4 w-4" />
                  {submittingReport ? "Mengirim..." : "Kirim Laporan"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Fullscreen Image Viewer */}
      {lightboxOpen && photos[activePhoto] && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[activePhoto]}
            alt={kost.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
