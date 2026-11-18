import Link from "next/link";
import { ArrowLeft, Building2, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Building2 className="h-8 w-8" />
      </div>
      <p className="mt-5 text-xs font-extrabold uppercase tracking-widest text-emerald-600">
        Error 404
      </p>
      <h1 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-600">
        Maaf, halaman atau properti yang Anda cari tidak tersedia, sudah dihapus, atau alamat URL-nya keliru.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition"
        >
          <Search className="h-4 w-4" />
          Cari Hunian di Beranda
        </Link>
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Buka FAQ
        </Link>
      </div>
    </div>
  );
}
