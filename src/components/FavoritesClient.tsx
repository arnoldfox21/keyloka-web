"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GitCompareArrows, Heart, Search } from "lucide-react";
import type { Kost } from "@/lib/types";
import { CompareModal } from "./CompareModal";
import { KostCard } from "./KostCard";

interface FavoritesClientProps {
  initialKosts: Kost[];
}

export function FavoritesClient({ initialKosts }: FavoritesClientProps) {
  const [kosts, setKosts] = useState<Kost[]>(initialKosts);
  const [search, setSearch] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kosts;
    return kosts.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.city.toLowerCase().includes(q) ||
        k.district.toLowerCase().includes(q),
    );
  }, [kosts, search]);

  const compareList = useMemo(
    () => kosts.filter((k) => selectedIds.includes(k.id)),
    [kosts, selectedIds],
  );

  async function handleToggleFavorite(kostId: number) {
    setKosts((prev) => prev.filter((k) => k.id !== kostId));
    setSelectedIds((prev) => prev.filter((id) => id !== kostId));
    await fetch(`/api/proxy/kosts/${kostId}/favorite`, { method: "PATCH" }).catch(
      () => {},
    );
  }

  function toggleSelectCompare(kostId: number) {
    setSelectedIds((prev) => {
      if (prev.includes(kostId)) return prev.filter((id) => id !== kostId);
      if (prev.length >= 3) return prev;
      return [...prev, kostId];
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
            Properti Favorit Saya
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Simpan hunian pilihan dan bandingkan hingga 3 properti sekaligus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCompareMode((v) => !v);
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              compareMode
                ? "bg-gray-900 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <GitCompareArrows className="h-4 w-4" />
            {compareMode ? "Batal Bandingkan" : "Bandingkan Properti"}
          </button>

          {compareMode && selectedIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Lihat Perbandingan ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari di daftar favorit..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-base font-bold text-gray-800">
            Belum ada properti favorit
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Tekan ikon hati pada properti di halaman Jelajah untuk menyimpannya di sini.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Jelajah Hunian
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((k) => {
            const isSelected = selectedIds.includes(k.id);
            return (
              <div key={k.id} className="relative">
                {compareMode && (
                  <button
                    type="button"
                    onClick={() => toggleSelectCompare(k.id)}
                    className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>
                      {isSelected ? "Dipilih untuk dibandingkan" : "Pilih untuk bandingkan"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                  </button>
                )}
                <KostCard
                  kost={k}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            );
          })}
        </div>
      )}

      {showCompareModal && compareList.length >= 2 && (
        <CompareModal
          kosts={compareList}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
