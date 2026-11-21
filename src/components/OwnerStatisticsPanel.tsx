"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  Eye,
  Heart,
  MessageCircle,
  Phone,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react";
import { formatCategoryLabel, formatRupiah, type Kost } from "@/lib/types";
import {
  DonutChart,
  HorizontalBarChart,
  TrendAreaChart,
} from "./OwnerCharts";

interface OwnerStatisticsResponse {
  period: string;
  kostId: number | null;
  summary: {
    totalProperties: number;
    totalRoomsAvailable: number;
    totalViews: number;
    totalWaClicks: number;
    totalFavorites: number;
    totalChats: number;
    totalSurveys: number;
    totalDirectBookings: number;
    paidBookingsCount: number;
    totalGrossRevenue: number;
    totalNetRevenue: number;
    avgRating: number;
    totalReviews: number;
    surveyApprovalRate: number;
  };
  dailyEngagement: Array<{
    date: string;
    label: string;
    views: number;
    waClicks: number;
  }>;
  monthlyTrend: Array<{
    key: string;
    label: string;
    surveys: number;
    directBookings: number;
    grossRevenue: number;
    netRevenue: number;
  }>;
  statusBreakdown: {
    activeOrDone: number;
    paidHeld: number;
    pending: number;
    cancelledOrRejected: number;
    fullScheme: number;
    dpScheme: number;
  };
  reviewBreakdown: {
    count: number;
    avgOverall: number;
    avgCleanliness: number;
    avgSecurity: number;
    avgAccuracy: number;
  };
  propertyPerformance: Array<{
    kostId: number;
    name: string;
    city: string;
    propertyCategory: string;
    availableRooms: number;
    rating: number;
    reviewCount: number;
    views: number;
    waClicks: number;
    favorites: number;
    surveys: number;
    bookings: number;
    netRevenue: number;
    isBoosted: boolean;
  }>;
}

interface OwnerStatisticsPanelProps {
  kosts: Kost[];
}

