import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsClient } from "@/components/NotificationsClient";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { NotificationPageResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Notifikasi");

export default async function NotificationsPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const initialData = await serverFetch<NotificationPageResponse>(
    "/notifications?page=1&limit=20",
  ).catch(
    (): NotificationPageResponse => ({
      data: [],
      total: 0,
      unreadCount: 0,
      hasMore: false,
    }),
  );

  const clientKey = `${initialData.total}-${initialData.unreadCount}-${initialData.data?.[0]?.id ?? 0}`;
  return <NotificationsClient key={clientKey} initialData={initialData} />;
}
