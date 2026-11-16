"use client";

import { useState } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { Kost, KostFilters } from "@/lib/types";
import { KostCard } from "./KostCard";

interface HomeExplorerProps {
  initialKosts: Kost[];
  initialHasMore: boolean;
  filters: KostFilters;
}

const CATEGORIES = [
  { value: "SEMUA", label: "Semua" },
  { value: "KOST", label: "Kost" },
  { value: "APARTEMEN", label: "Apartemen" },
  { value: "KONTRAKAN", label: "Kontrakan" },
  { value: "HUNIAN_HARIAN", label: "Harian" },
];

const TYPES = ["Semua", "Putra", "Putri", "Campur"];

export function HomeExplorer({
  initialKosts,
  initialHasMore,
  filters,
}: HomeExplorerProps) {
  const [kosts, setKosts] = useState<Kost[]>(initialKosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("SEMUA");
  const [type, setType] = useState("Semua");
  const [city, setCity] = useState("Semua Kota");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchList(nextPage: number, append: boolean, overrides?: {
    search?: string;
    category?: string;
    type?: string;
    city?: string;
    sortBy?: string;
    onlyAvailable?: boolean;
    minPrice?: string;
    maxPrice?: string;
  }) {
    const qSearch = overrides?.search ?? search;
    const qCat = overrides?.category ?? category;
    const qType = overrides?.type ?? type;
    const qCity = overrides?.city ?? city;
    const qSort = overrides?.sortBy ?? sortBy;
    const qOnlyAvail = overrides?.onlyAvailable ?? onlyAvailable;
    const qMinPrice = overrides?.minPrice ?? minPrice;
    const qMaxPrice = overrides?.maxPrice ?? maxPrice;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "12",
        sortBy: qSort,
      });
      if (qSearch.trim()) params.set("search", qSearch.trim());
      if (qCat !== "SEMUA") params.set("propertyCategory", qCat);
      if (qType !== "Semua") params.set("type", qType);
      if (qCity !== "Semua Kota") params.set("city", qCity);
      if (qOnlyAvail) params.set("onlyAvailable", "true");
      if (qMinPrice.trim()) params.set("minPrice", qMinPrice.trim());
      if (qMaxPrice.trim()) params.set("maxPrice", qMaxPrice.trim());

      const res = await fetch(`/api/proxy/kosts?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const rows: Kost[] = Array.isArray(json) ? json : json.data || [];
      const more = Array.isArray(json) ? false : Boolean(json.hasMore);

      setKosts((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(more);
      setPage(nextPage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchList(1, false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero + Search */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 sm:p-10 text-white shadow-lg">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide">
            Cari Kost, Apartemen & Kontrakan Aman
          </span>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">
            Temukan Hunian Nyaman & Booking Langsung dengan Escrow
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-50">
            Dana booking aman ditahan Keyloka hingga Anda konfirmasi check-in. Kumpulkan poin di setiap transaksi.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kost, area, kampus, atau jalan..."
              className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800 transition"
          >
            Cari Hunian
          </button>
        </form>
      </section>

      {/* Filter Bar */}
      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCategory(c.value);
                fetchList(1, false, { category: c.value });
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                category === c.value
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                fetchList(1, false, { type: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  Tipe: {t}
                </option>
              ))}
            </select>
          </div>

          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              fetchList(1, false, { city: e.target.value });
            }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            <option value="Semua Kota">Semua Kota</option>
            {filters.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              fetchList(1, false, { sortBy: e.target.value });
            }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            <option value="recommended">Urutkan: Rekomendasi</option>
            <option value="price_asc">Harga Termurah</option>
            <option value="price_desc">Harga Termahal</option>
            <option value="rating_desc">Rating Tertinggi</option>
            <option value="newest">Terbaru</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchList(1, false);
              }}
              placeholder="Harga min (Rp)"
              className="w-32 sm:w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchList(1, false);
              }}
              placeholder="Harga maks (Rp)"
              className="w-32 sm:w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
            />
            <button
              type="button"
              onClick={() => fetchList(1, false)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Terapkan
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                const nextVal = e.target.checked;
                setOnlyAvailable(nextVal);
                fetchList(1, false, { onlyAvailable: nextVal });
              }}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Hanya Kamar Tersedia
          </label>

          {(search.trim() ||
            category !== "SEMUA" ||
            type !== "Semua" ||
            city !== "Semua Kota" ||
            sortBy !== "recommended" ||
            onlyAvailable ||
            minPrice.trim() ||
            maxPrice.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("SEMUA");
                setType("Semua");
                setCity("Semua Kota");
                setSortBy("recommended");
                setOnlyAvailable(false);
                setMinPrice("");
                setMaxPrice("");
                fetchList(1, false, {
                  search: "",
                  category: "SEMUA",
                  type: "Semua",
                  city: "Semua Kota",
                  sortBy: "recommended",
                  onlyAvailable: false,
                  minPrice: "",
                  maxPrice: "",
                });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      </section>

      {/* Grid Results */}
      <section className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        ) : kosts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-base font-bold text-gray-800">
              Tidak ada properti yang sesuai filter Anda.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Coba ubah kata kunci pencarian atau pilih kota lain.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {kosts.map((kost) => (
                <KostCard key={kost.id} kost={kost} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchList(page + 1, true)}
                  disabled={loadingMore}
                  className="rounded-xl border border-emerald-600 bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition"
                >
                  {loadingMore ? "Memuat..." : "Muat Lebih Banyak"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
