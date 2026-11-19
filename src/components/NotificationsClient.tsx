"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarCheck,
  CheckCheck,
  RefreshCw,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import type { NotificationItem, NotificationPageResponse } from "@/lib/types";

interface NotificationsClientProps {
  initialData: NotificationPageResponse;
}

const FILTER_TABS = [
  { key: "SEMUA", label: "Semua" },
  { key: "SURVEI", label: "Survei" },
  { key: "BOOKING", label: "Booking" },
  { key: "ESCROW", label: "Escrow" },
  { key: "DISPUTE", label: "Sengketa" },
  { key: "PROPERTY", label: "Properti" },
  { key: "REVIEW", label: "Ulasan" },
  { key: "WALLET", label: "Dompet" },
];

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNotificationIcon(type: string) {
  switch ((type || "").toUpperCase()) {
    case "SURVEI":
    case "BOOKING":
      return {
        icon: CalendarCheck,
        cls: "bg-emerald-50 text-emerald-700",
      };
    case "ESCROW":
      return {
        icon: ShieldCheck,
        cls: "bg-blue-50 text-blue-700",
      };
    case "DISPUTE":
      return {
        icon: AlertTriangle,
        cls: "bg-red-50 text-red-700",
      };
    case "PROPERTY":
      return {
        icon: Building2,
        cls: "bg-teal-50 text-teal-700",
      };
    case "REVIEW":
      return {
        icon: Star,
        cls: "bg-amber-50 text-amber-700",
      };
    case "WALLET":
      return {
        icon: Wallet,
        cls: "bg-purple-50 text-purple-700",
      };
    default:
      return {
        icon: Bell,
        cls: "bg-gray-100 text-gray-700",
      };
  }
}

export function NotificationsClient({ initialData }: NotificationsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initialData.data || []);
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount || 0);
  const [hasMore, setHasMore] = useState(initialData.hasMore || false);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("SEMUA");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<number>("keyloka:notifications-unread-update", {
        detail: unreadCount,
      }),
    );
  }, [unreadCount]);

  async function fetchNotifications(
    targetPage: number,
    append: boolean,
    nextType = typeFilter,
    nextUnreadOnly = unreadOnly,
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (nextType !== "SEMUA") params.set("type", nextType);
      if (nextUnreadOnly) params.set("unreadOnly", "true");
      const res = await fetch(`/api/proxy/notifications?${params.toString()}`);
      if (!res.ok) return;
      const json: NotificationPageResponse = await res.json();
      setItems((prev) =>
        append ? [...prev, ...(json.data || [])] : json.data || [],
      );
      setUnreadCount(json.unreadCount ?? 0);
      setHasMore(Boolean(json.hasMore));
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenItem(item: NotificationItem) {
    if (!item.isRead) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/proxy/notifications/${item.id}/read`, {
        method: "PATCH",
      }).catch(() => {});
    }
    if (
      item.targetUrl &&
      item.targetUrl.startsWith("/") &&
      !item.targetUrl.startsWith("//")
    ) {
      router.push(item.targetUrl);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Notifikasi</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : "Semua notifikasi sudah dibaca"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchNotifications(1, false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTypeFilter(t.key);
              fetchNotifications(1, false, t.key, unreadOnly);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              typeFilter === t.key
                ? "bg-emerald-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            const next = !unreadOnly;
            setUnreadOnly(next);
            fetchNotifications(1, false, typeFilter, next);
          }}
          className={`ml-auto rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            unreadOnly
              ? "bg-amber-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Belum Dibaca Saja
        </button>
      </div>

      {/* Notification List */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-bold text-gray-800">
            {unreadOnly
              ? "Tidak ada notifikasi yang belum dibaca."
              : "Belum ada notifikasi."}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Pembaruan survei, booking, escrow, dan ulasan akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const meta = getNotificationIcon(item.type);
            const Icon = meta.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenItem(item)}
                className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                  item.isRead
                    ? "border-gray-200 bg-white hover:bg-gray-50/70"
                    : "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold text-gray-900">
                      {item.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] font-medium text-gray-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                      {!item.isRead && (
                        <span
                          aria-label="Belum dibaca"
                          className="h-2.5 w-2.5 rounded-full bg-emerald-600"
                        />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    {item.body}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchNotifications(page + 1, true)}
            className="rounded-xl border border-emerald-600 bg-white px-6 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Muat Lebih Banyak"}
          </button>
        </div>
      )}
    </div>
  );
}
