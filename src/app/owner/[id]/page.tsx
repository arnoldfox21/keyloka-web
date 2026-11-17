import { notFound } from "next/navigation";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost, OwnerPost, UserProfile } from "@/lib/types";
import { OwnerProfileClient } from "@/components/OwnerProfileClient";

export const dynamic = "force-dynamic";

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

  let owner: UserProfile | null = null;
  try {
    owner = await serverFetch<UserProfile>(`/auth/users/${ownerId}`);
  } catch {
    notFound();
  }

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

  return (
    <OwnerProfileClient
      owner={owner}
      initialProperties={properties}
      initialPosts={posts}
      currentUser={currentUser}
    />
  );
}
