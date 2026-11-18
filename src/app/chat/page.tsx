import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { ChatMessage, KostGroupRoom, UserProfile } from "@/lib/types";
import { ChatClient } from "@/components/ChatClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Chat");

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ kostId?: string; peerId?: string; groupKostId?: string }>;
}) {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  let user: UserProfile | null = null;
  try {
    user = await serverFetch<UserProfile>("/auth/me");
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  const sp = await searchParams;
  let conversations: ChatMessage[] = [];
  let groups: KostGroupRoom[] = [];

  try {
    const cRes = await serverFetch<ChatMessage[] | { data: ChatMessage[] }>(
      `/chats/conversations/${user.id}`,
    );
    conversations = Array.isArray(cRes) ? cRes : cRes.data || [];
  } catch {
    conversations = [];
  }

  try {
    const gRes = await serverFetch<KostGroupRoom[] | { data: KostGroupRoom[] }>(
      `/chats/groups/user/${user.id}`,
    );
    groups = Array.isArray(gRes) ? gRes : gRes.data || [];
  } catch {
    groups = [];
  }

  return (
    <ChatClient
      currentUser={user}
      socketToken={token}
      initialConversations={conversations}
      initialGroups={groups}
      initialKostId={sp.kostId ? Number(sp.kostId) : undefined}
      initialPeerId={sp.peerId ? Number(sp.peerId) : undefined}
      initialGroupKostId={sp.groupKostId ? Number(sp.groupKostId) : undefined}
    />
  );
}
