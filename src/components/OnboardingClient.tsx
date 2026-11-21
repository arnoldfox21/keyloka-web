"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Phone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { CityAutocompleteInput } from "@/components/CityAutocompleteInput";
import {
  normalizeAndValidateIndonesianPhone,
  validateCityName,
} from "@/lib/validation";
import type { UserProfile } from "@/lib/types";

interface AvailableCityOption {
  city: string;
  count: number;
}

interface OnboardingClientProps {
  user: UserProfile;
  allowOwnerRegistration?: boolean;
  availableCities?: AvailableCityOption[];
}

const DEFAULT_ACTIVE_CITIES: AvailableCityOption[] = [
  { city: "Kota Malang", count: 0 },
  { city: "Kabupaten Malang", count: 0 },
  { city: "Kota Batu", count: 0 },
];

const COMING_SOON_POPULAR_CITIES = [
  "Kota Surabaya",
  "Kota Yogyakarta",
  "Kota Bandung",
  "Jakarta Selatan",
];

function stripCityPrefix(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
    .trim();
}

const CATEGORIES = [
  { value: "KOST", label: "Kost", desc: "Kamar bulanan dekat kampus & kantor" },
  { value: "KONTRAKAN", label: "Kontrakan", desc: "Rumah sewa tahunan/bulanan" },
  { value: "APARTEMEN", label: "Apartemen", desc: "Unit modern dengan fasilitas lengkap" },
  { value: "HUNIAN_HARIAN", label: "Hunian Harian", desc: "Villa & homestay harian" },
  { value: "SEMUA", label: "Semua Hunian", desc: "Tampilkan semua pilihan terbaik" },
];

export function OnboardingClient({
  user,
  allowOwnerRegistration = true,
  availableCities = [],
}: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"PENYEWA" | "PEMILIK_KOST">(
    allowOwnerRegistration && user.role === "PEMILIK_KOST"
      ? "PEMILIK_KOST"
      : "PENYEWA",
  );
  const [preferredCategory, setPreferredCategory] = useState(
    user.preferredCategory || "SEMUA",
  );
  const [city, setCity] = useState(user.city || "Kota Malang");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCityChips = useMemo<AvailableCityOption[]>(() => {
    const map = new Map<string, AvailableCityOption>();
    for (const item of availableCities) {
      const key = item.city.trim().toLowerCase();
      if (key) {
        map.set(key, item);
      }
    }
    for (const fallback of DEFAULT_ACTIVE_CITIES) {
      const key = fallback.city.toLowerCase();
      if (!map.has(key)) {
        map.set(key, fallback);
      }
    }
    return Array.from(map.values());
  }, [availableCities]);

  const comingSoonChips = useMemo(() => {
    const activeKeys = new Set(
      activeCityChips.map((c) => c.city.trim().toLowerCase()),
    );
    return COMING_SOON_POPULAR_CITIES.filter(
      (c) => !activeKeys.has(c.toLowerCase()),
    );
  }, [activeCityChips]);

  const matchedAvailableCity = useMemo<AvailableCityOption | null>(() => {
    const trimmed = city.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const exact = activeCityChips.find(
      (c) => c.city.toLowerCase() === lower,
    );
    if (exact) return exact;

    const clean = stripCityPrefix(trimmed);
    if (!clean || clean.length < 3) return null;
    return (
      activeCityChips.find((c) => stripCityPrefix(c.city) === clean) ?? null
    );
  }, [city, activeCityChips]);

  async function handleSubmit() {
    const resolvedCityInput = matchedAvailableCity
      ? matchedAvailableCity.city
      : city;
    const cityCheck = validateCityName(resolvedCityInput, { required: false });
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
          roles: [role],
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
      router.push(role === "PEMILIK_KOST" ? "/dashboard" : "/");
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
                disabled={!allowOwnerRegistration}
                onClick={() => setRole("PEMILIK_KOST")}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                  !allowOwnerRegistration
                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    : role === "PEMILIK_KOST"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900">Pemilik / Pengelola Properti</p>
                    {!allowOwnerRegistration && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Ditutup Sementara
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Pasang iklan properti, kelola jadwal survei, terima pembayaran & grup penghuni.
                  </p>
                </div>
                {role === "PEMILIK_KOST" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              Kamu tetap bisa mengaktifkan atau beralih ke peran lainnya kapan saja melalui menu Profil.
            </p>
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
              {role === "PEMILIK_KOST"
                ? "Lokasi Properti & Kontak WhatsApp"
                : "Di kota mana kamu mencari hunian?"}
            </h1>
            <p className="text-sm text-gray-600">
              {role === "PEMILIK_KOST"
                ? "Membantu mempercepat pengisian lokasi properti dan koordinasi survei dengan calon penyewa."
                : "Kota pilihanmu akan menjadi tampilan default saat kamu membuka Beranda Keyloka."}
            </p>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Pilih Cepat Area Tersedia
                  </label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <Sparkles className="h-3 w-3" />
                    Properti Siap Dipesan
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCityChips.map((item) => {
                    const isSelected =
                      city.trim().toLowerCase() === item.city.toLowerCase() ||
                      matchedAvailableCity?.city === item.city;
                    return (
                      <button
                        key={item.city}
                        type="button"
                        onClick={() => setCity(item.city)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                            : "border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.city}</span>
                        {item.count > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {comingSoonChips.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
                      Kota populer lainnya (Segera Hadir):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {comingSoonChips.map((cityName) => {
                        const isSelected =
                          city.trim().toLowerCase() === cityName.toLowerCase();
                        return (
                          <button
                            key={cityName}
                            type="button"
                            onClick={() => setCity(cityName)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            <span>{cityName}</span>
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-800">
                              Soon
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {role === "PEMILIK_KOST"
                    ? "Kota / Kabupaten Lokasi Properti"
                    : "Atau Ketik Kota / Kabupaten Pencarian"}
                </label>
                <CityAutocompleteInput
                  value={city}
                  onChange={setCity}
                  placeholder="Contoh: Kota Malang, Kota Surabaya..."
                />

                {city.trim().length >= 3 && (
                  <div
                    className={`mt-2 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
                      matchedAvailableCity
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                        : "border-amber-200 bg-amber-50/80 text-amber-900"
                    }`}
                  >
                    {matchedAvailableCity ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            Hunian tersedia di {matchedAvailableCity.city}
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Beranda akan otomatis menampilkan daftar properti di{" "}
                            <span className="font-semibold">
                              {matchedAvailableCity.city}
                            </span>{" "}
                            sebagai tampilan utama.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            Hunian di {city.trim()} Segera Hadir
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Pilihan kotamu tetap kami simpan. Sambil menunggu listing
                            di {city.trim()} hadir, Beranda akan menampilkan semua
                            rekomendasi hunian dari kota yang sudah tersedia.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp <span className="font-normal text-gray-400">(Opsional)</span>
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
                <p className="mt-1 text-[11px] text-gray-500">
                  Mempermudah konfirmasi jadwal survei dan notifikasi booking.
                </p>
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
