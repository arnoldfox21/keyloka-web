"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Phone,
  Save,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";
import { CityAutocompleteInput } from "./CityAutocompleteInput";
import { compressImageToDataUrl } from "@/lib/image-compress";
import {
  normalizeAndValidateIndonesianPhone,
  validateCityName,
  validateUsername,
} from "@/lib/validation";
import { formatRoleLabel, formatRupiah, resolveImageUrl, type UserProfile } from "@/lib/types";
import { RoleActivationPanel } from "./RoleActivationPanel";

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Verification request state
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState(initialUser.phone || "");
  const [verifyNotes, setVerifyNotes] = useState(
    initialUser.verificationNotes || "",
  );
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Account deletion confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadingDeleteSummary, setLoadingDeleteSummary] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<{
    kostCount: number;
    articleCount: number;
    postCount: number;
    bookingCount: number;
    reviewCount: number;
    favoriteCount: number;
    payoutBalance: number;
    creditBalance: number;
  } | null>(null);

  const role = (user.role || "").toUpperCase();
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";
  const isOwnerOrAdmin = role === "PEMILIK_KOST" || isStaffOrAdmin;
  const isVerifiedAccount = Boolean(user.isVerified) || isStaffOrAdmin;
  const verificationStatus = (
    user.verificationStatus || (isVerifiedAccount ? "VERIFIED" : "NONE")
  ).toUpperCase();

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
    e.target.value = "";
    if (!file) return;
    setUploading(target);
    setMsg(null);
    try {
      const { dataUrl, mimeType } = await compressImageToDataUrl(file);
      const res = await fetch("/api/proxy/kosts/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: dataUrl,
          filename: file.name,
          mimeType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const uploadedUrl = data?.url || data?.path;
      if (!res.ok || !uploadedUrl) {
        setMsg({ type: "err", text: data?.message || "Gagal mengunggah gambar." });
        return;
      }

      if (target === "avatar") setAvatarUrl(uploadedUrl);
      else setCoverUrl(uploadedUrl);

      const patchBody =
        target === "avatar" ? { avatarUrl: uploadedUrl } : { coverUrl: uploadedUrl };
      const saveRes = await fetch(`/api/proxy/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const savedData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setMsg({
          type: "err",
          text:
            savedData?.message ||
            "Gambar terunggah, tetapi gagal menyimpan ke profil. Klik Simpan Profil.",
        });
      } else {
        setUser((prev) => ({ ...prev, ...savedData, ...patchBody }));
        setMsg({
          type: "ok",
          text:
            target === "avatar"
              ? "Foto profil berhasil diperbarui."
              : "Foto cover berhasil diperbarui.",
        });
        router.refresh();
      }
    } catch {
      setMsg({ type: "err", text: "Gagal memproses gambar." });
    } finally {
      setUploading(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setMsg({ type: "err", text: "Nama lengkap minimal 2 karakter." });
      return;
    }
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      setMsg({ type: "err", text: usernameCheck.error || "Username tidak valid." });
      return;
    }
    const cityCheck = validateCityName(city, { required: false });
    if (!cityCheck.valid) {
      setMsg({ type: "err", text: cityCheck.error || "Nama kota tidak valid." });
      return;
    }
    const phoneCheck = normalizeAndValidateIndonesianPhone(phone, {
      required: false,
    });
    if (!phoneCheck.valid) {
      setMsg({ type: "err", text: phoneCheck.error || "Nomor WhatsApp tidak valid." });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/proxy/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: usernameCheck.normalized || undefined,
          bio: bio.trim(),
          city: cityCheck.normalized,
          phone: phoneCheck.normalized,
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

  async function openDeleteAccountModal() {
    setDeleteModalOpen(true);
    setLoadingDeleteSummary(true);
    setDeleteSummary(null);
    try {
      const res = await fetch("/api/proxy/auth/users/me/deletion-summary");
      if (res.ok) {
        const data = await res.json();
        setDeleteSummary(data);
      }
    } catch {
      // Tetap tampilkan modal peringatan meskipun ringkasan gagal dimuat
    } finally {
      setLoadingDeleteSummary(false);
    }
  }

  async function handleConfirmDeleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/proxy/auth/users/me", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: data?.message || "Gagal menghapus akun." });
        setDeleteModalOpen(false);
        return;
      }
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Gagal terhubung ke server." });
      setDeleteModalOpen(false);
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleRequestVerification(e: React.FormEvent) {
    e.preventDefault();
    const phoneCheck = normalizeAndValidateIndonesianPhone(verifyPhone, {
      required: true,
    });
    if (!phoneCheck.valid) {
      setMsg({
        type: "err",
        text: phoneCheck.error || "Nomor WhatsApp verifikasi tidak valid.",
      });
      return;
    }
    setSubmittingVerify(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proxy/auth/users/verification-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneCheck.normalized,
          notes: verifyNotes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengirim pengajuan verifikasi.");
      }
      setUser(data);
      setShowVerifyForm(false);
      setMsg({
        type: "ok",
        text: "Pengajuan verifikasi terkirim! Staff akan segera menghubungi Anda via WhatsApp.",
      });
      router.refresh();
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setSubmittingVerify(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Cover & Header */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-40 sm:h-52 bg-gradient-to-r from-emerald-600 to-teal-500">
          {coverUrl && (
            <Image
              src={resolveImageUrl(coverUrl)}
              alt="Cover"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          )}
          <label className="absolute right-4 bottom-4 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/75">
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

        <div className="px-6 pt-3 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative -mt-12 sm:-mt-14 h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 shadow-md">
                {avatarUrl ? (
                  <Image
                    src={resolveImageUrl(avatarUrl)}
                    alt={user.name}
                    fill
                    sizes="96px"
                    className="object-cover"
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
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xl font-extrabold text-gray-900">{user.name}</h1>
                  {isVerifiedAccount && (
                    <BadgeCheck
                      className="h-5 w-5 text-emerald-600"
                      aria-label="Terverifikasi"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {user.username ? `@${user.username} • ` : ""}
                  {user.email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    {formatRoleLabel(user.role)}
                  </span>
                  {isVerifiedAccount ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      Terverifikasi
                    </span>
                  ) : role === "PEMILIK_KOST" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      {verificationStatus === "PENDING"
                        ? "Menunggu Survei Staff"
                        : verificationStatus === "REJECTED"
                          ? "Verifikasi Ditolak"
                          : "Belum Terverifikasi"}
                    </span>
                  ) : null}
                </div>
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

      {/* Peran & Mode Akun */}
      <RoleActivationPanel
        user={user}
        variant="profile"
        onUpdated={(updated) => {
          setUser((prev) => ({ ...prev, ...updated }));
          if (updated.phone) setPhone(updated.phone);
          if (updated.city) setCity(updated.city);
          setMsg({
            type: "ok",
            text: `Mode akun aktif sekarang: ${formatRoleLabel(updated.role)}.`,
          });
        }}
      />

      {/* Verifikasi Pemilik */}
      {role === "PEMILIK_KOST" && !isVerifiedAccount && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Verifikasi Pemilik Properti
              </h2>
              <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                Dapatkan badge <strong>Pemilik Terverifikasi</strong> melalui verifikasi oleh Staff Keyloka untuk membuka:
                <br />• <strong>Booking Langsung (Escrow)</strong> pada properti Anda
                <br />• <strong>Tarik Dana (Payout)</strong> pendapatan sewa ke rekening bank
              </p>
            </div>
            {verificationStatus !== "PENDING" && (
              <button
                type="button"
                onClick={() => setShowVerifyForm((v) => !v)}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 transition"
              >
                {showVerifyForm ? "Tutup Form" : "Ajukan Verifikasi"}
              </button>
            )}
          </div>

          {verificationStatus === "PENDING" && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-xs text-gray-700 space-y-1">
              <p className="font-bold text-emerald-700">
                Pengajuan Verifikasi Sedang Diproses Staff
              </p>
              <p>
                WhatsApp: <span className="font-semibold">{user.phone || "-"}</span>
                {user.verificationKostId ? (
                  <> • Klaim Properti <span className="font-semibold">#{user.verificationKostId}</span></>
                ) : null}
              </p>
              {user.verificationNotes && <p>Catatan: {user.verificationNotes}</p>}
            </div>
          )}

          {verificationStatus === "REJECTED" && user.verificationRejectionReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <strong>Alasan Penolakan Sebelumnya:</strong> {user.verificationRejectionReason}
            </div>
          )}

          {showVerifyForm && (
            <form
              onSubmit={handleRequestVerification}
              className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <input
                  required
                  value={verifyPhone}
                  onChange={(e) => setVerifyPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan untuk Staff (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Contoh: Kost Putri Melati Jl. Soekarno Hatta No. 12, bisa dihubungi jam kerja"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submittingVerify}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingVerify ? "Mengirim..." : "Kirim Pengajuan Verifikasi"}
              </button>
            </form>
          )}
        </div>
      )}

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

        {role === "PEMILIK_KOST" && (
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

        {isOwnerOrAdmin && (
          <Link
            href="/dashboard?tab=PROPERTIES"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 hover:border-emerald-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Manajemen Properti</p>
                <p className="text-sm font-extrabold text-gray-900">
                  Buka Kelola Properti
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isStaffOrAdmin
                    ? "Kelola & setujui pengajuan kost, apartemen, dan kontrakan."
                    : "Kelola unit kost, apartemen, dan kontrakan Anda."}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-600">Buka →</span>
          </Link>
        )}

        {isStaffOrAdmin && (
          <Link
            href="/dashboard?tab=USERS"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-400 transition"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gray-900 p-3 text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">
                  {role === "ADMINISTRATOR" ? "Panel Administrator" : "Panel Staff"}
                </p>
                <p className="text-sm font-extrabold text-gray-900">Kelola Pengguna</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {role === "ADMINISTRATOR"
                    ? "Kelola akun pengguna, ubah role, atau ban akun."
                    : "Pantau akun pengguna, verifikasi, dan blokir (ban) pelanggar."}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-900">Buka →</span>
          </Link>
        )}
      </div>

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
              <CityAutocompleteInput
                value={city}
                onChange={setCity}
                placeholder="Contoh: Kota Malang"
                inputClassName="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
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
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    aria-label={
                      showCurrentPassword
                        ? "Sembunyikan password saat ini"
                        : "Tampilkan password saat ini"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={
                    showNewPassword
                      ? "Sembunyikan password baru"
                      : "Tampilkan password baru"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan konfirmasi password"
                      : "Tampilkan konfirmasi password"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
              Menghapus akun akan menghapus profil, foto, dan seluruh data terkait Anda secara permanen.
            </p>
            <button
              type="button"
              onClick={openDeleteAccountModal}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Akun Permanen
            </button>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-700">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 id="delete-account-title" className="text-lg font-extrabold">
                Hapus Akun Permanen?
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">
              Tindakan ini <strong>tidak dapat dibatalkan</strong>. Seluruh foto profil, riwayat chat, notifikasi, dan data akun Anda akan dihapus permanen.
            </p>

            {loadingDeleteSummary ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-500">
                Memeriksa data terkait akun Anda...
              </div>
            ) : deleteSummary &&
              (deleteSummary.kostCount > 0 ||
                deleteSummary.articleCount > 0 ||
                deleteSummary.postCount > 0 ||
                deleteSummary.bookingCount > 0 ||
                deleteSummary.reviewCount > 0 ||
                deleteSummary.payoutBalance > 0 ||
                deleteSummary.creditBalance > 0) ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1.5">
                <p className="font-bold">
                  Peringatan! Data terkait berikut juga akan ikut terhapus permanen:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {deleteSummary.kostCount > 0 && (
                    <li>
                      <strong>{deleteSummary.kostCount} properti</strong> beserta seluruh foto dan ulasannya
                    </li>
                  )}
                  {deleteSummary.articleCount > 0 && (
                    <li>
                      <strong>{deleteSummary.articleCount} artikel</strong> beserta seluruh gambar terkait
                    </li>
                  )}
                  {deleteSummary.postCount > 0 && (
                    <li>
                      <strong>{deleteSummary.postCount} postingan</strong> beserta foto &amp; komentarnya
                    </li>
                  )}
                  {deleteSummary.bookingCount > 0 && (
                    <li>
                      <strong>{deleteSummary.bookingCount} riwayat booking / survei</strong>
                    </li>
                  )}
                  {deleteSummary.reviewCount > 0 && (
                    <li>
                      <strong>{deleteSummary.reviewCount} ulasan</strong> yang pernah Anda tulis
                    </li>
                  )}
                  {deleteSummary.payoutBalance > 0 && (
                    <li>
                      Sisa saldo penghasilan{" "}
                      <strong>{formatRupiah(deleteSummary.payoutBalance)}</strong> (tarik dana terlebih dahulu sebelum menghapus akun!)
                    </li>
                  )}
                  {deleteSummary.creditBalance > 0 && (
                    <li>
                      Sisa kredit iklan{" "}
                      <strong>{formatRupiah(deleteSummary.creditBalance)}</strong>
                    </li>
                  )}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAccount ? "Menghapus..." : "Ya, Hapus Akun & Semua Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
