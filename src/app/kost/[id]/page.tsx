import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KostDetailClient } from "@/components/KostDetailClient";
import { API_BASE_URL, getServerToken, serverFetch } from "@/lib/server-api";
import { formatRupiah, getDisplayPrice, type Kost, type ReviewItem, type UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchKostDetail(id: string): Promise<Kost | null> {
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
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const kost = await fetchKostDetail(id);
  if (!kost) {
    return { title: "Properti Tidak Ditemukan — Keyloka" };
  }
  const price = getDisplayPrice(kost);
  return {
    title: `${kost.name} (${formatRupiah(price.amount)}${price.unit}) — Keyloka`,
    description: `${kost.propertyCategory} ${kost.type} di ${kost.district}, ${kost.city}. ${kost.description?.slice(0, 140)}`,
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

  const [reviewsRes, currentUser] = await Promise.all([
    fetch(`${API_BASE_URL}/reviews?kostId=${kost.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    getServerToken().then((t) =>
      t ? serverFetch<UserProfile>("/auth/me").catch(() => null) : null,
    ),
  ]);

  const reviews: ReviewItem[] = Array.isArray(reviewsRes) ? reviewsRes : [];

  return (
    <KostDetailClient
      kost={kost}
      reviews={reviews}
      currentUser={currentUser}
    />
  );
}
