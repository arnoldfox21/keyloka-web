import { notFound } from "next/navigation";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { OwnerPost, OwnerPostComment, UserProfile } from "@/lib/types";
import { PostDetailClient } from "@/components/PostDetailClient";

export const dynamic = "force-dynamic";

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

  let post: OwnerPost | null = null;
  try {
    const allPosts = await serverFetch<OwnerPost[] | { data: OwnerPost[] }>("/posts");
    const list = Array.isArray(allPosts) ? allPosts : allPosts.data || [];
    post = list.find((p) => p.id === postId) ?? null;
  } catch {
    post = null;
  }

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

  return (
    <PostDetailClient
      initialPost={post}
      initialComments={comments}
      currentUser={currentUser}
    />
  );
}
