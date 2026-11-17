"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Clock,
  History,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { Kost, KostFilters } from "@/lib/types";
import { KostCard } from "./KostCard";

interface HomeExplorerProps {
  initialKosts: Kost[];
  initialHasMore: boolean;
  filters: KostFilters;
}

const LONG_TERM_CATEGORIES = [
  { value: "SEMUA", label: "Semua" },
  { value: "KOST", label: "Kost" },
  { value: "APARTEMEN", label: "Apartemen" },
  { value: "KONTRAKAN", label: "Kontrakan" },
];

const DAILY_SUBCATEGORIES = [
  { value: "ALL_DAILY", label: "Semua Harian" },
  { value: "VILLA", label: "Villa" },
  { value: "HOMESTAY", label: "Homestay" },
];

const TYPES = ["Semua", "Putra", "Putri", "Campur"];
const CAMPUS_TAGS = ["UB", "UM", "UIN", "Polinema", "UMM", "Ijen", "Sawojajar"];

const HISTORY_KEY = "keyloka_search_history";
const RECENT_KEY = "keyloka_recently_viewed";

export function HomeExplorer({
  initialKosts,
  initialHasMore,
  filters,
}: HomeExplorerProps) {
  const router = useRouter();
  const [kosts, setKosts] = useState<Kost[]>(initialKosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);

  const [stayMode, setStayMode] = useState<"LONG_TERM" | "HUNIAN_HARIAN">("LONG_TERM");
  const [dailySub, setDailySub] = useState("ALL_DAILY");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("SEMUA");
  const [type, setType] = useState("Semua");
  const [city, setCity] = useState("Semua Kota");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Kost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        if (Array.isArray(hist)) setSearchHistory(hist.slice(0, 6));
        const rec = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        if (Array.isArray(rec)) setRecentlyViewed(rec.slice(0, 6));
      } catch {
        // ignore storage errors
      }
    });
  }, []);

  function saveSearchTerm(term: string) {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const next = [clean, ...prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        6,
      );
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function fetchList(
    nextPage: number,
    append: boolean,
    overrides?: {
      stayMode?: "LONG_TERM" | "HUNIAN_HARIAN";
      dailySub?: string;
      search?: string;
      category?: string;
      type?: string;
      city?: string;
      sortBy?: string;
      onlyAvailable?: boolean;
      minPrice?: string;
      maxPrice?: string;
      facilities?: string[];
    },
  ) {
    const qMode = overrides?.stayMode ?? stayMode;
    const qDailySub = overrides?.dailySub ?? dailySub;
    const qSearch = overrides?.search ?? search;
    const qCat = overrides?.category ?? category;
    const qType = overrides?.type ?? type;
    const qCity = overrides?.city ?? city;
    const qSort = overrides?.sortBy ?? sortBy;
    const qOnlyAvail = overrides?.onlyAvailable ?? onlyAvailable;
    const qMinPrice = overrides?.minPrice ?? minPrice;
    const qMaxPrice = overrides?.maxPrice ?? maxPrice;
    const qFacs = overrides?.facilities ?? selectedFacilities;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "12",
        sortBy: qSort,
      });

      const effectiveSearch =
        qMode === "HUNIAN_HARIAN" && qDailySub !== "ALL_DAILY" && !qSearch.trim()
          ? qDailySub
          : qSearch.trim();

      if (effectiveSearch) params.set("search", effectiveSearch);

      if (qMode === "HUNIAN_HARIAN") {
        params.set("propertyCategory", "HUNIAN_HARIAN");
      } else if (qCat !== "SEMUA") {
        params.set("propertyCategory", qCat);
      }

      if (qType !== "Semua") params.set("type", qType);
      if (qCity !== "Semua Kota") params.set("city", qCity);
      if (qOnlyAvail) params.set("onlyAvailable", "true");
      if (qMinPrice.trim()) params.set("minPrice", qMinPrice.trim());
      if (qMaxPrice.trim()) params.set("maxPrice", qMaxPrice.trim());
      if (qFacs.length > 0) params.set("facilities", qFacs.join(","));

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
    saveSearchTerm(search);
    fetchList(1, false);
  }

  async function handleToggleFavorite(kostId: number) {
    setKosts((prev) =>
      prev.map((k) => (k.id === kostId ? { ...k, isFavorite: !k.isFavorite } : k)),
    );
    try {
      const res = await fetch(`/api/proxy/kosts/${kostId}/favorite`, {
        method: "PATCH",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setKosts((prev) =>
          prev.map((k) => (k.id === kostId ? { ...k, isFavorite: !k.isFavorite } : k)),
        );
      }
    } catch {
      setKosts((prev) =>
        prev.map((k) => (k.id === kostId ? { ...k, isFavorite: !k.isFavorite } : k)),
      );
    }
  }

  function handleReset() {
    setStayMode("LONG_TERM");
    setDailySub("ALL_DAILY");
    setSearch("");
    setCategory("SEMUA");
    setType("Semua");
    setCity("Semua Kota");
    setSortBy("recommended");
    setOnlyAvailable(false);
    setMinPrice("");
    setMaxPrice("");
    setSelectedFacilities([]);
    fetchList(1, false, {
      stayMode: "LONG_TERM",
      dailySub: "ALL_DAILY",
      search: "",
      category: "SEMUA",
      type: "Semua",
      city: "Semua Kota",
      sortBy: "recommended",
      onlyAvailable: false,
      minPrice: "",
      maxPrice: "",
      facilities: [],
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero + Search */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 sm:p-10 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide">
              Cari Kost, Apartemen, Kontrakan & Villa Aman
            </span>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">
              Temukan Hunian Nyaman & Booking Langsung dengan Escrow
            </h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-50">
              Dana booking aman ditahan Keyloka hingga Anda konfirmasi check-in. Kumpulkan poin di setiap transaksi.
            </p>
          </div>

          {/* 2-Mode Switch matching Flutter */}
          <div className="inline-flex self-start rounded-2xl bg-black/20 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                setStayMode("LONG_TERM");
                setCategory("SEMUA");
                fetchList(1, false, { stayMode: "LONG_TERM", category: "SEMUA" });
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                stayMode === "LONG_TERM"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-white/90 hover:text-white"
              }`}
            >
              Jangka Panjang
            </button>
            <button
              type="button"
              onClick={() => {
                setStayMode("HUNIAN_HARIAN");
                setDailySub("ALL_DAILY");
                fetchList(1, false, {
                  stayMode: "HUNIAN_HARIAN",
                  dailySub: "ALL_DAILY",
                });
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                stayMode === "HUNIAN_HARIAN"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-white/90 hover:text-white"
              }`}
            >
              Hunian Harian
            </button>
          </div>
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

        {/* Campus & Search History Quick Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-100">
            <Sparkles className="h-3 w-3" />
            Area Populer:
          </span>
          {CAMPUS_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSearch(tag);
                saveSearchTerm(tag);
                fetchList(1, false, { search: tag });
              }}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 transition"
            >
              {tag}
            </button>
          ))}
          {searchHistory.length > 0 && (
            <>
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-100">
                <History className="h-3 w-3" />
                Riwayat:
              </span>
              {searchHistory.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setSearch(h);
                    fetchList(1, false, { search: h });
                  }}
                  className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white hover:bg-black/30 transition"
                >
                  {h}
                </button>
              ))}
            </>
          )}
        </div>
      </section>

      {/* Filter Bar */}
      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {stayMode === "LONG_TERM"
              ? LONG_TERM_CATEGORIES.map((c) => (
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
                ))
              : DAILY_SUBCATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setDailySub(c.value);
                      fetchList(1, false, { dailySub: c.value });
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      dailySub === c.value
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              fetchList(1, false, { type: e.target.value });
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                Tipe: {t}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              fetchList(1, false, { city: e.target.value });
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
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
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
          >
            <option value="recommended">Urutkan: Rekomendasi</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="rating_desc">Rating Tertinggi</option>
            <option value="newest">Terbaru</option>
          </select>

          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => fetchList(1, false)}
            placeholder="Harga Min (Rp)"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
          />

          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => fetchList(1, false)}
            placeholder="Harga Max (Rp)"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
          />

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                setOnlyAvailable(e.target.checked);
                fetchList(1, false, { onlyAvailable: e.target.checked });
              }}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Tersedia Saja
          </label>
        </div>

        {/* Facility Chips */}
        {filters.facilities && filters.facilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Fasilitas:
            </span>
            {filters.facilities.slice(0, 12).map((fac) => {
              const active = selectedFacilities.includes(fac);
              return (
                <button
                  key={fac}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? selectedFacilities.filter((f) => f !== fac)
                      : [...selectedFacilities, fac];
                    setSelectedFacilities(next);
                    fetchList(1, false, { facilities: next });
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {fac}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Recently Viewed Strip */}
      {recentlyViewed.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-gray-900">Baru Saja Dilihat</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.slice(0, 4).map((k) => (
              <KostCard
                key={`recent-${k.id}`}
                kost={k}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Results */}
      <section className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        ) : kosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-base font-bold text-gray-800">
              Tidak ada properti yang cocok dengan filter Anda
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Coba ubah kata kunci pencarian atau reset filter untuk melihat pilihan lain.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {kosts.map((k) => (
                <KostCard
                  key={k.id}
                  kost={k}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchList(page + 1, true)}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-800 shadow-xs hover:bg-gray-50 disabled:opacity-50"
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
