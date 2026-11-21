import { HomeExplorer } from "@/components/HomeExplorer";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo";
import { API_BASE_URL, getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost, KostFilters, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function stripCityPrefix(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
    .trim();
}

function matchAvailableCity(
  userCity: string,
  availableCities: string[],
): string | null {
  const trimmed = userCity.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const exact = availableCities.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  const cleanUser = stripCityPrefix(trimmed);
  if (!cleanUser) return null;

  return (
    availableCities.find((c) => stripCityPrefix(c) === cleanUser) ?? null
  );
}

async function fetchKostList(params: URLSearchParams): Promise<{
  kosts: Kost[];
  hasMore: boolean;
}> {
  const res = await fetch(`${API_BASE_URL}/kosts?${params.toString()}`, {
    cache: "no-store",
  });
  const json = res.ok ? await res.json() : { data: [], hasMore: false };
  const kosts: Kost[] = Array.isArray(json) ? json : json.data || [];
  const hasMore = Array.isArray(json) ? false : Boolean(json.hasMore);
  return { kosts, hasMore };
}

async function fetchInitialData(): Promise<{
  kosts: Kost[];
  hasMore: boolean;
  filters: KostFilters;
  initialStayMode: "LONG_TERM" | "HUNIAN_HARIAN";
  initialCategory: string;
  initialCity: string;
  personalizedCity: string | null;
  unavailableUserCity: string | null;
}> {
  const emptyFilters: KostFilters = {
    cities: [],
    types: [],
    facilities: [],
    cityStats: [],
  };

  try {
    const token = await getServerToken();
    const [filtersRes, user] = await Promise.all([
      fetch(`${API_BASE_URL}/kosts/filters`, { cache: "no-store" }),
      token
        ? serverFetch<UserProfile>("/auth/me").catch(() => null)
        : Promise.resolve(null),
    ]);

    const filtersJson: KostFilters = filtersRes.ok
      ? await filtersRes.json()
      : emptyFilters;

    let initialStayMode: "LONG_TERM" | "HUNIAN_HARIAN" = "LONG_TERM";
    let initialCategory = "SEMUA";
    let initialCity = "Semua Kota";
    let personalizedCity: string | null = null;
    let unavailableUserCity: string | null = null;

    const rawPrefCategory = (user?.preferredCategory || "")
      .trim()
      .toUpperCase();
    if (rawPrefCategory === "HUNIAN_HARIAN") {
      initialStayMode = "HUNIAN_HARIAN";
      initialCategory = "SEMUA";
    } else if (
      rawPrefCategory === "KOST" ||
      rawPrefCategory === "KONTRAKAN" ||
      rawPrefCategory === "APARTEMEN"
    ) {
      initialStayMode = "LONG_TERM";
      initialCategory = rawPrefCategory;
    }

    const rawUserCity = (user?.city || "").trim();
    if (rawUserCity) {
      const matched = matchAvailableCity(
        rawUserCity,
        filtersJson.cities || [],
      );
      if (matched) {
        initialCity = matched;
        personalizedCity = matched;
      } else {
        initialCity = "Semua Kota";
        unavailableUserCity = rawUserCity;
      }
    }

    const buildQuery = (opts: {
      city: string;
      stayMode: "LONG_TERM" | "HUNIAN_HARIAN";
      category: string;
    }) => {
      const params = new URLSearchParams({
        page: "1",
        limit: "12",
        sortBy: "recommended",
      });
      if (opts.city !== "Semua Kota") {
        params.set("city", opts.city);
      }
      if (opts.stayMode === "HUNIAN_HARIAN") {
        params.set("propertyCategory", "HUNIAN_HARIAN");
      } else if (opts.category !== "SEMUA") {
        params.set("propertyCategory", opts.category);
      }
      return params;
    };

    let { kosts, hasMore } = await fetchKostList(
      buildQuery({
        city: initialCity,
        stayMode: initialStayMode,
        category: initialCategory,
      }),
    );

    // Fallback 1: Jika kota pilihan ada tetapi untuk kategori spesifik tersebut kosong, tampilkan semua kategori di kota tersebut
    if (
      kosts.length === 0 &&
      (initialStayMode === "HUNIAN_HARIAN" || initialCategory !== "SEMUA")
    ) {
      initialStayMode = "LONG_TERM";
      initialCategory = "SEMUA";
      const retryCityOnly = await fetchKostList(
        buildQuery({
          city: initialCity,
          stayMode: initialStayMode,
          category: initialCategory,
        }),
      );
      kosts = retryCityOnly.kosts;
      hasMore = retryCityOnly.hasMore;
    }

    // Fallback 2: Jika masih kosong untuk kota tersebut, tampilkan semua kota agar halaman tidak kosong
    if (kosts.length === 0 && initialCity !== "Semua Kota") {
      unavailableUserCity = initialCity;
      personalizedCity = null;
      initialCity = "Semua Kota";
      const retryAll = await fetchKostList(
        buildQuery({
          city: "Semua Kota",
          stayMode: "LONG_TERM",
          category: "SEMUA",
        }),
      );
      kosts = retryAll.kosts;
      hasMore = retryAll.hasMore;
    }

    return {
      kosts,
      hasMore,
      filters: filtersJson,
      initialStayMode,
      initialCategory,
      initialCity,
      personalizedCity,
      unavailableUserCity,
    };
  } catch {
    return {
      kosts: [],
      hasMore: false,
      filters: emptyFilters,
      initialStayMode: "LONG_TERM",
      initialCategory: "SEMUA",
      initialCity: "Semua Kota",
      personalizedCity: null,
      unavailableUserCity: null,
    };
  }
}

export default async function HomePage() {
  const {
    kosts,
    hasMore,
    filters,
    initialStayMode,
    initialCategory,
    initialCity,
    personalizedCity,
    unavailableUserCity,
  } = await fetchInitialData();
  const siteUrl = getSiteUrl();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
      logo: `${siteUrl}/images/keyloka_logo_full.png`,
      description: DEFAULT_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <HomeExplorer
        initialKosts={kosts}
        initialHasMore={hasMore}
        filters={filters}
        initialStayMode={initialStayMode}
        initialCategory={initialCategory}
        initialCity={initialCity}
        personalizedCity={personalizedCity}
        unavailableUserCity={unavailableUserCity}
      />
    </>
  );
}
