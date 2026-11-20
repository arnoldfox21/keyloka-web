"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  Phone,
  Sparkles,
} from "lucide-react";
import { CityAutocompleteInput } from "./CityAutocompleteInput";
import {
  normalizeAndValidateIndonesianPhone,
  validateCityName,
} from "@/lib/validation";
import {
  formatRoleLabel,
  getEffectiveUserRoles,
  hasDualRoles,
  type UserProfile,
} from "@/lib/types";

interface RoleActivationPanelProps {
  user: UserProfile;
  variant: "profile" | "become-owner-page" | "switch-to-owner-page";
  redirectAfterOwner?: string;
  onUpdated?: (updatedUser: UserProfile) => void;
}

export function RoleActivationPanel({
  user,
  variant,
  redirectAfterOwner = "/dashboard",
  onUpdated,
}: RoleActivationPanelProps) {
  const router = useRouter();
  const activeRole = (user.role || "PENYEWA").toUpperCase();
  const roles = getEffectiveUserRoles(user);
  const dual = hasDualRoles(user);

  const [showForm, setShowForm] = useState(variant === "become-owner-page");
  const [phone, setPhone] = useState(user.phone || "");
  const [city, setCity] = useState(user.city || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    activeRole === "STAFF" ||
    activeRole === "ADMINISTRATOR" ||
    activeRole === "PENULIS"
  ) {
    return null;
  }

  async function handleSwitch(targetRole: "PENYEWA" | "PEMILIK_KOST") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Gagal berpindah mode peran.");
        setBusy(false);
        return;
      }
      if (data?.user) onUpdated?.(data.user);
      if (variant === "switch-to-owner-page") {
        router.push(redirectAfterOwner);
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterOwner(e: React.FormEvent) {
    e.preventDefault();
    const phoneCheck = normalizeAndValidateIndonesianPhone(phone, {
      required: true,
    });
    if (!phoneCheck.valid) {
      setError(phoneCheck.error || "Nomor WhatsApp tidak valid.");
      return;
    }
    const cityCheck = validateCityName(city, { required: true });
    if (!cityCheck.valid) {
      setError(cityCheck.error || "Kota properti/domisili tidak valid.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "PEMILIK_KOST",
          phone: phoneCheck.normalized,
          city: cityCheck.normalized,
          switchNow: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.message || "Gagal mendaftarkan akun sebagai Pemilik Properti.",
        );
        setBusy(false);
        return;
      }
      if (data?.user) onUpdated?.(data.user);
      setShowForm(false);
      if (variant !== "profile" || redirectAfterOwner !== "/dashboard") {
        router.push(redirectAfterOwner);
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterTenant() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "PENYEWA",
          switchNow: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Gagal mengaktifkan mode Penyewa.");
        setBusy(false);
        return;
      }
      if (data?.user) onUpdated?.(data.user);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "switch-to-owner-page") {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900">
            Anda Sedang di Mode Penyewa
          </h1>
          <p className="text-sm text-gray-600">
            Beralih ke <strong>Mode Pemilik Properti</strong> untuk mengakses
            Dashboard Pengelola dan mengelola unit iklan Anda.
          </p>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSwitch("PEMILIK_KOST")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Masuk ke Mode Pemilik
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ownerRegistrationForm = (
    <form
      onSubmit={handleRegisterOwner}
      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 text-left"
    >
      <p className="text-xs font-bold text-emerald-900">
        Lengkapi kontak pemilik (langsung aktif tanpa menunggu persetujuan admin):
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Nomor WhatsApp Aktif *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Kota Properti / Domisili *
          </label>
          <CityAutocompleteInput
            required
            value={city}
            onChange={setCity}
            placeholder="Contoh: Kota Malang"
            inputClassName="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {busy ? "Mengaktifkan..." : "Aktifkan Akun Pemilik Sekarang"}
        </button>
        {variant === "profile" && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );

  if (variant === "become-owner-page") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Aktivasi Pemilik Properti</span>
          </div>
          <h1 className="mt-3 text-2xl font-black text-gray-900">
            Daftar Sebagai Pemilik Properti
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            Akun Penyewa Anda (<strong>{user.email}</strong>) akan langsung
            memiliki akses sebagai <strong>Pemilik Properti</strong>. Setelah
            login nanti Anda bisa memilih masuk sebagai Penyewa atau Pemilik.
          </p>
          {ownerRegistrationForm}
        </div>
      </div>
    );
  }

  // Profile card variant
  const nextSwitchRole: "PENYEWA" | "PEMILIK_KOST" =
    activeRole === "PEMILIK_KOST" ? "PENYEWA" : "PEMILIK_KOST";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">
            Peran &amp; Mode Akun
          </h2>
          <p className="mt-0.5 text-xs text-gray-600">
            {dual
              ? "Akun Anda terdaftar di kedua peran. Anda dapat berpindah mode kapan saja."
              : activeRole === "PENYEWA"
                ? "Ingin memasarkan kost, kontrakan, atau villa? Aktifkan peran Pemilik di akun ini."
                : "Anda juga bisa mengaktifkan mode Penyewa untuk menyewa hunian lain."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {roles.map((r) => {
              const isActive = r === activeRole;
              return (
                <span
                  key={r}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r === "PEMILIK_KOST" ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <Home className="h-3 w-3" />
                  )}
                  {formatRoleLabel(r)}
                  {isActive ? " (Aktif)" : ""}
                </span>
              );
            })}
          </div>
        </div>

        <div className="shrink-0">
          {dual ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSwitch(nextSwitchRole)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-3.5 w-3.5" />
              )}
              Beralih ke Mode{" "}
              {nextSwitchRole === "PEMILIK_KOST" ? "Pemilik" : "Penyewa"}
            </button>
          ) : activeRole === "PENYEWA" ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700"
            >
              <Building2 className="h-3.5 w-3.5" />
              {showForm ? "Tutup Form" : "Daftar Sebagai Pemilik"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleRegisterTenant}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Home className="h-3.5 w-3.5" />
              )}
              Aktifkan Mode Penyewa
            </button>
          )}
        </div>
      </div>

      {error && !showForm && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {showForm && activeRole === "PENYEWA" && !dual && ownerRegistrationForm}
    </div>
  );
}
