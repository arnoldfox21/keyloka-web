import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost } from "@/lib/types";
import { FavoritesClient } from "@/components/FavoritesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Favorit Saya");

export default async function FavoritesPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const kosts: Kost[] = [];
  try {
    let page = 1;
    while (page <= 10) {
      const res = await serverFetch<
        Kost[] | { data: Kost[]; hasMore?: boolean }
      >(`/kosts?page=${page}&limit=100`);
      const list = Array.isArray(res) ? res : res.data || [];
      kosts.push(...list.filter((k) => Boolean(k.isFavorite)));
      const hasMore = Array.isArray(res)
        ? list.length >= 100
        : Boolean(res.hasMore);
      if (!hasMore || list.length === 0) break;
      page += 1;
    }
  } catch {
    // keep collected favorites if a later page fails
  }

  return <FavoritesClient initialKosts={kosts} />;
}
