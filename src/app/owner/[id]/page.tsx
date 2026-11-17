import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/JsonLd";
import { OwnerProfileClient } from "@/components/OwnerProfileClient";
import { getSiteUrl, toAbsoluteImageUrl, truncateDescription } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost, OwnerPost, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const fetchOwnerProfile = cache(async (ownerId: number): Promise<UserProfile | null> => {
  try {
    return await serverFetch<UserProfile>(`/auth/users/${ownerId}`);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ownerId = Number(id);
  if (!Number.isFinite(ownerId)) {
    return { title: "Pemilik Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const owner = await fetchOwnerProfile(ownerId);
  if (!owner) {
    return { title: "Pemilik Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const title = `${owner.name} — Pemilik Properti`;
  const description = truncateDescription(
    owner.bio ||
      `Lihat profil dan daftar properti hunian dari ${owner.name}${owner.city ? ` di ${owner.city}` : ""} di Keyloka.`,
  );
  const image = toAbsoluteImageUrl(owner.coverUrl) || toAbsoluteImageUrl(owner.avatarUrl);
  const canonicalPath = `/owner/${owner.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "profile",
      locale: "id_ID",
      url: canonicalPath,
      title,
      description,
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

export default async function OwnerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ownerId = Number(id);
  if (!Number.isFinite(ownerId)) notFound();

  const token = await getServerToken();
  let currentUser: UserProfile | null = null;
  if (token) {
    try {
      currentUser = await serverFetch<UserProfile>("/auth/me");
    } catch {
      currentUser = null;
    }
  }

  const owner = await fetchOwnerProfile(ownerId);
  if (!owner) notFound();

  let properties: Kost[] = [];
  let posts: OwnerPost[] = [];

  try {
    const kRes = await serverFetch<Kost[] | { data: Kost[] }>(
      `/kosts?ownerId=${ownerId}&limit=50`,
    );
    properties = Array.isArray(kRes) ? kRes : kRes.data || [];
  } catch {
    properties = [];
  }

  try {
    const viewerQ = currentUser ? `&viewerId=${currentUser.id}` : "";
    const pRes = await serverFetch<OwnerPost[] | { data: OwnerPost[] }>(
      `/posts?ownerId=${ownerId}${viewerQ}`,
    );
    posts = Array.isArray(pRes) ? pRes : pRes.data || [];
  } catch {
    posts = [];
  }

  const siteUrl = getSiteUrl();
  const avatar = toAbsoluteImageUrl(owner.avatarUrl);
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: owner.name,
      url: `${siteUrl}/owner/${owner.id}`,
      ...(owner.bio ? { description: owner.bio } : {}),
      ...(avatar ? { image: avatar } : {}),
    },
  };

  return (
    <>
      <JsonLd data={profileJsonLd} />
      <OwnerProfileClient
        owner={owner}
        initialProperties={properties}
        initialPosts={posts}
        currentUser={currentUser}
      />
    </>
  );
}
