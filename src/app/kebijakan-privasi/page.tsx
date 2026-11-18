import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi Keyloka mengenai pengumpulan, penggunaan, penyimpanan, dan perlindungan data pribadi pengguna serta pemilik properti.",
  alternates: {
    canonical: "/kebijakan-privasi",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/kebijakan-privasi",
    title: `Kebijakan Privasi | ${SITE_NAME}`,
    description:
      "Komitmen Keyloka dalam melindungi data pribadi dan keamanan transaksi pengguna.",
  },
};

export default function KebijakanPrivasiPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Lock className="h-3.5 w-3.5" />
            Privasi & Keamanan Data
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            Kebijakan Privasi Keyloka
          </h1>
          <p className="mt-1.5 text-xs text-gray-500">
            Terakhir diperbarui: November 2026
          </p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            1. Data yang Kami Kumpulkan
          </h2>
          <p>
            Keyloka mengumpulkan data yang Anda berikan saat mendaftar atau bertransaksi, seperti
            nama, alamat email, nomor telepon/WhatsApp, data properti yang didaftarkan, serta
            riwayat booking dan pesan di dalam platform.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            2. Penggunaan Data
          </h2>
          <p>
            Data digunakan untuk memfasilitasi komunikasi antara penyewa dan pemilik properti,
            memproses pembayaran Escrow, mencegah aktivitas penipuan atau spam (termasuk melalui
            verifikasi Google reCAPTCHA), serta meningkatkan relevansi pencarian hunian.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            3. Keamanan & Penyimpanan
          </h2>
          <p>
            Sesi login diamankan menggunakan cookie terenkripsi (`HttpOnly`). Keyloka tidak pernah
            menjual data pribadi Anda kepada pihak ketiga. Data pembayaran diproses secara aman oleh
            mitra payment gateway tersertifikasi.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            4. Hak Pengguna
          </h2>
          <p>
            Anda dapat memperbarui informasi profil kapan saja melalui menu Profil atau meminta
            penghapusan akun dan data pribadi dengan menghubungi{" "}
            <a href="mailto:halo@keyloka.com" className="font-bold text-emerald-700 hover:underline">
              halo@keyloka.com
            </a>
            .
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6 text-xs">
          <Link
            href="/syarat-ketentuan"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
          >
            <ShieldCheck className="h-4 w-4" />
            Baca Syarat & Ketentuan →
          </Link>
          <Link href="/" className="font-semibold text-gray-500 hover:text-gray-800">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
