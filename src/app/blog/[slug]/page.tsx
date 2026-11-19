import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  ListOrdered,
  MapPin,
} from "lucide-react";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { BlogShareButtons } from "@/components/BlogShareButtons";
import { JsonLd } from "@/components/JsonLd";
import {
  extractTocFromHtml,
  sanitizeArticleHtml,
  splitHtmlForInArticleAd,
} from "@/lib/html-sanitize";
import { getKostHref, getSiteUrl, SITE_NAME } from "@/lib/seo";
import { serverFetch } from "@/lib/server-api";
import {
  formatArticleCategoryLabel,
  formatRupiah,
  getDisplayPrice,
  resolveImageUrl,
  type Article,
  type Kost,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDateId(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    return await serverFetch<Article>(`/articles/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    return {
      title: "Artikel Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.excerpt || article.title;
  const coverUrl = article.coverImageUrl
    ? resolveImageUrl(article.coverImageUrl)
    : undefined;

  return {
    title,
    description,
    keywords: article.tags?.length ? article.tags : undefined,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt || article.createdAt,
      modifiedTime: article.updatedAt,
      authors: article.author?.name ? [article.author.name] : undefined,
      images: coverUrl ? [{ url: coverUrl, alt: article.title }] : undefined,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    notFound();
  }

  const [relatedArticles, kostsRes] = await Promise.all([
    serverFetch<Article[]>(
      `/articles/${encodeURIComponent(article.slug)}/related?limit=3`,
    ).catch(() => []),
    serverFetch<Kost[] | { data?: Kost[] }>(
      article.city
        ? `/kosts?city=${encodeURIComponent(article.city)}&limit=4`
        : "/kosts?limit=4",
    ).catch(() => []),
  ]);

  const relatedKosts: Kost[] = Array.isArray(kostsRes)
    ? kostsRes.slice(0, 4)
    : (kostsRes?.data || []).slice(0, 4);

  const sanitized = sanitizeArticleHtml(article.contentHtml);
  const { htmlWithIds, toc } = extractTocFromHtml(sanitized);
  const { beforeHtml, afterHtml } = splitHtmlForInArticleAd(htmlWithIds);

  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/blog/${article.slug}`;
  const coverUrl = article.coverImageUrl
    ? resolveImageUrl(article.coverImageUrl)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.metaDescription || article.excerpt,
            image: coverUrl ? [coverUrl] : undefined,
            datePublished: article.publishedAt || article.createdAt,
            dateModified: article.updatedAt,
            author: {
              "@type": "Person",
              name: article.author?.name || "Tim Keyloka",
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: siteUrl,
            },
            mainEntityOfPage: articleUrl,
          },
          {
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
                name: "Blog",
                item: `${siteUrl}/blog`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: article.title,
                item: articleUrl,
              },
            ],
          },
        ]}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/" className="hover:text-emerald-700">
          Beranda
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/blog" className="hover:text-emerald-700">
          Blog
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/blog?category=${encodeURIComponent(article.category)}`}
          className="hover:text-emerald-700"
        >
          {formatArticleCategoryLabel(article.category)}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-gray-800 max-w-xs sm:max-w-md">
          {article.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Article Column */}
        <article className="lg:col-span-2 rounded-3xl border border-gray-200 bg-white p-5 sm:p-8 shadow-2xs space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/blog?category=${encodeURIComponent(article.category)}`}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100"
              >
                {formatArticleCategoryLabel(article.category)}
              </Link>
              {article.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  {article.city}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-base text-gray-600 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 border-y border-gray-100 py-3 text-xs text-gray-500">
              <span className="font-bold text-gray-900">
                Ditulis oleh {article.author?.name || "Tim Keyloka"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateId(article.publishedAt || article.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.readingTimeMinutes} menit baca
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {article.viewCount} pembaca
              </span>
            </div>
          </header>

          {coverUrl && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={article.title}
                className="max-h-[420px] w-full object-cover"
              />
            </div>
          )}

          {/* Mobile TOC */}
          {toc.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 lg:hidden">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                <ListOrdered className="h-3.5 w-3.5" />
                Daftar Isi
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                    <a
                      href={`#${item.id}`}
                      className="font-semibold text-gray-700 hover:text-emerald-700 hover:underline"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article Body + In-Article AdSense */}
          <div
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: beforeHtml }}
          />

          {afterHtml && (
            <>
              <AdSenseUnit
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE}
                format="fluid"
                layout="in-article"
                minHeightClass="min-h-[120px]"
              />
              <div
                className="article-prose"
                dangerouslySetInnerHTML={{ __html: afterHtml }}
              />
            </>
          )}

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {article.tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {/* Share */}
          <div className="border-t border-gray-100 pt-4">
            <BlogShareButtons url={articleUrl} title={article.title} />
          </div>

          {/* Author Box */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700">
              {article.author?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageUrl(article.author.avatarUrl)}
                  alt={article.author.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (article.author?.name || "K").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Penulis
              </p>
              <p className="text-sm font-extrabold text-gray-900">
                {article.author?.name || "Tim Editorial Keyloka"}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {article.author?.bio ||
                  "Berbagi panduan hunian kost, apartemen, dan kontrakan agar kamu menemukan tempat tinggal yang aman dan nyaman."}
              </p>
            </div>
          </div>

          {/* Bottom AdSense */}
          <AdSenseUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM}
            format="auto"
            minHeightClass="min-h-[120px]"
          />
        </article>

        {/* Sticky Sidebar */}
        <aside className="space-y-6">
          {toc.length > 0 && (
            <div className="hidden lg:block sticky top-20 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-900">
                <ListOrdered className="h-4 w-4 text-emerald-600" />
                Daftar Isi
              </p>
              <ul className="mt-3 space-y-2 text-xs">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                    <a
                      href={`#${item.id}`}
                      className="block font-semibold text-gray-600 hover:text-emerald-700 transition"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AdSenseUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR}
            format="rectangle"
            minHeightClass="min-h-[250px]"
          />

          {/* Rekomendasi Properti Terkait */}
          {relatedKosts.length > 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs">
              <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Rekomendasi Hunian{" "}
                {article.city ? `di ${article.city}` : "Keyloka"}
              </h2>
              <div className="mt-3.5 space-y-3">
                {relatedKosts.map((kost) => {
                  const displayPrice = getDisplayPrice(kost);
                  return (
                  <Link
                    key={kost.id}
                    href={getKostHref(kost)}
                    className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-2 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {kost.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(kost.images[0])}
                          alt={kost.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-gray-900 group-hover:text-emerald-700">
                        {kost.name}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {kost.city}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-700">
                        {formatRupiah(displayPrice.amount)}
                        {displayPrice.unit}
                      </p>
                    </div>
                  </Link>
                  );
                })}
              </div>
              <Link
                href="/"
                className="mt-4 block w-full rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Jelajahi Semua Hunian
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">
            Artikel Terkait Lainnya
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/blog/${rel.slug}`}
                className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs transition hover:border-emerald-300"
              >
                <div className="h-36 bg-gray-100 overflow-hidden">
                  {rel.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(rel.coverImageUrl)}
                      alt={rel.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                    {formatArticleCategoryLabel(rel.category)}
                  </span>
                  <h3 className="mt-1 text-sm font-extrabold text-gray-900 line-clamp-2 group-hover:text-emerald-700">
                    {rel.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
