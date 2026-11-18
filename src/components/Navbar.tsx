"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
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
import { formatRoleLabel, type UserProfile } from "@/lib/types";
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

  const role = (user?.role || "").toUpperCase();
  const canAccessDashboard =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";

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

        {/* Mobile & Tablet Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle Menu"
          aria-expanded={mobileOpen}
          className="lg:hidden rounded-xl border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-100"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
