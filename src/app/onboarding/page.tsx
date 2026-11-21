import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";
import { API_BASE_URL, getServerToken, serverFetch } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";
import { OnboardingClient } from "@/components/OnboardingClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Lengkapi Profil");

export default async function OnboardingPage() {
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

  if (user?.onboardingCompleted) {
    redirect("/");
  }

  const platformStatus = await fetch(`${API_BASE_URL}/platform/status`, {
    next: { revalidate: 30 },
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ allowOwnerRegistration?: boolean }>) : null))
    .catch(() => null);

  return (
    <OnboardingClient
      user={user}
      allowOwnerRegistration={platformStatus?.allowOwnerRegistration ?? true}
    />
  );
}
