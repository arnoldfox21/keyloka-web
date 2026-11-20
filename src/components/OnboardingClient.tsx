"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Phone,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { CityAutocompleteInput } from "@/components/CityAutocompleteInput";
import {
  normalizeAndValidateIndonesianPhone,
  validateCityName,
} from "@/lib/validation";
import type { UserProfile } from "@/lib/types";

interface OnboardingClientProps {
  user: UserProfile;
}

const CATEGORIES = [
  { value: "KOST", label: "Kost", desc: "Kamar bulanan dekat kampus & kantor" },
  { value: "KONTRAKAN", label: "Kontrakan", desc: "Rumah sewa tahunan/bulanan" },
  { value: "APARTEMEN", label: "Apartemen", desc: "Unit modern dengan fasilitas lengkap" },
  { value: "HUNIAN_HARIAN", label: "Hunian Harian", desc: "Villa & homestay harian" },
  { value: "SEMUA", label: "Semua Hunian", desc: "Tampilkan semua pilihan terbaik" },
];

export function OnboardingClient({ user }: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"PENYEWA" | "PEMILIK_KOST" | "BOTH">(
    user.role === "PEMILIK_KOST" ? "PEMILIK_KOST" : "PENYEWA",
  );
  const [preferredCategory, setPreferredCategory] = useState(
    user.preferredCategory || "SEMUA",
  );
  const [city, setCity] = useState(user.city || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const cityCheck = validateCityName(city, { required: false });
    if (!cityCheck.valid) {
      setError(cityCheck.error || "Nama kota tidak valid.");
      return;
    }
    const phoneCheck = normalizeAndValidateIndonesianPhone(phone, {
      required: false,
    });
    if (!phoneCheck.valid) {
      setError(phoneCheck.error || "Nomor WhatsApp tidak valid.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          roles: role === "BOTH" ? ["PENYEWA", "PEMILIK_KOST"] : [role],
          preferredCategory,
          city: cityCheck.normalized || undefined,
          phone: phoneCheck.normalized || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Gagal menyimpan onboarding.");
        setSaving(false);
        return;
      }
      if (role === "BOTH") {
        router.push("/choose-role");
      } else {
        router.push(role === "PEMILIK_KOST" ? "/dashboard" : "/");
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Selamat Datang, {user.name}</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Langkah {step} / 3
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? "bg-emerald-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Kamu bergabung sebagai apa?
            </h1>
            <p className="text-sm text-gray-600">
              Pilih peran utama kamu di Keyloka agar pengalaman sesuai kebutuhan.
            </p>
            <div className="grid gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRole("PENYEWA")}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                  role === "PENYEWA"
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <Home className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Pencari Hunian (Penyewa)</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cari kost, kontrakan, apartemen, ajukan survei & booking langsung.
                  </p>
                </div>
                {role === "PENYEWA" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setRole("PEMILIK_KOST")}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                  role === "PEMILIK_KOST"
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Pemilik / Pengelola Properti</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Pasang iklan properti, kelola jadwal survei, terima pembayaran & grup penghuni.
                  </p>
                </div>
                {role === "PEMILIK_KOST" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setRole("BOTH")}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                  role === "BOTH"
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="rounded-xl bg-teal-100 p-2.5 text-teal-700">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    Keduanya (Penyewa &amp; Pemilik)
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Daftar di kedua peran sekaligus agar bisa mencari hunian sekaligus memasarkan properti.
                  </p>
                </div>
                {role === "BOTH" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Kategori hunian favoritmu?
            </h1>
            <p className="text-sm text-gray-600">
              Kami akan memprioritaskan rekomendasi yang paling relevan untukmu.
            </p>
            <div className="grid gap-2.5 pt-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setPreferredCategory(c.value)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                    preferredCategory === c.value
                      ? "border-emerald-600 bg-emerald-50/70"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                  {preferredCategory === c.value && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Lokasi & Kontak WhatsApp
            </h1>
            <p className="text-sm text-gray-600">
              Opsional, membantu mempercepat pengisian formulir survei atau properti.
            </p>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kota Domisili / Pencarian
                </label>
                <CityAutocompleteInput
                  value={city}
                  onChange={setCity}
                  placeholder="Contoh: Kota Malang"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Saat ini Keyloka berfokus di area Malang dan sekitarnya (kota lain Coming Soon).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Lanjut
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <UserCheck className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Selesai & Mulai"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
