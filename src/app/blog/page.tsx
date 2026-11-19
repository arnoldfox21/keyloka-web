import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Eye,
  Flame,
  Rss,
  Search,
  Tag,
} from "lucide-react";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { JsonLd } from "@/components/JsonLd";
import { getSiteUrl, SITE_NAME } from "@/lib/seo";
import { serverFetch } from "@/lib/server-api";
import {
  ARTICLE_CATEGORY_LABELS,
  formatArticleCategoryLabel,
  resolveImageUrl,
  type Article,
  type ArticleCategoryItem,
  type ArticleListResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Panduan Hunian Kost",
  description:
    "Tips memilih kost, panduan area kampus, info kontrakan & apartemen, serta gaya hidup anak kost dari Keyloka.",
  alternates: {
    canonical: "/blog",
    types: {
      "application/rss+xml": "/blog/rss.xml",
    },
  },
  openGraph: {
    type: "website",
    title: `Blog & Panduan Hunian | ${SITE_NAME}`,
    description:
      "Tips memilih kost, panduan area kampus, info kontrakan & apartemen dari Keyloka.",
    url: "/blog",
  },
};

function formatDateId(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const category = (sp.category || "").trim().toUpperCase();
  const tag = (sp.tag || "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page) || 1);

  const query = new URLSearchParams({
    page: String(page),
    limit: "9",
  });
  if (q) query.set("q", q);
  if (category) query.set("category", category);
  if (tag) query.set("tag", tag);

  const [listRes, featuredRes, popularRes, facetsRes, categoriesRes] = await Promise.all([
    serverFetch<ArticleListResponse>(`/articles?${query.toString()}`).catch(
      () => ({ data: [], total: 0, page: 1, limit: 9, totalPages: 1 }),
    ),
    !q && !category && !tag && page === 1
      ? serverFetch<ArticleListResponse>(
          "/articles?featured=true&page=1&limit=1",
        ).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] as Article[] }),
    serverFetch<ArticleListResponse>(
      "/articles?sort=popular&page=1&limit=5",
    ).catch(() => ({ data: [] })),
    serverFetch<{
      categories: Record<string, number>;
      topTags: Array<{ name: string; count: number }>;
    }>("/articles/facets").catch(() => ({ categories: {}, topTags: [] })),
    serverFetch<ArticleCategoryItem[]>("/articles/categories").catch(() => []),
  ]);

  const categoryOptions: Array<{ slug: string; name: string }> =
    Array.isArray(categoriesRes) && categoriesRes.length > 0
      ? categoriesRes.map((c) => ({ slug: c.slug, name: c.name }))
      : Object.entries(ARTICLE_CATEGORY_LABELS).map(([slug, name]) => ({
          slug,
          name,
        }));

  const featuredArticle = featuredRes.data?.[0] || null;
  const articles = (listRes.data || []).filter(
    (a) => !featuredArticle || a.id !== featuredArticle.id,
  );
  const popularArticles = popularRes.data || [];
  const topTags = facetsRes.topTags || [];
  const siteUrl = getSiteUrl();

  const buildPageHref = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    if (tag) p.set("tag", tag);
    if (nextPage > 1) p.set("page", String(nextPage));
    const qs = p.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: `${SITE_NAME} Blog`,
          description:
            "Tips mencari kost, panduan area kampus, dan informasi hunian sewa di Indonesia.",
          url: `${siteUrl}/blog`,
        }}
      />

      {/* Hero Header */}
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-emerald-100">
              <BookOpen className="h-3.5 w-3.5" />
              Blog & Panduan Hunian Keyloka
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tips Cari Kost, Panduan Area & Info Hunian
            </h1>
            <p className="mt-2 text-sm text-emerald-100/90">
              Temukan panduan memilih kost aman, estimasi biaya hidup sekitar kampus, dan tips sewa hunian terpercaya.
            </p>
          </div>
          <Link
            href="/blog/rss.xml"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/25 transition"
          >
            <Rss className="h-3.5 w-3.5" />
            RSS Feed
          </Link>
        </div>

        {/* Search & Category Filter */}
        <form
          action="/blog"
          method="GET"
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari artikel (misal: tips kost, UGM, kontrak rumah)..."
              className="w-full rounded-xl bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          {category && <input type="hidden" name="category" value={category} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-gray-900 hover:bg-amber-300 transition"
          >
            Cari Artikel
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              !category && !tag
                ? "bg-white text-emerald-900"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            Semua Topik
          </Link>
          {categoryOptions.map((c) => (
            <Link
              key={c.slug}
              href={`/blog?category=${encodeURIComponent(c.slug)}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                category === c.slug
                  ? "bg-white text-emerald-900"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Article */}
      {featuredArticle && (
        <Link
          href={`/blog/${featuredArticle.slug}`}
          className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md md:grid-cols-2"
        >
          <div className="relative h-56 md:h-auto bg-gray-100 overflow-hidden">
            {featuredArticle.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageUrl(featuredArticle.coverImageUrl)}
                alt={featuredArticle.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-700 font-bold">
                Keyloka Blog
              </div>
            )}
            <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold text-gray-900">
              Artikel Pilihan
            </span>
          </div>
          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                {formatArticleCategoryLabel(featuredArticle.category)}
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 group-hover:text-emerald-700 transition">
                {featuredArticle.title}
              </h2>
              <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                {featuredArticle.excerpt}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="font-bold text-gray-800">
                {featuredArticle.author?.name || "Tim Keyloka"}
              </span>
              <span>•</span>
              <span>{formatDateId(featuredArticle.publishedAt || featuredArticle.createdAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {featuredArticle.readingTimeMinutes} mnt baca
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* AdSense Top / List Banner */}
      <AdSenseUnit
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG_LIST}
        format="horizontal"
        minHeightClass="min-h-[90px]"
      />

      {/* Main Content + Sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {(q || category || tag) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs">
              <span className="text-gray-600">
                Menampilkan {listRes.total} artikel
                {q ? ` untuk "${q}"` : ""}
                {category ? ` di kategori ${formatArticleCategoryLabel(category)}` : ""}
                {tag ? ` dengan tag #${tag}` : ""}
              </span>
              <Link
                href="/blog"
                className="font-bold text-emerald-700 hover:underline"
              >
                Reset Filter
              </Link>
            </div>
          )}

          {articles.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-base font-bold text-gray-800">
                Belum ada artikel yang sesuai
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Coba kata kunci lain atau jelajahi semua kategori.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="h-44 bg-gray-100 overflow-hidden">
                    {article.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(article.coverImageUrl)}
                        alt={article.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-xs font-bold text-emerald-700">
                        {formatArticleCategoryLabel(article.category)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                        {formatArticleCategoryLabel(article.category)}
                      </span>
                      <h3 className="mt-1.5 text-base font-extrabold text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-xs text-gray-600 line-clamp-3">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                      <span>{formatDateId(article.publishedAt || article.createdAt)}</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readingTimeMinutes} mnt
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.viewCount}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {listRes.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 && (
                <Link
                  href={buildPageHref(page - 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Sebelumnya
                </Link>
              )}
              <span className="text-xs font-bold text-gray-600">
                Halaman {page} dari {listRes.totalPages}
              </span>
              {page < listRes.totalPages && (
                <Link
                  href={buildPageHref(page + 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Berikutnya
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <Flame className="h-4 w-4 text-amber-500" />
              Artikel Populer
            </h2>
            <div className="mt-4 space-y-3.5">
              {popularArticles.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada artikel.</p>
              ) : (
                popularArticles.map((pop, idx) => (
                  <Link
                    key={pop.id}
                    href={`/blog/${pop.slug}`}
                    className="group flex items-start gap-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-extrabold text-emerald-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-emerald-700">
                        {pop.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {pop.viewCount} pembaca
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {topTags.length > 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                <Tag className="h-4 w-4 text-emerald-600" />
                Topik Populer
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((t) => (
                  <Link
                    key={t.name}
                    href={`/blog?tag=${encodeURIComponent(t.name)}`}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      tag === t.name
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <AdSenseUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR}
            format="rectangle"
            minHeightClass="min-h-[250px]"
          />
        </aside>
      </div>
    </div>
  );
}
