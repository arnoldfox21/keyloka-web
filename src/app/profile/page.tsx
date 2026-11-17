import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";
import { ProfileClient } from "@/components/ProfileClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Profil Saya");

export default async function ProfilePage() {
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

  if (!user) {
    redirect("/login");
  }

  return <ProfileClient initialUser={user} />;
}
