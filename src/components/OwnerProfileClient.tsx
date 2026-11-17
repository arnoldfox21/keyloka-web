"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  Star,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import {
  resolveImageUrl,
  type Kost,
  type OwnerPost,
  type UserProfile,
} from "@/lib/types";
import { KostCard } from "./KostCard";

interface OwnerProfileClientProps {
  owner: UserProfile;
  initialProperties: Kost[];
  initialPosts: OwnerPost[];
  currentUser: UserProfile | null;
}

export function OwnerProfileClient({
  owner,
  initialProperties,
  initialPosts,
  currentUser,
}: OwnerProfileClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"POSTS" | "PROPERTIES">("POSTS");
  const [posts, setPosts] = useState<OwnerPost[]>(initialPosts);
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [linkedKostId, setLinkedKostId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [posting, setPosting] = useState(false);

  const isSelf = currentUser?.id === owner.id;
  const totalEmptyRooms = initialProperties.reduce(
    (sum, k) => sum + (k.availableRooms || 0),
    0,
  );
  const avgRating =
    initialProperties.length > 0
      ? (
          initialProperties.reduce((s, k) => s + Number(k.rating || 0), 0) /
          initialProperties.length
        ).toFixed(1)
      : "0.0";

  async function handleUploadPostImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageToDataUrl(file);
    const res = await fetch("/api/proxy/kosts/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.url) setImageUrl(data.url);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/proxy/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || undefined,
          kostId: linkedKostId ? Number(linkedKostId) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPosts((prev) => [data, ...prev]);
        setContent("");
        setImageUrl("");
        setLinkedKostId("");
        setShowComposer(false);
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleToggleLike(postId: number) {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            }
          : p,
      ),
    );
    await fetch(`/api/proxy/posts/${postId}/like`, { method: "POST" }).catch(() => {});
  }

  async function handleDeletePost(postId: number) {
    if (!window.confirm("Hapus postingan ini?")) return;
    const res = await fetch(`/api/proxy/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="h-36 sm:h-48 bg-gradient-to-r from-emerald-700 to-teal-600">
          {owner.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(owner.coverUrl)}
              alt="Cover Pemilik"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 shadow-md">
                {owner.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(owner.avatarUrl)}
                    alt={owner.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-emerald-700">
                    <UserIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">{owner.name}</h1>
                {owner.city && (
                  <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {owner.city}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isSelf ? (
                <button
                  type="button"
                  onClick={() => setShowComposer((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Buat Postingan
                </button>
              ) : (
                initialProperties[0] && (
                  <Link
                    href={
                      currentUser
                        ? `/chat?kostId=${initialProperties[0].id}&peerId=${owner.id}`
                        : "/login"
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat Pemilik
                  </Link>
                )
              )}
            </div>
          </div>

          {owner.bio && (
            <p className="mt-4 text-sm text-gray-600">{owner.bio}</p>
          )}

          {/* Stats Strip */}
          <div className="mt-5 grid grid-cols-4 gap-3 rounded-2xl bg-gray-50 p-3.5 text-center">
            <div>
              <p className="text-base font-black text-gray-900">
                {initialProperties.length}
              </p>
              <p className="text-[11px] text-gray-500">Properti</p>
            </div>
            <div>
              <p className="text-base font-black text-emerald-700">
                {totalEmptyRooms}
              </p>
              <p className="text-[11px] text-gray-500">Kamar Kosong</p>
            </div>
            <div>
              <p className="inline-flex items-center justify-center gap-1 text-base font-black text-amber-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {avgRating}
              </p>
              <p className="text-[11px] text-gray-500">Rata-rata Rating</p>
            </div>
            <div>
              <p className="text-base font-black text-gray-900">{posts.length}</p>
              <p className="text-[11px] text-gray-500">Postingan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Composer */}
      {isSelf && showComposer && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-3xl border border-emerald-200 bg-white p-6 space-y-3 shadow-sm"
        >
          <h2 className="text-base font-extrabold text-gray-900">
            Buat Postingan Baru
          </h2>
          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bagikan info promo, kamar kosong terbaru, atau suasana kost..."
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-emerald-500"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={linkedKostId}
              onChange={(e) => setLinkedKostId(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
            >
              <option value="">Tautkan Properti (Opsional)</option>
              {initialProperties.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>

            <label className="cursor-pointer rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              {imageUrl ? "Foto Terlampir ✓" : "Upload Foto (Opsional)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadPostImage}
              />
            </label>

            <button
              type="submit"
              disabled={posting}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? "Menerbitkan..." : "Terbitkan"}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("POSTS")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            tab === "POSTS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Postingan ({posts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("PROPERTIES")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            tab === "PROPERTIES"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Properti ({initialProperties.length})
        </button>
      </div>

      {tab === "POSTS" ? (
        posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Belum ada postingan dari pengelola ini.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      {owner.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(owner.avatarUrl)}
                          alt={owner.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        owner.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{owner.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-800 whitespace-pre-line">{post.content}</p>

                {post.imageUrl && (
                  <Link href={`/posts/${post.id}`} className="block overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(post.imageUrl)}
                      alt="Post"
                      className="max-h-96 w-full object-cover"
                    />
                  </Link>
                )}

                {post.kostId && (
                  <Link
                    href={`/kost/${post.kostId}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {post.kostName || `Lihat Properti #${post.kostId}`}
                  </Link>
                )}

                <div className="flex items-center gap-4 border-t border-gray-100 pt-3 text-xs font-bold text-gray-600">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`inline-flex items-center gap-1.5 ${
                      post.isLiked ? "text-rose-600" : "hover:text-rose-600"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${post.isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                    />
                    {post.likeCount || 0} Suka
                  </button>
                  <Link
                    href={`/posts/${post.id}`}
                    className="inline-flex items-center gap-1.5 hover:text-emerald-700"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {post.commentCount || 0} Komentar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {initialProperties.map((k) => (
            <KostCard key={k.id} kost={k} />
          ))}
        </div>
      )}
    </div>
  );
}
