"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  Heart,
  MapPin,
  Maximize2,
  MessageCircle,
  Reply,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import {
  formatRupiah,
  getDisplayPrice,
  resolveImageUrl,
  type Kost,
  type ReviewItem,
  type UserProfile,
} from "@/lib/types";

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
    };
  }
}

interface KostDetailClientProps {
  kost: Kost;
  reviews: ReviewItem[];
  currentUser: UserProfile | null;
}

export function KostDetailClient({
  kost,
  reviews: initialReviews,
  currentUser,
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

  const [tenantName, setTenantName] = useState(currentUser?.name || "");
  const [tenantPhone, setTenantPhone] = useState(currentUser?.phone || "");
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [durationCount, setDurationCount] = useState(1);
  const [usePoints, setUsePoints] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const price = getDisplayPrice(kost);
  const cat = (kost.propertyCategory || "").toUpperCase();
  const isDaily = cat === "HUNIAN_HARIAN";
  const isYearly = cat === "KONTRAKAN" && (kost.pricePerYear ?? 0) > 0;
  const photos = (kost.images || []).map(resolveImageUrl).filter(Boolean);
  const maxDuration = isDaily ? 30 : isYearly ? 5 : 12;

  const baseTotal = price.amount * durationCount;
  const basePlatformFee = Math.round(baseTotal * 0.05);
  const maxPointDiscount = Math.floor(basePlatformFee * 0.5);
  const userPoints = currentUser?.pointsBalance ?? 0;
  const maxUsablePoints = Math.min(userPoints, Math.floor(maxPointDiscount / 50));
  const appliedDiscount = usePoints ? maxUsablePoints * 50 : 0;
  const finalTotal = Math.max(1000, baseTotal - appliedDiscount);

  function openModal(mode: "SURVEI" | "DIRECT") {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setFeedback(null);
    setModalMode(mode);
  }

  async function handleSubmitSurvey(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/proxy/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId: kost.id,
          tenantName,
          tenantPhone,
          startDate,
          bookingType: "SURVEI",
          surveyDateTime: startDate,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengirim pengajuan survei.");
      }
      setFeedback({
        type: "success",
        text: "Jadwal survei berhasil dikirim! Cek menu Booking & Poin.",
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

  async function syncDirectPayment(bookingId: number) {
    await fetch(`/api/proxy/bookings/${bookingId}/sync-payment`, {
      method: "POST",
    });
    router.push("/bookings");
    router.refresh();
  }

  async function handleSubmitDirect(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/proxy/bookings/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId: kost.id,
          tenantName,
          tenantPhone,
          startDate,
          durationCount,
          notes,
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
          onSuccess: () => syncDirectPayment(booking.id),
          onPending: () => syncDirectPayment(booking.id),
          onClose: () => syncDirectPayment(booking.id),
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
          text: "Halaman pembayaran Midtrans dibuka di tab baru. Setelah bayar, cek status di Booking & Poin.",
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {kost.propertyCategory} • {kost.type}
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
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
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
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
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
                    }
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3"
              >
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
              {currentUser?.id === kost.ownerId ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-center text-xs font-bold text-gray-600">
                  Ini adalah properti milik Anda.
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
                      Ajukan Survei Lokasi
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
                  Ajukan Survei Lokasi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Booking / Survei */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                {modalMode === "DIRECT"
                  ? "Booking Langsung (Escrow)"
                  : "Ajukan Jadwal Survei"}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                modalMode === "DIRECT" ? handleSubmitDirect : handleSubmitSurvey
              }
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {modalMode === "DIRECT"
                    ? "Tanggal Mulai Masuk"
                    : "Tanggal Rencana Survei"}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>

              {modalMode === "DIRECT" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Durasi ({isDaily ? "Hari" : "Bulan"})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxDuration}
                      value={durationCount}
                      onChange={(e) =>
                        setDurationCount(
                          Math.max(
                            1,
                            Math.min(maxDuration, Number(e.target.value) || 1),
                          ),
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  {maxUsablePoints > 0 && (
                    <label className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs cursor-pointer">
                      <span className="flex items-center gap-2 font-bold text-amber-900">
                        <Sparkles className="h-4 w-4 text-amber-600" />
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

                  <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Sewa</span>
                      <span>{formatRupiah(baseTotal)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Potongan Poin</span>
                        <span>-{formatRupiah(appliedDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 text-sm font-black text-gray-900">
                      <span>Total Bayar</span>
                      <span className="text-emerald-700">
                        {formatRupiah(finalTotal)}
                      </span>
                    </div>
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
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                />
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                    feedback.type === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {submitting
                  ? "Memproses..."
                  : modalMode === "DIRECT"
                    ? "Lanjut Pembayaran Midtrans"
                    : "Kirim Jadwal Survei"}
              </button>
            </form>
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
