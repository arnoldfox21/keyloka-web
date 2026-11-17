import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/JsonLd";
import { PostDetailClient } from "@/components/PostDetailClient";
import { getSiteUrl, toAbsoluteImageUrl, truncateDescription } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { OwnerPost, OwnerPostComment, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const fetchPostById = cache(
  async (postId: number, viewerId?: number): Promise<OwnerPost | null> => {
    try {
      const endpoint = viewerId ? `/posts?viewerId=${viewerId}` : "/posts";
      const allPosts = await serverFetch<OwnerPost[] | { data: OwnerPost[] }>(
        endpoint,
      );
      const list = Array.isArray(allPosts) ? allPosts : allPosts.data || [];
      return list.find((p) => p.id === postId) ?? null;
    } catch {
      return null;
    }
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return { title: "Postingan Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const post = await fetchPostById(postId);
  if (!post) {
    return { title: "Postingan Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const authorName = post.ownerName || `Pemilik #${post.ownerId}`;
  const snippet = truncateDescription(post.content, 60);
  const title = snippet ? `${authorName}: "${snippet}"` : `Postingan ${authorName}`;
  const description = truncateDescription(
    post.content || `Update terbaru dari ${authorName} di Keyloka.`,
  );
  const image = toAbsoluteImageUrl(post.imageUrl);
  const canonicalPath = `/posts/${post.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      locale: "id_ID",
      url: canonicalPath,
      title,
      description,
      ...(post.createdAt ? { publishedTime: post.createdAt } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  const token = await getServerToken();
  let currentUser: UserProfile | null = null;
  if (token) {
    try {
      currentUser = await serverFetch<UserProfile>("/auth/me");
    } catch {
      currentUser = null;
    }
  }

  const post = await fetchPostById(postId, currentUser?.id);
  if (!post) notFound();

  let comments: OwnerPostComment[] = [];
  try {
    const cRes = await serverFetch<OwnerPostComment[] | { data: OwnerPostComment[] }>(
      `/posts/${postId}/comments`,
    );
    comments = Array.isArray(cRes) ? cRes : cRes.data || [];
  } catch {
    comments = [];
  }

  const siteUrl = getSiteUrl();
  const image = toAbsoluteImageUrl(post.imageUrl);
  const postJsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: truncateDescription(post.content, 110) || `Postingan ${post.ownerName || "Pemilik"}`,
    articleBody: post.content,
    url: `${siteUrl}/posts/${post.id}`,
    ...(post.createdAt ? { datePublished: post.createdAt } : {}),
    ...(image ? { image } : {}),
    author: {
      "@type": "Person",
      name: post.ownerName || `Pemilik #${post.ownerId}`,
      url: `${siteUrl}/owner/${post.ownerId}`,
    },
  };

  return (
    <>
      <JsonLd data={postJsonLd} />
      <PostDetailClient
        initialPost={post}
        initialComments={comments}
        currentUser={currentUser}
      />
    </>
  );
}
