"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Award,
  Building2,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { UserGuideModal } from "./UserGuideModal";

interface FooterProps {
  user: UserProfile | null;
}

export function Footer({ user }: FooterProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const role = (user?.role || "").toUpperCase();
  const canAccessDashboard =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Trust */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/keyloka_logo.png"
                alt="Keyloka Logo"
                className="h-9 w-9 rounded-xl bg-white p-0.5 object-contain"
              />
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white">
                  Key<span className="text-emerald-400">loka</span>
                </span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400">
              Platform pencarian dan booking kost, apartemen, kontrakan, serta
              hunian harian yang praktis, transparan, dan terpercaya — fokus
              layanan saat ini di area Malang dan sekitarnya.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Hunian Terverifikasi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                Transaksi Aman
              </span>
            </div>
          </div>

          {/* Column 2: Jelajah Hunian */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Jelajah Hunian
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/sewa/kost"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Kost Putra, Putri & Campur
                </Link>
              </li>
              <li>
                <Link
                  href="/sewa/apartemen"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Apartemen Siap Huni
                </Link>
              </li>
              <li>
                <Link
                  href="/sewa/kontrakan"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Kontrakan Tahunan & Bulanan
                </Link>
              </li>
              <li>
                <Link
                  href="/sewa/villa"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Villa & Homestay Harian
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Akun & Layanan */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Akun & Layanan
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/blog"
                  className="hover:text-emerald-400 transition"
                >
                  Blog & Panduan Kost
                </Link>
              </li>
              <li>
                <Link
                  href={user ? "/favorites" : "/login"}
                  className="hover:text-emerald-400 transition"
                >
                  Favorit & Bandingkan Properti
                </Link>
              </li>
              <li>
                <Link
                  href={user ? "/bookings" : "/login"}
                  className="hover:text-emerald-400 transition"
                >
                  Booking & Jadwal Survei
                </Link>
              </li>
              <li>
                <Link
                  href={user ? "/chat" : "/login"}
                  className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-slate-500" />
                  Kotak Pesan & Grup Penghuni
                </Link>
              </li>
              <li>
                <Link
                  href={user ? "/profile" : "/login"}
                  className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition"
                >
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  Profil & Poin Loyalti
                </Link>
              </li>
              {canAccessDashboard && (
                <li>
                  <Link
                    href="/dashboard"
                    className="font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Dashboard & Dompet Pemilik
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Bantuan & Keamanan */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Bantuan & Keamanan
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Butuh bantuan transaksi, survei, atau klaim Escrow? Pelajari alur
              penggunaan atau hubungi tim kami.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:border-emerald-500/50 hover:bg-slate-800 transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                Buka Panduan Pengguna
              </button>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                FAQ & Transaksi Escrow
              </Link>
              <Link
                href="/gabung-pemilik"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                Gabung Jadi Pemilik Properti
              </Link>
              <Link
                href="/syarat-ketentuan"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                Syarat & Ketentuan
              </Link>
              <Link
                href="/kebijakan-privasi"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                Kebijakan Privasi
              </Link>
              <a
                href="mailto:halo@keyloka.com"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                halo@keyloka.com
              </a>
            </div>
          </div>
        </div>

        {/* Android App Coming Soon Mini Banner */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-slate-900 px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Aplikasi Android Keyloka Segera Hadir
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                  Coming Soon
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Segera meluncur di Google Play Store — cari hunian, atur survei, dan chat pemilik lebih praktis dari genggaman.
              </p>
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-xs font-semibold text-slate-200">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 text-emerald-400 fill-current"
            >
              <path d="M3.609 1.814L13.792 12 3.61 22.186a1.75 1.75 0 0 1-.61-1.335V3.149c0-.517.224-.995.609-1.335zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
            </svg>
            <span>Google Play Store</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Keyloka. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1 text-slate-500 mr-1">
              <Building2 className="h-3.5 w-3.5" />
              Kategori:
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              Kost
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              Apartemen
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              Kontrakan
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              Villa & Homestay
            </span>
          </div>
        </div>
      </div>

      {guideOpen && <UserGuideModal onClose={() => setGuideOpen(false)} />}
    </footer>
  );
}
