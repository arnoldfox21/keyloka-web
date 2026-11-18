import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeExplorer } from "@/components/HomeExplorer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";
import { API_BASE_URL } from "@/lib/server-api";
import type { Kost, KostFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<string, { apiValue: string; label: string }> = {
  kost: { apiValue: "KOST", label: "Kost" },
  apartemen: { apiValue: "APARTEMEN", label: "Apartemen" },
  kontrakan: { apiValue: "KONTRAKAN", label: "Kontrakan" },
  villa: { apiValue: "HUNIAN_HARIAN", label: "Villa & Homestay" },
  homestay: { apiValue: "HUNIAN_HARIAN", label: "Homestay & Villa" },
};

function parseSewaSlug(rawSlug: string, availableCities: string[]) {
  const slug = rawSlug.toLowerCase().trim();
  const parts = slug.split("-").filter(Boolean);
  if (parts.length === 0) return null;

  const catEntry = CATEGORY_MAP[parts[0]];
  let propertyCategory = "KOST";
  let categoryLabel = "Hunian";
  let cityParts = parts;

  if (catEntry) {
    propertyCategory = catEntry.apiValue;
    categoryLabel = catEntry.label;
    cityParts = parts.slice(1);
  } else {
    categoryLabel = "Kost & Hunian";
  }

  let matchedCity = "";
  if (cityParts.length > 0) {
    const cityQuery = cityParts.join(" ");
    const exact = availableCities.find(
      (c) => c.toLowerCase() === cityQuery,
    );
    const partial = availableCities.find((c) =>
      c.toLowerCase().includes(cityQuery),
    );
    matchedCity =
      exact ||
      partial ||
      cityParts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  return {
    slug,
    propertyCategory,
    categoryLabel,
    city: matchedCity,
  };
}

async function fetchFilters(): Promise<KostFilters> {
  try {
    const res = await fetch(`${API_BASE_URL}/kosts/filters`, { cache: "no-store" });
    if (!res.ok) return { cities: [], types: [], facilities: [], cityStats: [] };
    return await res.json();
  } catch {
    return { cities: [], types: [], facilities: [], cityStats: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const filters = await fetchFilters();
  const parsed = parseSewaSlug(slug, filters.cities || []);
  if (!parsed) {
    return { title: "Hunian Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const locationText = parsed.city ? ` di ${parsed.city}` : " di Indonesia";
  const title = `Sewa ${parsed.categoryLabel}${locationText} Aman & Terverifikasi`;
  const description = `Temukan pilihan ${parsed.categoryLabel.toLowerCase()}${locationText}. Tanya ketersediaan gratis, survei mudah, dan booking aman dengan sistem Escrow di ${SITE_NAME}.`;
  const canonical = `/sewa/${parsed.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function SewaLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filters = await fetchFilters();
  const parsed = parseSewaSlug(slug, filters.cities || []);
  if (!parsed) notFound();

  const qs = new URLSearchParams({
    page: "1",
    limit: "12",
    sortBy: "recommended",
    propertyCategory: parsed.propertyCategory,
  });
  if (parsed.city) {
    qs.set("city", parsed.city);
  }

  let kosts: Kost[] = [];
  let hasMore = false;
  try {
    const res = await fetch(`${API_BASE_URL}/kosts?${qs.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      kosts = Array.isArray(json) ? json : json.data || [];
      hasMore = Array.isArray(json) ? false : Boolean(json.hasMore);
    }
  } catch {
    kosts = [];
  }

  const siteUrl = getSiteUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: parsed.city
          ? `${parsed.categoryLabel} ${parsed.city}`
          : parsed.categoryLabel,
        item: `${siteUrl}/sewa/${parsed.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HomeExplorer
        initialKosts={kosts}
        initialHasMore={hasMore}
        filters={filters}
      />
    </>
  );
}
