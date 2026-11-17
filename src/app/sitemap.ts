import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { API_BASE_URL } from "@/lib/server-api";
import type { Kost, OwnerPost } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  if (!API_BASE_URL) {
    return entries;
  }

  const [kostsRes, postsRes] = await Promise.all([
    fetchJsonSafe<Kost[] | { data?: Kost[] }>(`${API_BASE_URL}/kosts?page=1&limit=500`),
    fetchJsonSafe<OwnerPost[] | { data?: OwnerPost[] }>(`${API_BASE_URL}/posts`),
  ]);

  const kosts: Kost[] = Array.isArray(kostsRes)
    ? kostsRes
    : kostsRes?.data || [];

  const ownerIds = new Set<number>();

  for (const kost of kosts) {
    if (!kost?.id) continue;
    entries.push({
      url: `${siteUrl}/kost/${kost.id}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
    if (kost.ownerId) {
      ownerIds.add(kost.ownerId);
    }
  }

  for (const ownerId of ownerIds) {
    entries.push({
      url: `${siteUrl}/owner/${ownerId}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const posts: OwnerPost[] = Array.isArray(postsRes)
    ? postsRes
    : postsRes?.data || [];

  for (const post of posts) {
    if (!post?.id) continue;
    entries.push({
      url: `${siteUrl}/posts/${post.id}`,
      lastModified: post.createdAt ? new Date(post.createdAt) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
