import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
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

  let dailySub = "ALL_DAILY";
  if (catEntry) {
    propertyCategory = catEntry.apiValue;
    categoryLabel = catEntry.label;
    if (parts[0] === "villa") dailySub = "VILLA";
    else if (parts[0] === "homestay") dailySub = "HOMESTAY";
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
    dailySub,
    categoryLabel,
    city: matchedCity,
  };
}

function isSupportedActiveCity(city: string): boolean {
  if (!city) return true;
  return city.toLowerCase().includes("malang");
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

  if (parsed.city && !isSupportedActiveCity(parsed.city)) {
    const title = `Sewa ${parsed.categoryLabel} di ${parsed.city} — Coming Soon`;
    const description = `Layanan pencarian ${parsed.categoryLabel.toLowerCase()} di ${parsed.city} akan segera hadir di ${SITE_NAME}. Saat ini ${SITE_NAME} berfokus melayani area Malang dan sekitarnya.`;
    return {
      title,
      description,
      robots: { index: false, follow: false },
    };
  }

  const locationText = parsed.city ? ` di ${parsed.city}` : " di Malang";
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

  if (parsed.city && !isSupportedActiveCity(parsed.city)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-8 sm:p-10 text-center text-white shadow-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Coming Soon
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight">
            Sewa {parsed.categoryLabel} di {parsed.city} Segera Hadir
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/90">
            Saat ini {SITE_NAME} sedang berfokus menghadirkan hunian terverifikasi di area Malang
            dan sekitarnya. Area {parsed.city} akan segera menyusul dalam ekspansi berikutnya.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sewa/kost-malang"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-sm hover:bg-emerald-50 transition"
            >
              <MapPin className="h-4 w-4" />
              Jelajahi Hunian di Malang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  const isDailyStay = parsed.propertyCategory === "HUNIAN_HARIAN";

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HomeExplorer
        initialKosts={kosts}
        initialHasMore={hasMore}
        filters={filters}
        initialStayMode={isDailyStay ? "HUNIAN_HARIAN" : "LONG_TERM"}
        initialDailySub={isDailyStay ? parsed.dailySub : "ALL_DAILY"}
        initialCategory={isDailyStay ? "SEMUA" : parsed.propertyCategory}
        initialCity={parsed.city || "Semua Kota"}
      />
    </>
  );
}
