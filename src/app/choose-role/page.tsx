import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChooseRoleClient } from "@/components/ChooseRoleClient";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import { hasDualRoles, type UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Pilih Mode Masuk");

export default async function ChooseRolePage() {
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
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  if (!hasDualRoles(user)) {
    const role = (user.role || "").toUpperCase();
    if (role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR") {
      redirect("/dashboard");
    }
    if (role === "PENULIS") {
      redirect("/writer");
    }
    redirect("/");
  }

  return <ChooseRoleClient user={user} />;
}
