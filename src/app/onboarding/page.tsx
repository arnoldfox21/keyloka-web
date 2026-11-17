import { redirect } from "next/navigation";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";
import { OnboardingClient } from "@/components/OnboardingClient";

export const dynamic = "force-dynamic";

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

  return <OnboardingClient user={user} />;
}
