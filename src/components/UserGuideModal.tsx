"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CalendarCheck,
  CreditCard,
  HelpCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

interface UserGuideModalProps {
  onClose: () => void;
}

const GUIDE_STEPS = [
  {
    icon: MapPin,
    title: "1. Cari & Bandingkan Hunian",
    description:
      "Gunakan pencarian cepat, filter kota/area, fasilitas, mode Daftar/Peta, serta fitur Bandingkan untuk memilih hingga 3 properti sekaligus.",
  },
  {
    icon: CalendarCheck,
    title: "2. Survei atau Booking Langsung",
    description:
      "Ajukan jadwal survei gratis atau langsung pesan kamar pada properti berlabel Booking Langsung.",
  },
  {
    icon: ShieldCheck,
    title: "3. Pembayaran Aman dengan Escrow",
    description:
      "Pembayaran ditahan aman di rekening bersama (Escrow) dan baru diteruskan ke pemilik setelah Anda konfirmasi Check-In.",
  },
  {
    icon: Sparkles,
    title: "4. Kumpulkan Poin Loyalti",
    description:
      "Setiap booking yang selesai check-in memberi poin Keyloka (1 Poin = Rp50 potongan) untuk transaksi berikutnya.",
  },
  {
    icon: MessageCircle,
    title: "5. Chat Pemilik & Grup Penghuni",
    description:
      "Hubungi pemilik via Chat atau WhatsApp, lalu bergabung di Grup Penghuni setelah booking disetujui.",
  },
  {
    icon: CreditCard,
    title: "6. Dashboard & Dompet Pemilik",
    description:
      "Pemilik properti dapat mengelola kamar, menyetujui pengajuan, boost iklan, dan menarik saldo hasil sewa dari Dashboard.",
  },
];

export function UserGuideModal({ onClose }: UserGuideModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-gray-900">
              Panduan Pengguna Keyloka
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan"
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUIDE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-emerald-700">
                  <Icon className="h-4 w-4 shrink-0" />
                  <h3 className="text-xs font-extrabold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
