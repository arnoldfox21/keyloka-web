import { NextResponse } from "next/server";
import { getSiteUrl, SITE_NAME } from "@/lib/seo";
import { API_BASE_URL } from "@/lib/server-api";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  let articles: Article[] = [];

  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/articles?page=1&limit=50`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        articles = Array.isArray(json) ? json : json?.data || [];
      }
    } catch {
      articles = [];
    }
  }

  const itemsXml = articles
    .map((a) => {
      const link = `${siteUrl}/blog/${encodeURIComponent(a.slug)}`;
      const pubDate = new Date(a.publishedAt || a.createdAt).toUTCString();
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(a.excerpt || a.metaDescription || a.title)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Tips cari kost, panduan area kampus, dan info hunian dari ${escapeXml(SITE_NAME)}.</description>
    <language>id-ID</language>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
