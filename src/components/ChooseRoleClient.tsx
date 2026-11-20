"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Home,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface ChooseRoleClientProps {
  user: UserProfile;
}

export function ChooseRoleClient({ user }: ChooseRoleClientProps) {
  const router = useRouter();
  const [selecting, setSelecting] = useState<"PENYEWA" | "PEMILIK_KOST" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const activeRole = (user.role || "PENYEWA").toUpperCase();

  async function handleSelectRole(targetRole: "PENYEWA" | "PEMILIK_KOST") {
    setSelecting(targetRole);
    setError(null);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Gagal memilih mode masuk.");
        setSelecting(null);
        return;
      }
      router.push(targetRole === "PEMILIK_KOST" ? "/dashboard" : "/");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
      setSelecting(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Selamat datang kembali, {user.name}</span>
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900">
          Pilih Mode Masuk
        </h1>
        <p className="mt-1.5 text-sm text-gray-600">
          Akun Anda terdaftar sebagai <strong>Penyewa</strong> dan{" "}
          <strong>Pemilik Properti</strong>. Pilih mode yang ingin Anda gunakan
          untuk sesi ini (Anda tetap bisa berpindah mode kapan saja dari menu).
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={selecting !== null}
            onClick={() => handleSelectRole("PENYEWA")}
            className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
              activeRole === "PENYEWA"
                ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15"
                : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30"
            } disabled:opacity-60`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <Home className="h-6 w-6" />
                </div>
                {activeRole === "PENYEWA" && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Terakhir Aktif
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-base font-extrabold text-gray-900">
                Masuk sebagai Penyewa
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Cari kost, apartemen & villa, simpan favorit, ajukan survei,
                booking dengan Escrow, dan kumpulkan poin loyalti.
              </p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
              {selecting === "PENYEWA" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memasuki Mode Penyewa...</span>
                </>
              ) : (
                <>
                  <span>Lanjut sebagai Penyewa</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </div>
          </button>

          <button
            type="button"
            disabled={selecting !== null}
            onClick={() => handleSelectRole("PEMILIK_KOST")}
            className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
              activeRole === "PEMILIK_KOST"
                ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/15"
                : "border-gray-200 hover:border-amber-400 hover:bg-amber-50/30"
            } disabled:opacity-60`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <Building2 className="h-6 w-6" />
                </div>
                {activeRole === "PEMILIK_KOST" && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    Terakhir Aktif
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-base font-extrabold text-gray-900">
                Masuk sebagai Pemilik
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Kelola unit properti & iklan, terima pengajuan survei/booking,
                chat penghuni, dan pantau saldo serta pencairan dana.
              </p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700">
              {selecting === "PEMILIK_KOST" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memasuki Dashboard Pemilik...</span>
                </>
              ) : (
                <>
                  <span>Lanjut sebagai Pemilik</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
