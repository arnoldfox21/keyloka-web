"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Heart,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import {
  resolveImageUrl,
  type OwnerPost,
  type OwnerPostComment,
  type UserProfile,
} from "@/lib/types";

interface PostDetailClientProps {
  initialPost: OwnerPost;
  initialComments: OwnerPostComment[];
  currentUser: UserProfile | null;
}

export function PostDetailClient({
  initialPost,
  initialComments,
  currentUser,
}: PostDetailClientProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleLike() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setPost((p) => ({
      ...p,
      isLiked: !p.isLiked,
      likeCount: p.isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
    }));
    await fetch(`/api/proxy/posts/${post.id}/like`, { method: "POST" }).catch(() => {});
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/proxy/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setComments((prev) => [...prev, data]);
        setPost((p) => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    const res = await fetch(`/api/proxy/posts/${post.id}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((p) => ({ ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href={`/owner/${post.ownerId}`} className="font-bold text-gray-900 hover:text-emerald-700">
            {post.ownerName || `Pemilik #${post.ownerId}`}
          </Link>
          <span className="text-xs text-gray-400">
            {new Date(post.createdAt).toLocaleDateString("id-ID")}
          </span>
        </div>

        <p className="text-sm text-gray-800 whitespace-pre-line">{post.content}</p>

        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(post.imageUrl)}
            alt="Post"
            className="max-h-[420px] w-full rounded-2xl object-cover"
          />
        )}

        {post.kostId && (
          <Link
            href={`/kost/${post.kostId}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
          >
            <Building2 className="h-3.5 w-3.5" />
            {post.kostName || `Lihat Properti #${post.kostId}`}
          </Link>
        )}

        <div className="flex items-center gap-4 border-t border-gray-100 pt-3 text-xs font-bold text-gray-600">
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 ${
              post.isLiked ? "text-rose-600" : "hover:text-rose-600"
            }`}
          >
            <Heart className={`h-4 w-4 ${post.isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            {post.likeCount || 0} Suka
          </button>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {comments.length} Komentar
          </span>
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-extrabold text-gray-900">Komentar</h2>
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-500">Belum ada komentar.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-gray-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{c.userName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("id-ID")}
                    </span>
                    {currentUser?.id === c.userId && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-700">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={currentUser ? "Tulis komentar..." : "Masuk untuk berkomentar"}
            className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
