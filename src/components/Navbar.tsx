"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  CalendarCheck,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  User,
  X,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface NavbarProps {
  user: UserProfile | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (user?.role || "").toUpperCase();
  const canAccessDashboard =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/keyloka_logo.png"
            alt="Keyloka Logo"
            className="h-9 w-9 rounded-xl object-contain"
          />
          <div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              Key<span className="text-emerald-600">loka</span>
            </span>
            <span className="hidden sm:inline-block ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Web
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-emerald-50 text-emerald-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Jelajah Hunian
          </Link>
          {user && (
            <>
              <Link
                href="/favorites"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname.startsWith("/favorites")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Heart className="h-4 w-4" />
                Favorit
              </Link>
              <Link
                href="/bookings"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname.startsWith("/bookings")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                Survei & Booking
              </Link>
              <Link
                href="/chat"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname.startsWith("/chat")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Pesan
              </Link>
            </>
          )}
          {canAccessDashboard && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                pathname.startsWith("/dashboard")
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/bookings"
                className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                <span>{user.loyaltyLevel || "Bronze"}</span>
                <span className="text-emerald-600">•</span>
                <span>{user.pointsBalance ?? 0} Poin</span>
              </Link>
              <Link
                href="/profile"
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                  pathname.startsWith("/profile")
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <User className="h-4 w-4 text-emerald-600" />
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900 leading-tight max-w-[120px] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-gray-500">{user.role}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle Menu"
          className="md:hidden rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
          >
            Jelajah Hunian
          </Link>
          {user ? (
            <>
              <Link
                href="/favorites"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <Heart className="h-4 w-4 text-rose-500" />
                Favorit & Bandingkan
              </Link>
              <Link
                href="/bookings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <span>Survei, Booking & Poin</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  {user.loyaltyLevel || "Bronze"} • {user.pointsBalance ?? 0} Poin
                </span>
              </Link>
              <Link
                href="/chat"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Kotak Pesan & Grup
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <User className="h-4 w-4 text-emerald-600" />
                Profil & Keamanan Akun
              </Link>
              {canAccessDashboard && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard Pengelola
                </Link>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <LogIn className="h-4 w-4" />
              Masuk Akun Keyloka
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
