"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Disc,
  HardDrive,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
} from "lucide-react";
import { formatNotificationTimestamp, formatRupiah } from "@/lib/types";
import { DonutChart } from "@/components/OwnerCharts";

interface PlatformConfig {
  id: number;
  freePropertyQuota: number;
  extraPropertySlotFee: number;
  bookingPlatformFeePercent: number;
  minWithdrawAmount: number;
  boost3dPrice: number;
  boost7dPrice: number;
  boost14dPrice: number;
  allowOwnerRegistration: boolean;
  allowDirectBookingGlobal: boolean;
  allowWalletTopup: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  opsNotificationEmail: string;
  maxPendingPropertiesPerOwner?: number;
  chatRateLimitPerMin?: number;
  maxActiveSurveysPerUser?: number;
  maxDailySurveysPerUser?: number;
  maxUnpaidBookingsPerUser?: number;
  maxHourlyDirectBookingsPerUser?: number;
  maxPendingTopupsPerOwner?: number;
  postRateLimitPerMin?: number;
  commentRateLimitPerMin?: number;
  updatedAt?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  db: { connected: boolean; latencyMs: number };
  integrations: {
    mailProvider: string;
    firebaseConfigured: boolean;
    midtransProduction: boolean;
  };
  processMemoryMb: { rss: number; heapUsed: number; heapTotal: number };
  hostMetrics: {
    cpuCores: number;
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m?: number;
    cpuUsagePercent?: number;
    usedMemMb: number;
    freeMemMb: number;
    totalMemMb: number;
  };
  diskMetrics?: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
  };
  logsSummary: {
    errorsLast24h: number;
    warningsLast24h: number;
    retentionDays: number;
  };
}

interface PlatformEventLogItem {
  id: number;
  level: string;
  category: string;
  actorUserId: number | null;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

function formatUptime(sec: number): string {
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}h ${hours}j ${mins}m`;
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${mins}m`;
}

