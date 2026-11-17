import { HomeExplorer } from "@/components/HomeExplorer";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo";
import { API_BASE_URL } from "@/lib/server-api";
import type { Kost, KostFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchInitialData(): Promise<{
  kosts: Kost[];
  hasMore: boolean;
  filters: KostFilters;
}> {
  const emptyFilters: KostFilters = {
    cities: [],
    types: [],
    facilities: [],
    cityStats: [],
  };

  try {
    const [kostsRes, filtersRes] = await Promise.all([
      fetch(`${API_BASE_URL}/kosts?page=1&limit=12&sortBy=recommended`, {
        cache: "no-store",
      }),
      fetch(`${API_BASE_URL}/kosts/filters`, { cache: "no-store" }),
    ]);

    const kostsJson = kostsRes.ok ? await kostsRes.json() : { data: [], hasMore: false };
    const filtersJson = filtersRes.ok ? await filtersRes.json() : emptyFilters;

    const kosts: Kost[] = Array.isArray(kostsJson)
      ? kostsJson
      : kostsJson.data || [];
    const hasMore = Array.isArray(kostsJson)
      ? false
      : Boolean(kostsJson.hasMore);

    return { kosts, hasMore, filters: filtersJson };
  } catch {
    return { kosts: [], hasMore: false, filters: emptyFilters };
  }
}

export default async function HomePage() {
  const { kosts, hasMore, filters } = await fetchInitialData();
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
      />
    </>
  );
}
