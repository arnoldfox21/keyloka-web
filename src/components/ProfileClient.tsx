"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  Building2,
  Camera,
  CheckCircle2,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { formatRupiah, resolveImageUrl, type UserProfile } from "@/lib/types";

interface ProfileClientProps {
  initialUser: UserProfile;
}

export function ProfileClient({ initialUser }: ProfileClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [name, setName] = useState(initialUser.name || "");
  const [username, setUsername] = useState(initialUser.username || "");
  const [bio, setBio] = useState(initialUser.bio || "");
  const [city, setCity] = useState(initialUser.city || "");
  const [phone, setPhone] = useState(initialUser.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(initialUser.coverUrl || "");
  const [showWhatsapp, setShowWhatsapp] = useState(
    initialUser.showWhatsapp ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const role = (user.role || "").toUpperCase();
  const isOwnerOrAdmin =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";

  const completenessFields = [name, username, bio, city, phone, avatarUrl];
  const completenessPct = Math.round(
    (completenessFields.filter((f) => Boolean(f && f.trim())).length /
      completenessFields.length) *
      100,
  );

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "avatar" | "cover",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(target);
    setMsg(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      const res = await fetch("/api/proxy/kosts/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setMsg({ type: "err", text: data?.message || "Gagal mengunggah gambar." });
      } else {
        if (target === "avatar") setAvatarUrl(data.url);
        else setCoverUrl(data.url);
        setMsg({ type: "ok", text: "Gambar berhasil diunggah. Klik Simpan Profil." });
      }
    } catch {
      setMsg({ type: "err", text: "Gagal memproses gambar." });
    } finally {
      setUploading(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/proxy/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || undefined,
          bio: bio.trim(),
          city: city.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
          showWhatsapp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "err", text: data?.message || "Gagal memperbarui profil." });
      } else {
        setUser((prev) => ({ ...prev, ...data }));
        setMsg({ type: "ok", text: "Profil berhasil diperbarui." });
        router.refresh();
      }
    } catch {
      setMsg({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg({ type: "err", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "err", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setSavingPass(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proxy/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: user.hasPassword ? currentPassword : "",
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "err", text: data?.message || "Gagal memperbarui password." });
      } else {
        setUser((prev) => ({ ...prev, hasPassword: true }));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMsg({ type: "ok", text: "Password akun berhasil disimpan." });
      }
    } catch {
      setMsg({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setSavingPass(false);
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus akun secara permanen? Tindakan ini tidak dapat dibatalkan.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/proxy/auth/users/me", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: data?.message || "Gagal menghapus akun." });
        return;
      }
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Gagal terhubung ke server." });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Cover & Header */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-40 sm:h-52 bg-gradient-to-r from-emerald-600 to-teal-500">
          {coverUrl && (
            <img
              src={resolveImageUrl(coverUrl)}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          )}
          <label className="absolute right-4 bottom-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/75">
            <Camera className="h-3.5 w-3.5" />
            {uploading === "cover" ? "Mengunggah..." : "Ubah Cover"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "cover")}
            />
          </label>
        </div>

        <div className="px-6 pb-6">
          <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 shadow-md">
                {avatarUrl ? (
                  <img
                    src={resolveImageUrl(avatarUrl)}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-emerald-700">
                    <UserIcon className="h-10 w-10" />
                  </div>
                )}
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center bg-black/55 py-1 text-[10px] font-bold text-white hover:bg-black/75">
                  {uploading === "avatar" ? "..." : "Ubah"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "avatar")}
                  />
                </label>
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-extrabold text-gray-900">{user.name}</h1>
                <p className="text-xs text-gray-500">
                  {user.username ? `@${user.username} • ` : ""}
                  {user.email}
                </p>
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isOwnerOrAdmin && (
                <>
                  <Link
                    href={`/owner/${user.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    Profil Publik & Postingan
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Completeness */}
          <div className="mt-5 rounded-2xl bg-gray-50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
              <span>Kelengkapan Profil</span>
              <span className="text-emerald-700">{completenessPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${completenessPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/bookings"
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 hover:border-emerald-300 transition"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Level & Poin Keyloka</p>
              <p className="text-lg font-extrabold text-gray-900">
                {user.loyaltyLevel || "Bronze"} • {user.pointsBalance ?? 0} Poin
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600">Lihat →</span>
        </Link>

        {isOwnerOrAdmin && (
          <Link
            href="/dashboard?tab=WALLET"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 hover:border-emerald-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Saldo Kredit Iklan</p>
                <p className="text-lg font-extrabold text-gray-900">
                  {formatRupiah(user.creditBalance ?? 0)}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600">Top Up →</span>
          </Link>
        )}
      </div>

      {msg && (
        <div
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
            msg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-extrabold text-gray-900">Edit Informasi Profil</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="misal: budi_kost"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kota
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Malang"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Bio Singkat (maks 160 karakter)
            </label>
            <textarea
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan sedikit tentang dirimu atau properti yang dikelola..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
            />
          </div>

          {isOwnerOrAdmin && (
            <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showWhatsapp}
                onChange={(e) => setShowWhatsapp(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Tampilkan tombol WhatsApp saya pada halaman detail properti
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>

        {/* Security & Danger Zone */}
        <div className="space-y-6">
          <form
            onSubmit={handleSavePassword}
            className="rounded-3xl border border-gray-200 bg-white p-6 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-gray-900">Keamanan Akun</h2>
            </div>
            <p className="text-xs text-gray-500">
              {user.hasPassword
                ? "Ubah password untuk login menggunakan email."
                : "Atur password agar Anda juga bisa masuk dengan email."}
            </p>

            {user.hasPassword && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {savingPass
                ? "Menyimpan..."
                : user.hasPassword
                  ? "Ubah Password"
                  : "Atur Password"}
            </button>
          </form>

          <div className="rounded-3xl border border-red-200 bg-red-50/60 p-6 space-y-3">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-base font-extrabold">Zona Berbahaya</h2>
            </div>
            <p className="text-xs text-red-600">
              Menghapus akun akan menghapus profil dan akses Anda secara permanen.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Akun Permanen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