export function AdminPlatformPanel() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<PlatformEventLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [levelFilter, setLevelFilter] = useState("SEMUA");
  const [catFilter, setCatFilter] = useState("SEMUA");
  const [logSearch, setLogSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function readSnapshot() {
    const [cfgRes, healthRes, logsRes] = await Promise.all([
      fetch("/api/proxy/admin/platform/config"),
      fetch("/api/proxy/admin/platform/system-health"),
      fetch("/api/proxy/admin/platform/logs?limit=50"),
    ]);
    const nextConfig = cfgRes.ok ? ((await cfgRes.json()) as PlatformConfig) : null;
    const nextHealth = healthRes.ok ? ((await healthRes.json()) as SystemHealth) : null;
    const rawLogs = logsRes.ok ? await logsRes.json() : null;
    const nextLogs = Array.isArray(rawLogs) ? (rawLogs as PlatformEventLogItem[]) : null;
    return { nextConfig, nextHealth, nextLogs };
  }

  async function loadAll() {
    setLoading(true);
    try {
      const { nextConfig, nextHealth, nextLogs } = await readSnapshot();
      if (nextConfig) setConfig(nextConfig);
      if (nextHealth) setHealth(nextHealth);
      if (nextLogs) setLogs(nextLogs);
    } catch {
      setFeedback({ type: "err", text: "Gagal memuat data platform." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function initLoad() {
      try {
        const { nextConfig, nextHealth, nextLogs } = await readSnapshot();
        if (!active) return;
        if (nextConfig) setConfig(nextConfig);
        if (nextHealth) setHealth(nextHealth);
        if (nextLogs) setLogs(nextLogs);
      } catch {
        if (active) {
          setFeedback({ type: "err", text: "Gagal memuat data platform." });
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

  async function refreshLogs(
    nextLevel = levelFilter,
    nextCat = catFilter,
    nextQ = logSearch,
  ) {
    const params = new URLSearchParams({ limit: "50" });
    if (nextLevel !== "SEMUA") params.set("level", nextLevel);
    if (nextCat !== "SEMUA") params.set("category", nextCat);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const res = await fetch(`/api/proxy/admin/platform/logs?${params.toString()}`);
    if (res.ok) {
      const list = await res.json();
      setLogs(Array.isArray(list) ? list : []);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/proxy/admin/platform/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freePropertyQuota: Number(config.freePropertyQuota),
          extraPropertySlotFee: Number(config.extraPropertySlotFee),
          bookingPlatformFeePercent: Number(config.bookingPlatformFeePercent),
          minWithdrawAmount: Number(config.minWithdrawAmount),
          boost3dPrice: Number(config.boost3dPrice),
          boost7dPrice: Number(config.boost7dPrice),
          boost14dPrice: Number(config.boost14dPrice),
          allowOwnerRegistration: config.allowOwnerRegistration,
          allowDirectBookingGlobal: config.allowDirectBookingGlobal,
          allowWalletTopup: config.allowWalletTopup,
          maintenanceMode: config.maintenanceMode,
          maintenanceMessage: config.maintenanceMessage,
          opsNotificationEmail: config.opsNotificationEmail,
          maxPendingPropertiesPerOwner: Number(
            config.maxPendingPropertiesPerOwner ?? 10,
          ),
          chatRateLimitPerMin: Number(config.chatRateLimitPerMin ?? 12),
          maxActiveSurveysPerUser: Number(config.maxActiveSurveysPerUser ?? 5),
          maxDailySurveysPerUser: Number(config.maxDailySurveysPerUser ?? 8),
          maxUnpaidBookingsPerUser: Number(
            config.maxUnpaidBookingsPerUser ?? 2,
          ),
          maxHourlyDirectBookingsPerUser: Number(
            config.maxHourlyDirectBookingsPerUser ?? 5,
          ),
          maxPendingTopupsPerOwner: Number(
            config.maxPendingTopupsPerOwner ?? 3,
          ),
          postRateLimitPerMin: Number(config.postRateLimitPerMin ?? 5),
          commentRateLimitPerMin: Number(config.commentRateLimitPerMin ?? 6),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal menyimpan konfigurasi.");
      }
      setConfig(data);
      setFeedback({
        type: "ok",
        text: "Konfigurasi platform berhasil disimpan dan langsung aktif.",
      });
      await refreshLogs();
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !config && !health) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Memuat konfigurasi platform &amp; status sistem...
      </div>
    );
  }

  const memPct =
    health && health.hostMetrics.totalMemMb > 0
      ? Math.round(
          (health.hostMetrics.usedMemMb / health.hostMetrics.totalMemMb) * 100,
        )
      : 0;

  const cpuPct = health
    ? health.hostMetrics.cpuUsagePercent ??
      Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (health.hostMetrics.loadAvg1m /
              Math.max(1, health.hostMetrics.cpuCores)) *
              100,
          ),
        ),
      )
    : 0;

  const apiMemMb = health ? Math.min(health.processMemoryMb.rss, health.hostMetrics.usedMemMb) : 0;
  const otherMemMb = health ? Math.max(0, health.hostMetrics.usedMemMb - apiMemMb) : 0;
  const freeMemMb = health ? Math.max(0, health.hostMetrics.freeMemMb) : 0;

  const diskTotalGb = health?.diskMetrics?.totalGb ?? 0;
  const diskUsedGb = health?.diskMetrics?.usedGb ?? 0;
  const diskFreeGb = health?.diskMetrics?.freeGb ?? 0;
  const diskPct =
    health?.diskMetrics?.usagePercent ??
    (diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0);

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* System Health & VPS Metrics */}
      {health && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
                <Server className="h-4 w-4 text-emerald-600" />
                Kesehatan Sistem &amp; Resource VPS
              </h2>
              <p className="text-xs text-gray-500">
                Snapshot ringan dari proses API &amp; host (tanpa polling otomatis).
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                Database PostgreSQL
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-gray-900">
                {health.db.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                {health.db.connected ? `Terhubung (${health.db.latencyMs} ms)` : "Terputus"}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Uptime API: {formatUptime(health.uptimeSeconds)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Cpu className="h-3.5 w-3.5 text-blue-600" />
                CPU &amp; Load Average
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                Load {health.hostMetrics.loadAvg1m} / {health.hostMetrics.cpuCores} core ({cpuPct}%)
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                5m: {health.hostMetrics.loadAvg5m}
                {health.hostMetrics.loadAvg15m !== undefined
                  ? ` • 15m: ${health.hostMetrics.loadAvg15m}`
                  : ""}{" "}
                • {health.nodeVersion}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <HardDrive className="h-3.5 w-3.5 text-amber-600" />
                Memori Host &amp; API
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {health.hostMetrics.usedMemMb} / {health.hostMetrics.totalMemMb} MB ({memPct}%)
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Node RSS: {health.processMemoryMb.rss} MB (Heap {health.processMemoryMb.heapUsed} MB)
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Disc className="h-3.5 w-3.5 text-violet-600" />
                Penyimpanan Disk (VPS)
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {diskUsedGb} / {diskTotalGb} GB ({diskPct}%)
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Tersedia: {diskFreeGb} GB bebas
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
                Integrasi &amp; Event 24 Jam
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {health.logsSummary.errorsLast24h} Error • {health.logsSummary.warningsLast24h} Warn
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Mail: {health.integrations.mailProvider.toUpperCase()} •{" "}
                {health.integrations.midtransProduction ? "Midtrans Prod" : "Midtrans Sandbox"}
              </p>
            </div>
          </div>

          {/* Resource Usage Pie/Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
                  <Cpu className="h-3.5 w-3.5 text-blue-600" />
                  Distribusi Beban CPU
                </p>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {health.hostMetrics.cpuCores} Core
                </span>
              </div>
              <DonutChart
                size={128}
                strokeWidth={18}
                centerValue={`${cpuPct}%`}
                centerLabel="Beban CPU"
                slices={[
                  {
                    label: "Beban Aktif (1m)",
                    value: cpuPct,
                    displayValue: `Load ${health.hostMetrics.loadAvg1m}`,
                    color: cpuPct >= 85 ? "#dc2626" : cpuPct >= 65 ? "#d97706" : "#2563eb",
                  },
                  {
                    label: "Kapasitas Tersedia",
                    value: Math.max(0, 100 - cpuPct),
                    displayValue: `${Math.max(0, 100 - cpuPct)}% Idle`,
                    color: "#e2e8f0",
                  },
                ]}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
                  <HardDrive className="h-3.5 w-3.5 text-amber-600" />
                  Proporsi Memori Host &amp; API
                </p>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Total {health.hostMetrics.totalMemMb} MB
                </span>
              </div>
              <DonutChart
                size={128}
                strokeWidth={18}
                centerValue={`${memPct}%`}
                centerLabel="RAM Terpakai"
                slices={[
                  {
                    label: "Node API (RSS)",
                    value: apiMemMb,
                    displayValue: `${apiMemMb} MB`,
                    color: "#059669",
                  },
                  {
                    label: "OS & Proses Lain",
                    value: otherMemMb,
                    displayValue: `${otherMemMb} MB`,
                    color: "#d97706",
                  },
                  {
                    label: "Memori Bebas",
                    value: freeMemMb,
                    displayValue: `${freeMemMb} MB`,
                    color: "#e2e8f0",
                  },
                ]}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
                  <Disc className="h-3.5 w-3.5 text-violet-600" />
                  Penggunaan Disk (Storage)
                </p>
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  Total {diskTotalGb} GB
                </span>
              </div>
              <DonutChart
                size={128}
                strokeWidth={18}
                centerValue={`${diskPct}%`}
                centerLabel="Disk Terpakai"
                slices={[
                  {
                    label: "Disk Terpakai",
                    value: diskUsedGb,
                    displayValue: `${diskUsedGb} GB`,
                    color: diskPct >= 85 ? "#dc2626" : diskPct >= 70 ? "#d97706" : "#7c3aed",
                  },
                  {
                    label: "Ruang Tersedia",
                    value: Math.max(0.1, diskFreeGb),
                    displayValue: `${diskFreeGb} GB`,
                    color: "#e2e8f0",
                  },
                ]}
              />
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Platform Configuration */}
      {config && (
        <form
          onSubmit={handleSaveConfig}
          className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
                <Settings className="h-4 w-4 text-emerald-600" />
                Konfigurasi Bisnis Platform
              </h2>
              <p className="text-xs text-gray-500">
                Perubahan langsung di-cache di memori (TTL 30 detik) tanpa menurunkan performa DB.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kuota Properti Gratis
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.freePropertyQuota}
                onChange={(e) =>
                  setConfig({ ...config, freePropertyQuota: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Biaya Slot Tambahan ({formatRupiah(config.extraPropertySlotFee)})
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={config.extraPropertySlotFee}
                onChange={(e) =>
                  setConfig({ ...config, extraPropertySlotFee: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Fee Platform Booking (%)
              </label>
              <input
                type="number"
                min={0}
                max={25}
                value={config.bookingPlatformFeePercent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bookingPlatformFeePercent: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Minimal Withdraw ({formatRupiah(config.minWithdrawAmount)})
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={config.minWithdrawAmount}
                onChange={(e) =>
                  setConfig({ ...config, minWithdrawAmount: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Harga Boost 3 Hari
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={config.boost3dPrice}
                onChange={(e) =>
                  setConfig({ ...config, boost3dPrice: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Harga Boost 7 Hari
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={config.boost7dPrice}
                onChange={(e) =>
                  setConfig({ ...config, boost7dPrice: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Harga Boost 14 Hari
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={config.boost14dPrice}
                onChange={(e) =>
                  setConfig({ ...config, boost14dPrice: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Notifikasi Operasional
              </label>
              <input
                type="email"
                value={config.opsNotificationEmail}
                onChange={(e) =>
                  setConfig({ ...config, opsNotificationEmail: e.target.value })
                }
                placeholder="ops@keyloka.com"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                Pengaturan Batas Anti-Spam &amp; Kuota Aktivitas
              </h3>
              <p className="text-[11px] text-gray-500">
                Atur batas pengajuan properti pending, pengiriman pesan chat, survei, transaksi Midtrans, dan komentar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Properti Pending / Pemilik
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.maxPendingPropertiesPerOwner ?? 10}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxPendingPropertiesPerOwner: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Limit Kirim Chat / Menit
                </label>
                <input
                  type="number"
                  min={3}
                  max={120}
                  value={config.chatRateLimitPerMin ?? 12}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      chatRateLimitPerMin: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Survei Aktif / Penyewa
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.maxActiveSurveysPerUser ?? 5}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxActiveSurveysPerUser: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Survei Harian (24 Jam) / Penyewa
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.maxDailySurveysPerUser ?? 8}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxDailySurveysPerUser: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Invoice Booking Unpaid / Penyewa
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxUnpaidBookingsPerUser ?? 2}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxUnpaidBookingsPerUser: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Buat Booking Langsung / Jam
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.maxHourlyDirectBookingsPerUser ?? 5}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxHourlyDirectBookingsPerUser: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maks Tagihan Top-Up Pending / Pemilik
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxPendingTopupsPerOwner ?? 3}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxPendingTopupsPerOwner: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Limit Buat Postingan / Menit
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.postRateLimitPerMin ?? 5}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      postRateLimitPerMin: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Limit Kirim Komentar / Menit
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.commentRateLimitPerMin ?? 6}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      commentRateLimitPerMin: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-xs font-bold text-gray-800 cursor-pointer">
              <span>Izinkan Booking Langsung Global</span>
              <input
                type="checkbox"
                checked={config.allowDirectBookingGlobal}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    allowDirectBookingGlobal: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-xs font-bold text-gray-800 cursor-pointer">
              <span>Izinkan Top-Up Kredit Iklan</span>
              <input
                type="checkbox"
                checked={config.allowWalletTopup !== false}
                onChange={(e) =>
                  setConfig({ ...config, allowWalletTopup: e.target.checked })
                }
                className="h-4 w-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-xs font-bold text-gray-800 cursor-pointer">
              <span>Izinkan Pendaftaran Pemilik</span>
              <input
                type="checkbox"
                checked={config.allowOwnerRegistration}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    allowOwnerRegistration: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs font-bold text-amber-900 cursor-pointer">
              <span>Mode Maintenance</span>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) =>
                  setConfig({ ...config, maintenanceMode: e.target.checked })
                }
                className="h-4 w-4 accent-amber-600"
              />
            </label>
          </div>
          {config.maintenanceMode && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Pesan Maintenance (Ditampilkan di Banner Publik)
              </label>
              <input
                type="text"
                value={config.maintenanceMessage ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, maintenanceMessage: e.target.value })
                }
                placeholder="Contoh: Sistem sedang dalam pemeliharaan berkala. Beberapa fitur mungkin melambat."
                className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          )}
        </form>
      )}

      {/* Critical Audit & Error Event Logs */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-gray-900">
              Audit &amp; Critical Event Log (Retensi {health?.logsSummary.retentionDays ?? 14} Hari)
            </h2>
            <p className="text-xs text-gray-500">
              Menampilkan event penting &amp; error kritis (perubahan config/role, error email, payout) tanpa membebani DB.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void refreshLogs(levelFilter, catFilter, logSearch);
                }
              }}
              placeholder="Cari pesan event..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              void refreshLogs(e.target.value, catFilter, logSearch);
            }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="SEMUA">Semua Level</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
          </select>
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              void refreshLogs(levelFilter, e.target.value, logSearch);
            }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="SEMUA">Semua Kategori</option>
            <option value="CONFIG">CONFIG</option>
            <option value="BOOKING">BOOKING</option>
            <option value="WALLET">WALLET</option>
            <option value="MAIL">MAIL</option>
            <option value="AUTH">AUTH</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
          <button
            type="button"
            onClick={() => void refreshLogs(levelFilter, catFilter, logSearch)}
            className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
          >
            Filter
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-xs text-gray-500">
            Belum ada event log yang sesuai filter.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
            {logs.map((item) => {
              const ts = formatNotificationTimestamp(item.createdAt);
              const badgeCls =
                item.level === "ERROR"
                  ? "bg-red-100 text-red-700"
                  : item.level === "WARN"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800";
              return (
                <div key={item.id} className="p-3.5 text-xs space-y-1 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${badgeCls}`}>
                        {item.level}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                        {item.category}
                      </span>
                      {item.actorUserId && (
                        <span className="text-[10px] font-semibold text-gray-500">
                          Actor #{item.actorUserId}
                        </span>
                      )}
                    </div>
                    <span suppressHydrationWarning className="text-[11px] text-gray-400">
                      {ts.relative} • {ts.exact}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800">{item.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
