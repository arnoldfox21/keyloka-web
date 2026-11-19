import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WriterStudioClient } from "@/components/WriterStudioClient";
import { privatePageMetadata } from "@/lib/seo";
import { getServerToken, serverFetch } from "@/lib/server-api";
import type { Article, ArticleCategoryItem, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata("Studio Penulis");

export default async function WriterPage() {
  const token = await getServerToken();
  if (!token) {
    redirect("/login");
  }

  const user = await serverFetch<UserProfile>("/auth/me").catch(() => null);
  if (!user) {
    redirect("/login");
  }

  if ((user.role || "").toUpperCase() !== "PENULIS") {
    redirect("/blog");
  }

  const [articles, categories] = await Promise.all([
    serverFetch<Article[]>("/articles/writer/mine").catch(() => []),
    serverFetch<ArticleCategoryItem[]>("/articles/categories").catch(() => []),
  ]);

  return (
    <WriterStudioClient
      currentUser={user}
      initialArticles={Array.isArray(articles) ? articles : []}
      initialCategories={Array.isArray(categories) ? categories : []}
    />
  );
}
