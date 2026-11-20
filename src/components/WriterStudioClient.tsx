"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  FolderPlus,
  ImagePlus,
  PenSquare,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { sanitizeArticleHtml } from "@/lib/html-sanitize";
import {
  ARTICLE_CATEGORY_LABELS,
  formatArticleCategoryLabel,
  resolveImageUrl,
  type Article,
  type ArticleCategoryItem,
  type UserProfile,
} from "@/lib/types";

interface WriterStudioClientProps {
  currentUser: UserProfile;
  initialArticles: Article[];
  initialCategories: ArticleCategoryItem[];
}

interface ArticleFormState {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string;
  category: string;
  tagsText: string;
  city: string;
  metaTitle: string;
  metaDescription: string;
  status: "DRAFT" | "PUBLISHED";
  isFeatured: boolean;
}

const EMPTY_FORM: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "",
  coverImageUrl: "",
  category: "TIPS_KOST",
  tagsText: "",
  city: "",
  metaTitle: "",
  metaDescription: "",
  status: "DRAFT",
  isFeatured: false,
};

export function WriterStudioClient({
  currentUser,
  initialArticles,
  initialCategories,
}: WriterStudioClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [categories, setCategories] = useState<ArticleCategoryItem[]>(
    initialCategories.length > 0
      ? initialCategories
      : Object.entries(ARTICLE_CATEGORY_LABELS).map(([slug, name], idx) => ({
          id: idx + 1,
          slug,
          name,
        })),
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<ArticleCategoryItem | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [editorMode, setEditorMode] = useState<"EDIT" | "PREVIEW">("EDIT");
  const [saving, setSaving] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingCoverPreview, setPendingCoverPreview] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const qLower = searchQuery.trim().toLowerCase();
  const filteredArticles = articles.filter((a) => {
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    if (!qLower) return true;
    return [a.title, a.slug, a.category, a.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(qLower);
  });

  function clearPendingCover() {
    if (pendingCoverPreview) {
      URL.revokeObjectURL(pendingCoverPreview);
    }
    setPendingCoverFile(null);
    setPendingCoverPreview("");
  }

  function startNewArticle() {
    clearPendingCover();
    setForm(EMPTY_FORM);
    setEditorMode("EDIT");
    setFeedback(null);
  }

  function loadArticleIntoForm(article: Article) {
    clearPendingCover();
    setForm({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || "",
      contentHtml: article.contentHtml || "",
      coverImageUrl: article.coverImageUrl || "",
      category: article.category || "TIPS_KOST",
      tagsText: (article.tags || []).join(", "),
      city: article.city || "",
      metaTitle: article.metaTitle || "",
      metaDescription: article.metaDescription || "",
      status: article.status,
      isFeatured: Boolean(article.isFeatured),
    });
    setEditorMode("EDIT");
    setFeedback(null);
  }

  function handleSelectCover(file: File | null) {
    if (!file) return;
    if (pendingCoverPreview) {
      URL.revokeObjectURL(pendingCoverPreview);
    }
    setPendingCoverFile(file);
    setPendingCoverPreview(URL.createObjectURL(file));
    setFeedback({
      type: "ok",
      text: "Gambar cover siap dan akan diunggah saat artikel disimpan.",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.contentHtml.trim()) {
      setFeedback({ type: "err", text: "Judul dan konten HTML wajib diisi." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      let resolvedCoverUrl = form.coverImageUrl.trim() || null;
      if (pendingCoverFile) {
        const { dataUrl: base64 } = await compressImageToDataUrl(pendingCoverFile, {
          maxDimension: 1400,
          quality: 0.82,
        });
        const upRes = await fetch("/api/proxy/articles/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64 }),
        });
        if (!upRes.ok) {
          const err = await upRes.json().catch(() => ({}));
          throw new Error(err?.message || "Gagal mengunggah gambar cover.");
        }
        const upData = await upRes.json();
        resolvedCoverUrl = upData.url;
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        contentHtml: form.contentHtml,
        coverImageUrl: resolvedCoverUrl,
        category: form.category,
        tags: form.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        city: form.city.trim(),
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        status: form.status,
        isFeatured: form.isFeatured,
      };

      const isEdit = Boolean(form.id);
      const res = await fetch(
        isEdit ? `/api/proxy/articles/${form.id}` : "/api/proxy/articles",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gagal menyimpan artikel.");
      }
      const saved: Article = await res.json();
      setArticles((prev) =>
        isEdit
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev],
      );
      loadArticleIntoForm(saved);
      setFeedback({
        type: "ok",
        text:
          saved.status === "PUBLISHED"
            ? "Artikel berhasil dipublikasikan!"
            : "Draft artikel berhasil disimpan.",
      });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(article: Article) {
    if (!window.confirm(`Hapus artikel "${article.title}"?`)) return;
    try {
      const res = await fetch(`/api/proxy/articles/${article.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gagal menghapus artikel.");
      }
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      if (form.id === article.id) {
        startNewArticle();
      }
      setFeedback({ type: "ok", text: "Artikel berhasil dihapus." });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal menghapus artikel.",
      });
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryBusy(true);
    setFeedback(null);
    try {
      const isEdit = Boolean(editingCategory);
      const res = await fetch(
        isEdit
          ? `/api/proxy/articles/categories/${editingCategory!.id}`
          : "/api/proxy/articles/categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            description: newCategoryDesc.trim(),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gagal menyimpan kategori.");
      }
      const saved: ArticleCategoryItem = await res.json();
      setCategories((prev) =>
        isEdit
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewCategoryName("");
      setNewCategoryDesc("");
      setEditingCategory(null);
      setFeedback({
        type: "ok",
        text: isEdit ? "Kategori diperbarui." : "Kategori baru ditambahkan.",
      });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal menyimpan kategori.",
      });
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleDeleteCategory(cat: ArticleCategoryItem) {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    setCategoryBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/proxy/articles/categories/${cat.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gagal menghapus kategori.");
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setFeedback({ type: "ok", text: "Kategori dihapus." });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal menghapus kategori.",
      });
    } finally {
      setCategoryBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
            <PenSquare className="h-3.5 w-3.5" />
            Studio Penulis Keyloka
          </span>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900">
            Halo, {currentUser.name}
          </h1>
          <p className="text-xs text-gray-500">
            Tulis dan kelola artikel SEO Keyloka. Editor mendukung teks biasa dan tag HTML (&lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a&gt;, dll).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCategoryManager((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Kelola Kategori
          </button>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat Blog
          </Link>
          <button
            type="button"
            onClick={startNewArticle}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Artikel Baru
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900">
              Kelola Kategori Artikel
            </h2>
            <button
              type="button"
              onClick={() => setShowCategoryManager(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            onSubmit={handleSaveCategory}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
          >
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nama kategori (mis. Review Kost)"
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Deskripsi singkat (opsional)"
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={categoryBusy}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingCategory ? "Update Kategori" : "Tambah Kategori"}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryDesc("");
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs"
              >
                <span className="font-bold text-gray-800">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(cat);
                    setNewCategoryName(cat.name);
                    setNewCategoryDesc(cat.description || "");
                  }}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={categoryBusy}
                  onClick={() => handleDeleteCategory(cat)}
                  className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Article List */}
        <aside className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900">
              Artikel Saya ({articles.length})
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau slug artikel..."
              className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-1.5">
            {(["ALL", "PUBLISHED", "DRAFT"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  filterStatus === st
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {st === "ALL" ? "Semua" : st === "PUBLISHED" ? "Terbit" : "Draft"}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredArticles.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                Belum ada artikel pada filter ini.
              </p>
            ) : (
              filteredArticles.map((art) => (
                <div
                  key={art.id}
                  className={`rounded-2xl border p-3 transition ${
                    form.id === art.id
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => loadArticleIntoForm(art)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          art.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {art.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                      <p className="mt-1 text-xs font-extrabold text-gray-900 line-clamp-2">
                        {art.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {formatArticleCategoryLabel(art.category)} • {art.viewCount} views
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(art)}
                      aria-label="Hapus artikel"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {art.status === "PUBLISHED" && (
                    <Link
                      href={`/blog/${art.slug}`}
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Buka Artikel
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right: Article Editor */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                <FileText className="h-4 w-4 text-emerald-600" />
                {form.id ? `Edit Artikel #${form.id}` : "Tulis Artikel Baru"}
              </h2>
              <div className="flex rounded-xl border border-gray-200 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditorMode("EDIT")}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 ${
                    editorMode === "EDIT"
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Editor HTML
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("PREVIEW")}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 ${
                    editorMode === "PREVIEW"
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </div>

            {editorMode === "PREVIEW" ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/40 p-5 space-y-4">
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {form.title || "(Belum ada judul)"}
                </h1>
                {(pendingCoverPreview || form.coverImageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingCoverPreview || resolveImageUrl(form.coverImageUrl)}
                    alt={form.title}
                    className="max-h-72 w-full rounded-2xl object-cover"
                  />
                )}
                <div
                  className="article-prose"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeArticleHtml(form.contentHtml),
                  }}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Judul Artikel *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="Contoh: 7 Tips Memilih Kost Dekat Kampus UB Malang yang Aman"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Slug URL (opsional, otomatis dari judul)
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, slug: e.target.value }))
                      }
                      placeholder="tips-memilih-kost-dekat-ub-malang"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Kategori
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tags (pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      value={form.tagsText}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, tagsText: e.target.value }))
                      }
                      placeholder="kost malang, mahasiswa, tips hemat"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Kota Terkait (untuk rekomendasi properti)
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="Contoh: Malang"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Cover Image (Upload atau URL)
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={form.coverImageUrl}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, coverImageUrl: e.target.value }))
                      }
                      placeholder="https://... atau upload gambar"
                      className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                      <ImagePlus className="h-4 w-4" />
                      {pendingCoverFile ? "Ganti Cover" : "Pilih Cover"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleSelectCover(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {pendingCoverPreview && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                      <span>Cover siap diunggah saat artikel disimpan.</span>
                      <button
                        type="button"
                        onClick={clearPendingCover}
                        className="font-bold text-red-600 hover:underline"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ringkasan / Excerpt
                  </label>
                  <textarea
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, excerpt: e.target.value }))
                    }
                    placeholder="Ringkasan singkat artikel untuk kartu blog dan preview..."
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Konten Artikel (Teks Biasa / HTML) *
                  </label>
                  <textarea
                    required
                    rows={14}
                    value={form.contentHtml}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contentHtml: e.target.value }))
                    }
                    placeholder={`<p>Mencari kost nyaman membutuhkan persiapan matang...</p>\n<h2>1. Perhatikan Lokasi dan Akses</h2>\n<p>Pastikan dekat dengan kampus atau transportasi umum.</p>`}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      SEO Meta Title (opsional)
                    </label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, metaTitle: e.target.value }))
                      }
                      placeholder="Maksimal 60-70 karakter"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      SEO Meta Description (opsional)
                    </label>
                    <input
                      type="text"
                      value={form.metaDescription}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, metaDescription: e.target.value }))
                      }
                      placeholder="Maksimal 150-160 karakter"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as "DRAFT" | "PUBLISHED",
                    }))
                  }
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-800"
                >
                  <option value="DRAFT">Simpan sebagai Draft</option>
                  <option value="PUBLISHED">Publish ke Publik</option>
                </select>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isFeatured: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  Jadikan Artikel Pilihan
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {form.status === "PUBLISHED" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving
                  ? "Menyimpan..."
                  : form.status === "PUBLISHED"
                    ? "Simpan & Publish"
                    : "Simpan Draft"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
