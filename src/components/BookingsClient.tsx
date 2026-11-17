"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  formatRupiah,
  type Booking,
  type LoyaltySummary,
} from "@/lib/types";

interface BookingsClientProps {
  initialBookings: Booking[];
  loyalty: LoyaltySummary | null;
}

export function BookingsClient({
  initialBookings,
  loyalty,
}: BookingsClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshAll() {
    const res = await fetch("/api/proxy/bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    }
    router.refresh();
  }

  async function handleSyncPayment(bookingId: number) {
    setBusyId(bookingId);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/sync-payment`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || "Gagal sinkronisasi pembayaran.");
      }
      setMessage("Status pembayaran berhasil diperbarui.");
      await refreshAll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmCheckIn(bookingId: number) {
    if (!confirm("Konfirmasi bahwa Anda sudah check-in dan kamar sesuai? Dana akan diteruskan ke pemilik.")) {
      return;
    }
    setBusyId(bookingId);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/confirm-checkin`, {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal konfirmasi check-in.");
      setMessage("Check-in dikonfirmasi! Poin loyalti telah ditambahkan.");
      await refreshAll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDispute(bookingId: number) {
    const reason = prompt("Jelaskan kendala yang Anda alami:");
    if (!reason || !reason.trim()) return;
    setBusyId(bookingId);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal mengirim laporan kendala.");
      setMessage("Laporan kendala dikirim. Dana ditahan hingga admin meninjau.");
      await refreshAll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelBooking(bookingId: number) {
    if (!confirm("Yakin ingin membatalkan pengajuan ini?")) return;
    setBusyId(bookingId);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Gagal membatalkan pengajuan.");
      setMessage("Pengajuan berhasil dibatalkan.");
      await refreshAll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  const progressPercent = loyalty
    ? loyalty.nextLevel
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((loyalty.totalPointsEarned - loyalty.currentMin) /
                Math.max(1, loyalty.nextTarget - loyalty.currentMin)) *
                100,
            ),
          ),
        )
      : 100
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Loyalty Card */}
      {loyalty && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Award className="h-4 w-4 text-amber-300" />
                Level {loyalty.level}
              </div>
              <h1 className="mt-2 text-3xl font-black">
                {loyalty.pointsBalance} Poin
              </h1>
              <p className="text-xs text-emerald-50">
                Setara potongan {formatRupiah(loyalty.pointsBalance * loyalty.pointValueRupiah)} untuk booking langsung berikutnya.
              </p>
            </div>
            <div className="w-full sm:w-64 rounded-2xl bg-white/12 p-4">
              <div className="flex justify-between text-xs font-semibold">
                <span>Progress Level</span>
                <span>
                  {loyalty.totalPointsEarned} / {loyalty.nextTarget}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-amber-300 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-50">
                {loyalty.nextLevel
                  ? `Kumpulkan ${Math.max(0, loyalty.nextTarget - loyalty.totalPointsEarned)} poin lagi ke ${loyalty.nextLevel}`
                  : "Anda berada di level tertinggi (Platinum)!"}
              </p>
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {/* Bookings List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            Riwayat Booking & Survei ({bookings.length})
          </h2>
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Muat Ulang
          </button>
        </div>

        {bookings.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama properti atau kota..."
                className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="TERKIRIM">TERKIRIM</option>
              <option value="MENUNGGU KONFIRMASI">MENUNGGU KONFIRMASI</option>
              <option value="DISETUJUI">DISETUJUI</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DITOLAK">DITOLAK</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
            {(search.trim() || statusFilter !== "SEMUA") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("SEMUA");
                }}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        )}

        {(() => {
          const q = search.trim().toLowerCase();
          const filteredBookings = bookings.filter((b) => {
            if (
              statusFilter !== "SEMUA" &&
              (b.status || "").toUpperCase() !== statusFilter
            ) {
              return false;
            }
            if (q) {
              const hay = [b.kost?.name, b.kost?.city, b.kost?.district, String(b.id)]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });

          if (bookings.length === 0) {
            return (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                <p className="text-sm font-bold text-gray-800">
                  Belum ada pengajuan survei atau booking langsung.
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white"
                >
                  Cari Hunian Sekarang
                </Link>
              </div>
            );
          }

          if (filteredBookings.length === 0) {
            return (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                Tidak ada riwayat booking yang cocok dengan pencarian atau filter.
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
              const isDirect = (b.bookingType || "").toUpperCase() === "SEWA";
              const isBusy = busyId === b.id;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${
                            isDirect
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isDirect ? "BOOKING LANGSUNG" : "SURVEI"}
                        </span>
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                          {b.status}
                        </span>
                        {isDirect && b.escrowStatus !== "NONE" && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            <ShieldCheck className="h-3 w-3" />
                            Escrow: {b.escrowStatus}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/kost/${b.kostId}`}
                        className="mt-1.5 block text-base font-extrabold text-gray-900 hover:text-emerald-700"
                      >
                        {b.kost?.name || `Properti #${b.kostId}`}
                      </Link>
                      <p className="text-xs text-gray-500">
                        Mulai: {b.startDate}
                        {isDirect
                          ? ` • ${b.durationCount} ${b.durationUnit === "DAY" ? "Hari" : "Bulan"}`
                          : ""}
                      </p>
                    </div>

                    {isDirect && (
                      <div className="sm:text-right">
                        <p className="text-xs text-gray-500">Total Tagihan</p>
                        <p className="text-lg font-black text-emerald-700">
                          {formatRupiah(b.totalAmount)}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-500">
                          Pembayaran: {b.paymentStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Timeline (matching Flutter) */}
                  {(() => {
                    const st = (b.status || "").toUpperCase();
                    const isCanceled = st === "DIBATALKAN" || st === "DITOLAK";
                    const stepConfirmed =
                      st === "DISETUJUI" || st === "APPROVED" || st === "AKTIF" || st === "SELESAI";
                    const stepDone = st === "SELESAI";
                    if (isCanceled) return null;
                    return (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-bold">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" />
                          Terkirim
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            stepConfirmed ? "text-emerald-700" : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              stepConfirmed ? "bg-emerald-600" : "bg-gray-300"
                            }`}
                          />
                          Dikonfirmasi
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            stepDone ? "text-emerald-700" : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              stepDone ? "bg-emerald-600" : "bg-gray-300"
                            }`}
                          />
                          Selesai
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chat & Group Shortcuts */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {b.kost?.ownerId && (
                      <Link
                        href={`/chat?kostId=${b.kostId}&peerId=${b.kost.ownerId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Chat Pemilik
                      </Link>
                    )}
                    {["DISETUJUI", "APPROVED", "AKTIF", "SELESAI"].includes(
                      (b.status || "").toUpperCase(),
                    ) && (
                      <Link
                        href={`/chat?groupKostId=${b.kostId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Grup {b.kost?.name || "Penghuni"}
                      </Link>
                    )}
                  </div>

                  {/* Actions */}
                  {isDirect && b.paymentStatus === "UNPAID" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {b.paymentUrl && (
                        <a
                          href={b.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Bayar Sekarang
                        </a>
                      )}
                      <button
                        disabled={isBusy}
                        onClick={() => handleSyncPayment(b.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Cek Status Bayar
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => handleCancelBooking(b.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}

                  {!isDirect &&
                    b.status !== "DIBATALKAN" &&
                    b.status !== "DITOLAK" &&
                    b.status !== "SELESAI" && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <button
                          disabled={isBusy}
                          onClick={() => handleCancelBooking(b.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Batalkan Survei
                        </button>
                      </div>
                    )}

                  {isDirect &&
                    b.paymentStatus === "PAID" &&
                    b.escrowStatus === "HELD" && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <button
                          disabled={isBusy}
                          onClick={() => handleConfirmCheckIn(b.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Konfirmasi Check-In
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleDispute(b.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Laporkan Kendala
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
