import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/JsonLd";
import { KostDetailClient } from "@/components/KostDetailClient";
import { getKostHref, getSiteUrl, parseKostIdFromParam, toAbsoluteImageUrl, truncateDescription } from "@/lib/seo";
import { API_BASE_URL, getServerToken, serverFetch } from "@/lib/server-api";
import { formatCategoryLabel, formatRupiah, getDisplayPrice, type Kost, type ReviewItem, type UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const fetchKostDetail = cache(async (rawId: string): Promise<Kost | null> => {
  const id = parseKostIdFromParam(rawId);
  if (!/^\d+$/.test(id)) return null;
  try {
    const token = await getServerToken();
    const res = await fetch(`${API_BASE_URL}/kosts/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const kost = await fetchKostDetail(id);
  if (!kost) {
    return {
      title: "Properti Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const categoryLabel = formatCategoryLabel(kost.propertyCategory);
  const price = getDisplayPrice(kost);
  const title = `${kost.name} (${formatRupiah(price.amount)}${price.unit})`;
  const description = truncateDescription(
    `${categoryLabel} ${kost.type} di ${kost.district}, ${kost.city}. ${kost.description || ""}`,
  );
  const images = (kost.images || [])
    .map((img) => toAbsoluteImageUrl(img))
    .filter((url): url is string => Boolean(url));
  const canonicalPath = getKostHref(kost);

  return {
    title,
    description,
    keywords: [
      kost.name,
      `${categoryLabel} ${kost.city}`,
      `${categoryLabel} ${kost.district}`,
      `${categoryLabel} ${kost.type}`,
      "sewa kost",
      "Keyloka",
    ],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: canonicalPath,
      title,
      description,
      ...(images.length > 0 ? { images: images.slice(0, 4).map((url) => ({ url })) } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images.length > 0 ? { images: [images[0]] } : {}),
    },
  };
}

export default async function KostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kost = await fetchKostDetail(id);
  if (!kost) notFound();

  const categoryParam = kost.propertyCategory || "KOST";

  const [reviewsRes, currentUser, recRes] = await Promise.all([
    fetch(`${API_BASE_URL}/reviews?kostId=${kost.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    getServerToken().then((t) =>
      t ? serverFetch<UserProfile>("/auth/me").catch(() => null) : null,
    ),
    fetch(
      `${API_BASE_URL}/kosts?propertyCategory=${encodeURIComponent(categoryParam)}&sortBy=recommended&page=1&limit=12`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] })),
  ]);

  const reviews: ReviewItem[] = Array.isArray(reviewsRes) ? reviewsRes : [];
  const rawRecs: Kost[] = Array.isArray(recRes) ? recRes : recRes?.data || [];
  const currentCity = (kost.city || "").trim().toLowerCase();
  const recommendedKosts = rawRecs
    .filter((item) => item?.id && item.id !== kost.id)
    .sort((a, b) => {
      const aSameCity = (a.city || "").trim().toLowerCase() === currentCity ? 1 : 0;
      const bSameCity = (b.city || "").trim().toLowerCase() === currentCity ? 1 : 0;
      return bSameCity - aSameCity;
    })
    .slice(0, 4);
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${getKostHref(kost)}`;
  const price = getDisplayPrice(kost);
  const images = (kost.images || [])
    .map((img) => toAbsoluteImageUrl(img))
    .filter((url): url is string => Boolean(url));

  const lodgingJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: kost.name,
    description: truncateDescription(kost.description, 300),
    url: pageUrl,
    ...(images.length > 0 ? { image: images } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: kost.address,
      addressLocality: kost.district,
      addressRegion: kost.city,
      addressCountry: "ID",
    },
    ...(kost.latitude && kost.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: kost.latitude,
            longitude: kost.longitude,
          },
        }
      : {}),
    priceRange: `${formatRupiah(price.amount)}${price.unit}`,
    makesOffer: {
      "@type": "Offer",
      price: price.amount,
      priceCurrency: "IDR",
      availability:
        kost.availableRooms > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: pageUrl,
    },
    ...(kost.reviewCount > 0 && kost.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: kost.rating,
            reviewCount: kost.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: kost.city,
        item: `${siteUrl}/?city=${encodeURIComponent(kost.city)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: kost.name,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[lodgingJsonLd, breadcrumbJsonLd]} />
      <KostDetailClient
        kost={kost}
        reviews={reviews}
        currentUser={currentUser}
        recommendedKosts={recommendedKosts}
      />
    </>
  );
}
