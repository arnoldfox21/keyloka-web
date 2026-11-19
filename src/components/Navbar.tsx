"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  Bell,
  CalendarCheck,
  Compass,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import {
  formatRoleLabel,
  type NotificationItem,
  type NotificationPageResponse,
  type UserProfile,
} from "@/lib/types";
import { UserGuideModal } from "./UserGuideModal";

interface NavbarProps {
  user: UserProfile | null;
}

interface NavItem {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  accent?: boolean;
  badge?: number;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const role = (user?.role || "").toUpperCase();
  const canAccessDashboard =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";

  useEffect(() => {
    if (!user?.id) {
      setUnreadChatCount(0);
      return;
    }

    let cancelled = false;

    async function fetchUnreadCount() {
      try {
        const [inboxRes, groupsRes] = await Promise.all([
          fetch("/api/proxy/chats/inbox"),
          fetch("/api/proxy/chats/groups"),
        ]);
        if (cancelled) return;
        let total = 0;
        if (inboxRes.ok) {
          const inboxData = await inboxRes.json().catch(() => []);
          if (Array.isArray(inboxData)) {
            total += inboxData.reduce(
              (sum, c) => sum + (Number(c?.unreadCount) || 0),
              0,
            );
          }
        }
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json().catch(() => []);
          if (Array.isArray(groupsData)) {
            total += groupsData.reduce(
              (sum, g) => sum + (Number(g?.unreadCount) || 0),
              0,
            );
          }
        }
        if (!cancelled) {
          setUnreadChatCount(total);
        }
      } catch {
        // Abaikan error polling badge chat
      }
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !window.location.pathname.startsWith("/chat")
      ) {
        fetchUnreadCount();
      }
    }, 30000);

    function onUnreadUpdate(e: Event) {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === "number") {
        setUnreadChatCount(Math.max(0, custom.detail));
      } else {
        fetchUnreadCount();
      }
    }

    window.addEventListener("keyloka:chat-unread-update", onUnreadUpdate);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("keyloka:chat-unread-update", onUnreadUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadNotifCount(0);
      setNotifItems([]);
      return;
    }

    let cancelled = false;

    async function fetchNotifUnreadCount() {
      try {
        const res = await fetch("/api/proxy/notifications/unread-count");
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data?.unreadCount === "number") {
          setUnreadNotifCount(data.unreadCount);
        }
      } catch {
        // Abaikan error polling notifikasi
      }
    }

    fetchNotifUnreadCount();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifUnreadCount();
      }
    }, 30000);

    function onNotifUpdate(e: Event) {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === "number") {
        setUnreadNotifCount(Math.max(0, custom.detail));
      } else {
        fetchNotifUnreadCount();
      }
    }

    window.addEventListener("keyloka:notifications-unread-update", onNotifUpdate);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(
        "keyloka:notifications-unread-update",
        onNotifUpdate,
      );
    };
  }, [user?.id]);

  useEffect(() => {
    if (!notifOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [notifOpen]);

  async function toggleNotifDropdown() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next) return;
    setNotifLoading(true);
    try {
      const res = await fetch("/api/proxy/notifications?page=1&limit=6");
      if (res.ok) {
        const json: NotificationPageResponse = await res.json();
        setNotifItems(json.data || []);
        setUnreadNotifCount(json.unreadCount ?? 0);
      }
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleMarkAllNotifRead() {
    const res = await fetch("/api/proxy/notifications/read-all", {
      method: "PATCH",
    });
    if (res.ok) {
      setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    }
  }

  async function handleClickNotifItem(item: NotificationItem) {
    setNotifOpen(false);
    if (!item.isRead) {
      setNotifItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadNotifCount((c) => Math.max(0, c - 1));
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

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Jelajah Hunian",
      icon: Compass,
      isActive: (p) => p === "/",
    },
    ...(user
      ? [
          {
            href: "/favorites",
            label: "Favorit",
            mobileLabel: "Favorit & Bandingkan",
            icon: Heart,
            isActive: (p: string) => p.startsWith("/favorites"),
          },
          {
            href: "/bookings",
            label: "Booking",
            mobileLabel: "Survei & Booking",
            icon: CalendarCheck,
            isActive: (p: string) => p.startsWith("/bookings"),
          },
          {
            href: "/chat",
            label: "Pesan",
            mobileLabel: "Kotak Pesan & Grup",
            icon: MessageCircle,
            isActive: (p: string) => p.startsWith("/chat"),
            badge: unreadChatCount,
          },
        ]
      : []),
    ...(canAccessDashboard
      ? [
          {
            href: "/dashboard",
            label: "Dashboard",
            mobileLabel: "Dashboard Pengelola",
            icon: LayoutDashboard,
            isActive: (p: string) => p.startsWith("/dashboard"),
            accent: true,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 shadow-2xs backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/keyloka_logo.png"
            alt="Keyloka Logo"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-gray-900">
            Key<span className="text-emerald-600">loka</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden lg:flex items-center gap-0.5 xl:gap-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition xl:px-3 ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : item.accent
                      ? "text-emerald-700 hover:bg-emerald-50/70"
                      : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span
                    aria-label={`${item.badge} pesan belum dibaca`}
                    className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white"
                  >
                    {item.badge! > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-gray-600 transition hover:bg-gray-100/80 hover:text-gray-900 xl:px-3"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Panduan</span>
          </button>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden lg:flex shrink-0 items-center gap-1.5">
          {user ? (
            <>
              <div ref={notifContainerRef} className="relative">
                <button
                  type="button"
                  onClick={toggleNotifDropdown}
                  title="Notifikasi"
                  aria-label="Notifikasi"
                  aria-expanded={notifOpen}
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                    notifOpen || pathname.startsWith("/notifications")
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifCount > 0 && (
                    <span
                      aria-label={`${unreadNotifCount} notifikasi belum dibaca`}
                      className="absolute -right-1 -top-1 inline-flex min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-extrabold leading-none text-white ring-2 ring-white"
                    >
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                      <span className="text-xs font-extrabold text-gray-900">
                        Notifikasi
                      </span>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotifRead}
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {notifLoading ? (
                        <p className="p-4 text-center text-xs text-gray-400">
                          Memuat notifikasi...
                        </p>
                      ) : notifItems.length === 0 ? (
                        <p className="p-5 text-center text-xs text-gray-400">
                          Belum ada notifikasi.
                        </p>
                      ) : (
                        notifItems.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleClickNotifItem(n)}
                            className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition ${
                              n.isRead
                                ? "bg-white hover:bg-gray-50"
                                : "bg-emerald-50/40 hover:bg-emerald-50/70"
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                n.isRead ? "bg-transparent" : "bg-emerald-600"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-gray-900">
                                {n.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-600">
                                {n.body}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <Link
                      href="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block border-t border-gray-100 bg-gray-50/70 py-2.5 text-center text-xs font-bold text-emerald-700 hover:bg-gray-100"
                    >
                      Lihat Semua Notifikasi
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition ${
                  pathname.startsWith("/profile")
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                  {getInitials(user.name)}
                </span>
                <div className="min-w-0 text-left">
                  <p className="max-w-[90px] truncate text-[12px] font-bold leading-tight text-gray-900 xl:max-w-[120px]">
                    {user.name}
                  </p>
                  <p className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium leading-tight text-gray-500">
                    <span className="hidden xl:inline">{formatRoleLabel(user.role)}</span>
                    <span className="hidden xl:inline" aria-hidden="true">•</span>
                    <span className="font-semibold text-emerald-700">
                      {user.pointsBalance ?? 0} Poin
                    </span>
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar"
                aria-label="Keluar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3.5 py-1.5 text-[13px] font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>

        {/* Mobile & Tablet Actions */}
        <div className="flex lg:hidden items-center gap-2">
          {user && (
            <Link
              href="/notifications"
              aria-label="Notifikasi"
              className="relative rounded-xl border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
            className="relative rounded-xl border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {!mobileOpen && unreadChatCount > 0 && (
              <span
                aria-label={`${unreadChatCount} pesan belum dibaca`}
                className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-extrabold leading-none text-white ring-2 ring-white"
              >
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          {user && (
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 transition hover:bg-gray-100"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {getInitials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatRoleLabel(user.role)} • {user.email}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                {user.loyaltyLevel || "Bronze"} • {user.pointsBalance ?? 0}
              </span>
            </Link>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-emerald-600" : "text-gray-500"
                    }`}
                  />
                  <span>{item.mobileLabel || item.label}</span>
                  {(item.badge ?? 0) > 0 && (
                    <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setGuideOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-gray-500" />
              <span>Panduan Pengguna</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar Akun</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <LogIn className="h-4 w-4" />
                <span>Masuk Akun Keyloka</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {guideOpen && <UserGuideModal onClose={() => setGuideOpen(false)} />}
    </header>
  );
}
