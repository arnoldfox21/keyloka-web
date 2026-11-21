import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPropertyClient } from "@/components/NewPropertyClient";
import { RoleActivationPanel } from "@/components/RoleActivationPanel";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import { getEffectiveUserRoles, type Kost, type UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Tambah Properti");

export default async function NewPropertyPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const user = await serverFetch<UserProfile>("/auth/me").catch(() => null);
  if (!user) {
    redirect("/login");
  }

  const role = (user.role || "").toUpperCase();
  const canAccess =
    role === "PEMILIK_KOST" || role === "STAFF" || role === "ADMINISTRATOR";
  if (!canAccess) {
    if (role === "PENYEWA") {
      const hasOwnerRole = getEffectiveUserRoles(user).includes("PEMILIK_KOST");
      return (
        <RoleActivationPanel
          user={user}
          variant={hasOwnerRole ? "switch-to-owner-page" : "become-owner-page"}
          redirectAfterOwner="/dashboard/new-property"
        />
      );
    }
    redirect("/bookings");
  }

  const [facilitiesRes, myKostsRes, walletRes, pricingRes] = await Promise.all([
    serverFetch<{ roomFacilities: string[]; publicFacilities: string[] }>(
      "/kosts/master-facilities",
    ).catch(() => ({ roomFacilities: [], publicFacilities: [] })),
    serverFetch<Kost[] | { data: Kost[]; total?: number }>(
      `/kosts?ownerId=${user.id}&includePending=true&page=1&limit=1`,
    ).catch(() => ({ data: [], total: 0 })),
    serverFetch<{ creditBalance: number; payoutBalance: number }>(
      "/wallet/me",
    ).catch(() => ({ creditBalance: 0, payoutBalance: 0 })),
    serverFetch<{
      freePropertyQuota?: number;
      extraPropertySlotFee?: number;
    }>("/wallet/pricing").catch(() => ({
      freePropertyQuota: 2,
      extraPropertySlotFee: 10000,
    })),
  ]);

  const existingPropertyCount = Array.isArray(myKostsRes)
    ? myKostsRes.length
    : Number(myKostsRes.total ?? (myKostsRes.data || []).length);

  return (
    <NewPropertyClient
      currentUser={user}
      masterFacilities={facilitiesRes}
      existingPropertyCount={existingPropertyCount}
      creditBalance={Number(walletRes.creditBalance ?? 0)}
      freePropertyQuota={Number(pricingRes.freePropertyQuota ?? 2)}
      extraPropertySlotFee={Number(pricingRes.extraPropertySlotFee ?? 10000)}
    />
  );
}
