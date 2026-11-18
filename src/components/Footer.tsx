"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Award,
  Building2,
  CreditCard,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
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
              hunian harian yang praktis, transparan, dan terpercaya di
              Indonesia.
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
                  href="/?category=KOST"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Kost Putra, Putri & Campur
                </Link>
              </li>
              <li>
                <Link
                  href="/?category=APARTEMEN"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Apartemen Siap Huni
                </Link>
              </li>
              <li>
                <Link
                  href="/?category=KONTRAKAN"
                  className="inline-flex items-center gap-2 hover:text-emerald-400 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Kontrakan Tahunan & Bulanan
                </Link>
              </li>
              <li>
                <Link
                  href="/?stayMode=HUNIAN_HARIAN"
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

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Keyloka. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1 text-slate-500 mr-1">
              <CreditCard className="h-3.5 w-3.5" />
              Pembayaran:
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              QRIS
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              Virtual Account
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5">
              E-Wallet
            </span>
          </div>
        </div>
      </div>

      {guideOpen && <UserGuideModal onClose={() => setGuideOpen(false)} />}
    </footer>
  );
}
