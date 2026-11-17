import { redirect } from "next/navigation";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost } from "@/lib/types";
import { FavoritesClient } from "@/components/FavoritesClient";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  let kosts: Kost[] = [];
  try {
    const res = await serverFetch<Kost[] | { data: Kost[] }>("/kosts?limit=100");
    const list = Array.isArray(res) ? res : res.data || [];
    kosts = list.filter((k) => Boolean(k.isFavorite));
  } catch {
    kosts = [];
  }

  return <FavoritesClient initialKosts={kosts} />;
}
