import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Kost, UserProfile } from "@/lib/types";
import { NewPropertyClient } from "@/components/NewPropertyClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Edit Properti");

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await getServerToken();
  if (!token) redirect("/login");

  const { id } = await params;
  const kostId = Number(id);
  if (!Number.isFinite(kostId)) notFound();

  let user: UserProfile | null = null;
  try {
    user = await serverFetch<UserProfile>("/auth/me");
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  const role = (user.role || "").toUpperCase();
  if (role !== "PEMILIK_KOST" && role !== "STAFF" && role !== "ADMINISTRATOR") {
    redirect("/");
  }

  let kost: Kost | null = null;
  try {
    kost = await serverFetch<Kost>(`/kosts/${kostId}`);
  } catch {
    notFound();
  }
  if (!kost) notFound();

  let masterFacilities = {
    roomFacilities: [] as string[],
    publicFacilities: [] as string[],
  };
  try {
    masterFacilities = await serverFetch<typeof masterFacilities>(
      "/kosts/master-facilities",
    );
  } catch {
    // fallback
  }

  return (
    <NewPropertyClient
      currentUser={user}
      masterFacilities={masterFacilities}
      existingPropertyCount={0}
      creditBalance={user.creditBalance ?? 0}
      initialKost={kost}
    />
  );
}
