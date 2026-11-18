import type { MetadataRoute } from "next";
import { getKostHref, getSiteUrl } from "@/lib/seo";
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
    {
      url: `${siteUrl}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/gabung-pemilik`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/syarat-ketentuan`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/kebijakan-privasi`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/sewa/kost`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/sewa/apartemen`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/sewa/kontrakan`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/sewa/villa`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
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
  const citySlugs = new Set<string>();

  for (const kost of kosts) {
    if (!kost?.id) continue;
    entries.push({
      url: `${siteUrl}${getKostHref(kost)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
    if (kost.ownerId) {
      ownerIds.add(kost.ownerId);
    }
    if (kost.city) {
      const citySlug = kost.city
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (citySlug) citySlugs.add(citySlug);
    }
  }

  for (const citySlug of citySlugs) {
    entries.push({
      url: `${siteUrl}/sewa/kost-${citySlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
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
