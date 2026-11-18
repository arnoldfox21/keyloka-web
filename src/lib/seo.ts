import { resolveImageUrl } from "./types";

export const SITE_NAME = "Keyloka";

export const DEFAULT_SITE_URL = "https://keyloka.com";

export const DEFAULT_DESCRIPTION =
  "Platform pencarian & booking hunian kost, apartemen, kontrakan, villa, dan homestay dengan transaksi aman, survei terverifikasi, dan poin loyalti.";

export const DEFAULT_KEYWORDS = [
  "cari kost",
  "sewa kost",
  "kost harian",
  "kost bulanan",
  "apartemen",
  "kontrakan",
  "sewa villa",
  "homestay",
  "hunian harian",
  "kost aman",
  "booking kost aman",
  "Keyloka",
];

/**
 * Returns the canonical base URL of the web application without trailing slash.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

/**
 * Resolves a relative or API-hosted image path into an absolute HTTP(S) URL
 * suitable for Open Graph tags and JSON-LD structured data.
 */
export function toAbsoluteImageUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  const resolved = resolveImageUrl(pathOrUrl);
  if (!resolved || resolved.startsWith("data:")) return undefined;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  const siteUrl = getSiteUrl();
  return resolved.startsWith("/") ? `${siteUrl}${resolved}` : `${siteUrl}/${resolved}`;
}

/**
 * Truncates plain text cleanly for meta descriptions without breaking words.
 */
export function truncateDescription(text: string | undefined | null, maxLength = 155): string {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Builds a SEO-friendly property detail path (`/kost/<slug>-<id>` or `/kost/<id>`).
 */
export function getKostHref(kost: { id: number; slug?: string | null }): string {
  const cleanSlug = (kost.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleanSlug) return `/kost/${kost.id}`;
  if (cleanSlug.endsWith(`-${kost.id}`)) return `/kost/${cleanSlug}`;
  return `/kost/${cleanSlug}-${kost.id}`;
}

/**
 * Extracts numeric property ID from `/kost/123` or `/kost/kost-melati-123`.
 */
export function parseKostIdFromParam(rawParam: string): string {
  const trimmed = (rawParam || "").trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const trailing = trimmed.match(/-(\d+)$/);
  if (trailing) return trailing[1];
  return trimmed;
}

/**
 * Generates noindex/nofollow metadata for authenticated or private routes.
 */
export function privatePageMetadata(title: string) {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}