export function OwnerStatisticsPanel({ kosts }: OwnerStatisticsPanelProps) {
  const [period, setPeriod] = useState<"30D" | "6M" | "12M" | "ALL">("6M");
  const [selectedKostId, setSelectedKostId] = useState<string>("ALL");
  const [barMetric, setBarMetric] = useState<"REVENUE" | "VIEWS" | "FAVORITES">(
    "REVENUE",
  );
  const [data, setData] = useState<OwnerStatisticsResponse | null>(null);
  const [totalAllProperties, setTotalAllProperties] = useState<number>(
    kosts.length,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats(nextPeriod = period, nextKost = selectedKostId) {
    const params = new URLSearchParams({ period: nextPeriod });
    if (nextKost !== "ALL") params.set("kostId", nextKost);
    const res = await fetch(
      `/api/proxy/kosts/owner/statistics?${params.toString()}`,
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || "Gagal memuat statistik properti.");
    }
    return (await res.json()) as OwnerStatisticsResponse;
  }

  useEffect(() => {
    let active = true;
    async function initLoad() {
      try {
        const params = new URLSearchParams({ period: "6M" });
        const res = await fetch(
          `/api/proxy/kosts/owner/statistics?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error("Gagal memuat statistik properti.");
        }
        const json = (await res.json()) as OwnerStatisticsResponse;
        if (active) {
          setData(json);
          setTotalAllProperties(json.summary.totalProperties);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat statistik properti.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void initLoad();
    return () => {
      active = false;
    };
  }, []);

  async function handleFilterChange(
    nextPeriod: "30D" | "6M" | "12M" | "ALL",
    nextKost: string,
  ) {
    setPeriod(nextPeriod);
    setSelectedKostId(nextKost);
    setLoading(true);
    setError(null);
    try {
      const nextData = await fetchStats(nextPeriod, nextKost);
      setData(nextData);
      if (nextKost === "ALL") {
        setTotalAllProperties(nextData.summary.totalProperties);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat statistik properti.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        Menghitung statistik &amp; grafik properti Anda...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <p className="text-sm font-bold text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void handleFilterChange(period, selectedKostId)}
          className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    dailyEngagement,
    monthlyTrend,
    statusBreakdown,
    reviewBreakdown,
    propertyPerformance,
  } = data;

  const totalBookingStatus =
    statusBreakdown.activeOrDone +
    statusBreakdown.paidHeld +
    statusBreakdown.pending +
    statusBreakdown.cancelledOrRejected;

  const barItems = propertyPerformance.slice(0, 8).map((p) => {
    if (barMetric === "VIEWS") {
      return {
        label: p.name,
        sublabel: `${p.waClicks} klik WA`,
        value: p.views,
        displayValue: `${p.views.toLocaleString("id-ID")} views`,
        colorClass: "bg-sky-600",
      };
    }
    if (barMetric === "FAVORITES") {
      return {
        label: p.name,
        sublabel: `${p.surveys + p.bookings} survei/booking`,
        value: p.favorites,
        displayValue: `${p.favorites} favorit`,
        colorClass: "bg-rose-500",
      };
    }
    return {
      label: p.name,
      sublabel: `${p.bookings} booking`,
      value: p.netRevenue,
      displayValue: formatRupiah(p.netRevenue),
      colorClass: "bg-emerald-600",
    };
  });

  const reviewDimensions = [
    { label: "Kebersihan", score: reviewBreakdown.avgCleanliness },
    { label: "Keamanan", score: reviewBreakdown.avgSecurity },
    { label: "Akurasi Foto & Info", score: reviewBreakdown.avgAccuracy },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Statistik &amp; Performa Properti
          </h2>
          <p className="text-xs text-gray-500">
            Pantau kunjungan halaman, klik WhatsApp, minat penyewa, dan tren pendapatan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedKostId}
            onChange={(e) => void handleFilterChange(period, e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="ALL">
              Semua Properti ({totalAllProperties})
            </option>
            {kosts.map((k) => (
              <option key={k.id} value={String(k.id)}>
                {k.name}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) =>
              void handleFilterChange(
                e.target.value as "30D" | "6M" | "12M" | "ALL",
                selectedKostId,
              )
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="30D">30 Hari Terakhir</option>
            <option value="6M">6 Bulan Terakhir</option>
            <option value="12M">12 Bulan Terakhir</option>
            <option value="ALL">Semua Waktu</option>
          </select>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleFilterChange(period, selectedKostId)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Total Kunjungan (Views)</span>
            <Eye className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {summary.totalViews.toLocaleString("id-ID")}
          </p>
          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Phone className="h-3 w-3" />
            {summary.totalWaClicks.toLocaleString("id-ID")} klik WhatsApp
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Peminat Properti</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {summary.totalFavorites.toLocaleString("id-ID")} Favorit
          </p>
          <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <MessageCircle className="h-3 w-3 text-emerald-600" />
            {summary.totalChats} calon penyewa chat
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Survei &amp; Booking</span>
            <CalendarCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {summary.paidBookingsCount} Booking
          </p>
          <p className="text-[11px] font-semibold text-gray-500">
            {summary.totalSurveys} survei ({summary.surveyApprovalRate}% disetujui)
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Pendapatan &amp; Rating</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {formatRupiah(summary.totalNetRevenue)}
          </p>
          <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—"} ({summary.totalReviews} ulasan)
          </p>
        </div>
      </div>

      {/* Charts Row 1: Daily Views + Monthly Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <div>
            <h3 className="text-sm font-black text-gray-900">
              Tren Kunjungan &amp; Klik WhatsApp (30 Hari Terakhir)
            </h3>
            <p className="text-xs text-gray-500">
              Arahkan kursor atau sentuh grafik untuk melihat detail harian.
            </p>
          </div>
          <TrendAreaChart
            points={dailyEngagement.map((d) => ({
              label: d.label,
              primary: d.views,
              secondary: d.waClicks,
            }))}
            primaryLabel="Kunjungan"
            secondaryLabel="Klik WA"
            primaryColor="#0284c7"
            secondaryColor="#059669"
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <div>
            <h3 className="text-sm font-black text-gray-900">
              Tren Pendapatan Bersih &amp; Transaksi Bulanan
            </h3>
            <p className="text-xs text-gray-500">
              Total pendapatan bersih (garis solid) vs booking dibayar (garis putus).
            </p>
          </div>
          <TrendAreaChart
            points={monthlyTrend.map((m) => ({
              label: m.label,
              primary: m.netRevenue,
              secondary: m.directBookings,
            }))}
            primaryLabel="Pendapatan Bersih"
            secondaryLabel="Booking Dibayar"
            primaryColor="#059669"
            secondaryColor="#d97706"
            formatPrimary={(v) => formatRupiah(v)}
            formatSecondary={(v) => `${v}x`}
          />
        </section>
      </div>

      {/* Charts Row 2: Booking Status Donut + Review Quality + Top Properties Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900">
              Distribusi Status Pengajuan
            </h3>
            <p className="text-xs text-gray-500">
              Gabungan survei dan booking langsung pada periode terpilih.
            </p>
          </div>
          <DonutChart
            centerValue={String(totalBookingStatus)}
            centerLabel="Total Pengajuan"
            slices={[
              {
                label: "Aktif / Selesai",
                value: statusBreakdown.activeOrDone,
                color: "#059669",
              },
              {
                label: "Dibayar (Escrow)",
                value: statusBreakdown.paidHeld,
                color: "#0284c7",
              },
              {
                label: "Dalam Proses",
                value: statusBreakdown.pending,
                color: "#d97706",
              },
              {
                label: "Dibatalkan / Ditolak",
                value: statusBreakdown.cancelledOrRejected,
                color: "#ef4444",
              },
            ]}
          />
          <div className="rounded-xl bg-gray-50 p-3 text-xs flex items-center justify-between text-gray-600">
            <span>Skema Bayar Langsung:</span>
            <span className="font-bold text-gray-900">
              Full {statusBreakdown.fullScheme} • DP 30% {statusBreakdown.dpScheme}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900">
              Skor Kualitas Ulasan ({reviewBreakdown.count} Ulasan)
            </h3>
            <p className="text-xs text-gray-500">
              Penilaian rata-rata penyewa dari skala 1.0 – 5.0.
            </p>
          </div>
          {reviewBreakdown.count === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-xs text-gray-400">
              Belum ada ulasan pada properti terpilih.
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {reviewDimensions.map((dim) => {
                const pct = Math.min(100, Math.round((dim.score / 5) * 100));
                return (
                  <div key={dim.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700">{dim.label}</span>
                      <span className="text-amber-700">
                        {dim.score.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center justify-between">
                <span className="font-semibold">Rata-rata Keseluruhan</span>
                <span className="font-black text-emerald-700">
                  {reviewBreakdown.avgOverall.toFixed(2)} ★
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Peringkat Properti
              </h3>
              <p className="text-xs text-gray-500">
                Perbandingan performa unit Anda.
              </p>
            </div>
            <select
              value={barMetric}
              onChange={(e) =>
                setBarMetric(
                  e.target.value as "REVENUE" | "VIEWS" | "FAVORITES",
                )
              }
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-700"
            >
              <option value="REVENUE">Pendapatan</option>
              <option value="VIEWS">Kunjungan</option>
              <option value="FAVORITES">Favorit</option>
            </select>
          </div>
          <HorizontalBarChart items={barItems} />
        </section>
      </div>

      {/* Detailed Property Performance Table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <div>
          <h3 className="text-base font-black text-gray-900">
            Rincian Statistik per Properti
          </h3>
          <p className="text-xs text-gray-500">
            Data agregasi langsung dari kunjungan, klik WhatsApp, favorit, survei, dan booking.
          </p>
        </div>

        {propertyPerformance.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-xs text-gray-500">
            Anda belum memiliki properti terdaftar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2.5 pr-3">Properti</th>
                  <th className="py-2.5 px-2 text-right">Views</th>
                  <th className="py-2.5 px-2 text-right">Klik WA</th>
                  <th className="py-2.5 px-2 text-right">Favorit</th>
                  <th className="py-2.5 px-2 text-right">Survei</th>
                  <th className="py-2.5 px-2 text-right">Booking</th>
                  <th className="py-2.5 px-2 text-right">Kamar Sisa</th>
                  <th className="py-2.5 px-2 text-right">Rating</th>
                  <th className="py-2.5 pl-2 text-right">Pendapatan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propertyPerformance.map((p) => (
                  <tr key={p.kostId} className="hover:bg-gray-50/70">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/kost/${p.kostId}`}
                        className="font-bold text-gray-900 hover:text-emerald-700"
                      >
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-gray-500">
                        {formatCategoryLabel(p.propertyCategory)} • {p.city}
                        {p.isBoosted && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Boost Aktif
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-sky-700">
                      {p.views.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-700">
                      {p.waClicks.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-gray-700">
                      {p.favorites}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-gray-700">
                      {p.surveys}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-gray-700">
                      {p.bookings}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-gray-700">
                      {p.availableRooms}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-amber-700">
                      {p.rating > 0 ? `${p.rating.toFixed(1)}★` : "—"}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-black text-emerald-700">
                      {formatRupiah(p.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
