"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  CalendarCheck,
  ChevronDown,
  Clock,
  GitCompareArrows,
  History,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { Kost, KostFilters, MapPoint } from "@/lib/types";
import { CompareModal } from "./CompareModal";
import { KostCard } from "./KostCard";
import { KostMapSearchView } from "./KostMapSearchView";
import { FacilityIcon } from "./FacilityIcon";

interface HomeExplorerProps {
  initialKosts: Kost[];
  initialHasMore: boolean;
  filters: KostFilters;
  initialStayMode?: "LONG_TERM" | "HUNIAN_HARIAN";
  initialDailySub?: string;
  initialCategory?: string;
  initialCity?: string;
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
const MALANG_POPULAR_AREAS = [
  "UB",
  "UM",
  "UIN",
  "Polinema",
  "UMM",
  "Ijen",
  "Sawojajar",
];
const DEFAULT_POPULAR_AREAS: Array<{ label: string; comingSoon?: boolean }> = [
  { label: "Malang" },
  { label: "Jakarta", comingSoon: true },
  { label: "Bandung", comingSoon: true },
  { label: "Yogyakarta", comingSoon: true },
  { label: "Surabaya", comingSoon: true },
  { label: "Bali", comingSoon: true },
];

const HISTORY_KEY = "keyloka_search_history";
const RECENT_KEY = "keyloka_recently_viewed";

export function HomeExplorer({
  initialKosts,
  initialHasMore,
  filters,
  initialStayMode = "LONG_TERM",
  initialDailySub = "ALL_DAILY",
  initialCategory = "SEMUA",
  initialCity = "Semua Kota",
}: HomeExplorerProps) {
  const router = useRouter();
  const [kosts, setKosts] = useState<Kost[]>(initialKosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);

  const [stayMode, setStayMode] = useState<"LONG_TERM" | "HUNIAN_HARIAN">(initialStayMode);
  const [dailySub, setDailySub] = useState(initialDailySub);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState("Semua");
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState("Semua Area");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<"LIST" | "MAP">("LIST");
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const activeAdvancedCount =
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    selectedFacilities.length;

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Kost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const districtsForCity = useMemo(() => {
    if (city === "Semua Kota") return [];
    const stat = filters.cityStats?.find(
      (c) => c.city.toLowerCase() === city.toLowerCase(),
    );
    return stat?.districts || [];
  }, [city, filters.cityStats]);

  const cityOptions = useMemo(() => {
    if (city === "Semua Kota" || filters.cities.includes(city)) {
      return filters.cities;
    }
    return [city, ...filters.cities];
  }, [city, filters.cities]);

  const popularAreaChips = useMemo(() => {
    if (city.toLowerCase().includes("malang")) {
      return MALANG_POPULAR_AREAS.map((label) => ({ label, comingSoon: false }));
    }
    return DEFAULT_POPULAR_AREAS;
  }, [city]);

  const compareList = useMemo(
    () => kosts.filter((k) => compareIds.includes(k.id)),
    [kosts, compareIds],
  );

  function toggleCompare(kostId: number) {
    setCompareIds((prev) => {
      if (prev.includes(kostId)) return prev.filter((id) => id !== kostId);
      if (prev.length >= 3) return prev;
      return [...prev, kostId];
    });
  }

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

  type FilterOverrides = {
    stayMode?: "LONG_TERM" | "HUNIAN_HARIAN";
    dailySub?: string;
    search?: string;
    category?: string;
    type?: string;
    city?: string;
    district?: string;
    sortBy?: string;
    onlyAvailable?: boolean;
    minPrice?: string;
    maxPrice?: string;
    facilities?: string[];
  };

  function buildFilterParams(overrides?: FilterOverrides) {
    const qMode = overrides?.stayMode ?? stayMode;
    const qDailySub = overrides?.dailySub ?? dailySub;
    const qSearch = overrides?.search ?? search;
    const qCat = overrides?.category ?? category;
    const qType = overrides?.type ?? type;
    const qCity = overrides?.city ?? city;
    const qDistrict = overrides?.district ?? district;
    const qSort = overrides?.sortBy ?? sortBy;
    const qOnlyAvail = overrides?.onlyAvailable ?? onlyAvailable;
    const qMinPrice = overrides?.minPrice ?? minPrice;
    const qMaxPrice = overrides?.maxPrice ?? maxPrice;
    const qFacs = overrides?.facilities ?? selectedFacilities;

    const params = new URLSearchParams({ sortBy: qSort });
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
    if (qDistrict !== "Semua Area") params.set("district", qDistrict);
    if (qOnlyAvail) params.set("onlyAvailable", "true");
    if (qMinPrice.trim()) params.set("minPrice", qMinPrice.trim());
    if (qMaxPrice.trim()) params.set("maxPrice", qMaxPrice.trim());
    if (qFacs.length > 0) params.set("facilities", qFacs.join(","));
    return params;
  }

  async function fetchMapPoints(overrides?: FilterOverrides) {
    setLoadingMap(true);
    try {
      const params = buildFilterParams(overrides);
      const res = await fetch(`/api/proxy/kosts/map-points?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setMapPoints(Array.isArray(json) ? json : json.data || []);
    } finally {
      setLoadingMap(false);
    }
  }

  async function fetchList(
    nextPage: number,
    append: boolean,
    overrides?: FilterOverrides,
  ) {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = buildFilterParams(overrides);
      params.set("page", String(nextPage));
      params.set("limit", "12");

      const res = await fetch(`/api/proxy/kosts?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const rows: Kost[] = Array.isArray(json) ? json : json.data || [];
      const more = Array.isArray(json) ? false : Boolean(json.hasMore);

      setKosts((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(more);
      setPage(nextPage);

      if (!append && viewMode === "MAP") {
        void fetchMapPoints(overrides);
      }
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
    setDistrict("Semua Area");
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
      district: "Semua Area",
      sortBy: "recommended",
      onlyAvailable: false,
      minPrice: "",
      maxPrice: "",
      facilities: [],
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* Hero + Search */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 p-5 sm:p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
              Cari Kost, Apartemen, Kontrakan, Villa & Homestay
            </span>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Temukan Hunian Nyaman — Survei Mudah, Booking Aman
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
              Booking kost, apartemen, kontrakan, hingga villa dan homestay dengan
              proses transparan. Kumpulkan poin di setiap transaksi.
            </p>
          </div>

          {/* 2-Mode Switch matching Flutter */}
          <div className="inline-flex self-start rounded-2xl border border-white/15 bg-black/25 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setStayMode("LONG_TERM");
                setCategory("SEMUA");
                fetchList(1, false, { stayMode: "LONG_TERM", category: "SEMUA" });
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
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
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                stayMode === "HUNIAN_HARIAN"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-white/90 hover:text-white"
              }`}
            >
              Harian (Villa & Homestay)
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="relative mt-4 flex flex-col sm:flex-row gap-2.5 rounded-2xl bg-white/10 p-2 backdrop-blur-md border border-white/15"
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
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
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
          {popularAreaChips.map((chip) =>
            chip.comingSoon ? (
              <button
                key={chip.label}
                type="button"
                disabled
                title={`${chip.label} — Coming Soon`}
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/60"
              >
                <span>{chip.label}</span>
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-200">
                  Coming Soon
                </span>
              </button>
            ) : (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSearch(chip.label);
                  saveSearchTerm(chip.label);
                  fetchList(1, false, { search: chip.label });
                }}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 transition"
              >
                {chip.label}
              </button>
            ),
          )}
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

      {/* Trust Value Strip */}
      <section className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-gray-900">Transaksi Aman</p>
            <p className="truncate text-[11px] text-gray-500">Terverifikasi & transparan</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-gray-900">Survei Terjadwal</p>
            <p className="truncate text-[11px] text-gray-500">Cek lokasi sebelum sewa</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Award className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-gray-900">Poin Loyalti</p>
            <p className="truncate text-[11px] text-gray-500">Potongan tiap booking</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-gray-900">Chat & Grup</p>
            <p className="truncate text-[11px] text-gray-500">Terhubung dgn penghuni</p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="mt-4 flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {stayMode === "LONG_TERM" ? (
              <>
                {LONG_TERM_CATEGORIES.map((c) => (
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
                <span className="h-4 w-px bg-gray-200 mx-0.5 hidden sm:inline-block" />
                {DAILY_SUBCATEGORIES.filter((c) => c.value !== "ALL_DAILY").map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setStayMode("HUNIAN_HARIAN");
                      setDailySub(c.value);
                      fetchList(1, false, {
                        stayMode: "HUNIAN_HARIAN",
                        dailySub: c.value,
                      });
                    }}
                    className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    {c.label}
                  </button>
                ))}
              </>
            ) : (
              DAILY_SUBCATEGORIES.map((c) => (
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
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                showAdvancedFilters || activeAdvancedCount > 0
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter Lanjutan
              {activeAdvancedCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {activeAdvancedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                fetchList(1, false, { type: e.target.value });
              }}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  Tipe: {t}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>

          <div className="relative">
            <select
              value={city}
              onChange={(e) => {
                const nextCity = e.target.value;
                setCity(nextCity);
                setDistrict("Semua Area");
                fetchList(1, false, { city: nextCity, district: "Semua Area" });
              }}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
            >
              <option value="Semua Kota">Semua Kota</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>

          {districtsForCity.length > 0 && (
            <div className="relative">
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  fetchList(1, false, { district: e.target.value });
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
              >
                <option value="Semua Area">Semua Area</option>
                {districtsForCity.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.district} ({d.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          )}

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                fetchList(1, false, { sortBy: e.target.value });
              }}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
            >
              <option value="recommended">Urutkan: Rekomendasi</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="rating_desc">Rating Tertinggi</option>
              <option value="newest">Terbaru</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

            {filters.facilities && filters.facilities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500 mr-1">
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
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <FacilityIcon name={fac} className="h-3 w-3 shrink-0" />
                      {fac}
                    </button>
                  );
                })}
              </div>
            )}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewed.slice(0, 3).map((k) => (
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
      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "LIST"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Daftar
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("MAP");
                void fetchMapPoints();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "MAP"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Peta
            </button>
          </div>

          {viewMode === "LIST" && kosts.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2">
              {compareMode && compareIds.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setShowCompareModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Bandingkan ({compareIds.length}/3)
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCompareMode((v) => !v);
                  setCompareIds([]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                  compareMode
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                {compareMode ? "Batal Bandingkan" : "Bandingkan"}
              </button>
            </div>
          )}
        </div>

        {viewMode === "MAP" ? (
          <KostMapSearchView points={mapPoints} loading={loadingMap} />
        ) : loading ? (
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
              {kosts.map((k) => {
                const isSelected = compareIds.includes(k.id);
                return (
                  <div key={k.id} className="relative">
                    {compareMode && (
                      <button
                        type="button"
                        onClick={() => toggleCompare(k.id)}
                        className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>
                          {isSelected ? "Dipilih untuk dibandingkan" : "Pilih bandingkan"}
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                      </button>
                    )}
                    <KostCard kost={k} onToggleFavorite={handleToggleFavorite} />
                  </div>
                );
              })}
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

      {/* Promotional Web Banner */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://media.keyloka.com/web/banner-web.webp"
          alt="Keyloka — Platform Cari Kost, Apartemen, Kontrakan, Villa & Homestay Aman dengan Escrow"
          className="block w-full h-auto object-cover"
          loading="lazy"
        />
      </section>

      {/* Owner Acquisition CTA */}
      <section className="mt-6 flex flex-col justify-between gap-5 rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50/70 p-6 shadow-xs sm:flex-row sm:items-center sm:p-8">
        <div className="max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
            <Building2 className="h-3.5 w-3.5" />
            Untuk Pemilik Properti
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900">
            Punya Kost, Kontrakan, Villa, atau Homestay?
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-gray-600">
            Pasang iklan properti Anda gratis di Keyloka dan jangkau ribuan calon penyewa potensial.
            Kelola pertanyaan ketersediaan, survei, booking, dan chat langsung dari satu dashboard.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link
            href="/gabung-pemilik"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Pelajari Benefit
          </Link>
          <Link
            href="/dashboard/new-property"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <span>Pasang Iklan Properti</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {showCompareModal && compareList.length >= 2 && (
        <CompareModal
          kosts={compareList}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
