import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform Keyloka untuk pencari hunian dan pemilik properti, termasuk aturan transaksi Escrow, survei, dan pembatalan.",
  alternates: {
    canonical: "/syarat-ketentuan",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/syarat-ketentuan",
    title: `Syarat & Ketentuan | ${SITE_NAME}`,
    description:
      "Ketentuan resmi penggunaan layanan pencarian, booking, dan transaksi Escrow di Keyloka.",
  },
};

export default function SyaratKetentuanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <FileText className="h-3.5 w-3.5" />
            Dokumen Legal
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            Syarat & Ketentuan Keyloka
          </h1>
          <p className="mt-1.5 text-xs text-gray-500">
            Terakhir diperbarui: November 2026
          </p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            1. Ruang Lingkup Layanan
          </h2>
          <p>
            Keyloka adalah platform penghubung antara pencari hunian (penyewa) dan pemilik/pengelola
            properti (kost, apartemen, kontrakan, villa, dan homestay) di Indonesia, lengkap dengan
            fitur tanya ketersediaan, jadwal survei, chat, serta pembayaran Escrow.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            2. Akun & Keakuratan Informasi
          </h2>
          <p>
            Pengguna bertanggung jawab atas keakuratan data profil, informasi properti, harga sewa,
            serta ketersediaan kamar yang dicantumkan. Keyloka berhak meninjau, menonaktifkan, atau
            menghapus listing yang terbukti melanggar ketentuan atau dilaporkan bermasalah.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            3. Transaksi Booking & Sistem Escrow
          </h2>
          <p>
            Dana yang dibayarkan melalui fitur Booking Langsung (Escrow) ditahan sementara oleh
            Keyloka melalui mitra pembayaran resmi. Dana akan diteruskan ke Dompet Pemilik setelah
            penyewa melakukan konfirmasi check-in atau melewati masa tunggu sesuai kebijakan yang berlaku.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            4. Pembatalan & Sengketa
          </h2>
          <p>
            Pengajuan pembatalan sebelum pembayaran dapat dilakukan langsung melalui menu Booking.
            Apabila terjadi ketidaksesuaian kondisi properti saat check-in, penyewa dapat mengajukan
            sengketa (dispute) melalui halaman Booking agar ditinjau oleh tim Staff/Admin Keyloka.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-extrabold text-gray-900">
            5. Kontak Resmi
          </h2>
          <p>
            Untuk pertanyaan terkait syarat dan ketentuan ini, hubungi kami di{" "}
            <a href="mailto:halo@keyloka.com" className="font-bold text-emerald-700 hover:underline">
              halo@keyloka.com
            </a>
            .
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6 text-xs">
          <Link
            href="/kebijakan-privasi"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
          >
            <ShieldCheck className="h-4 w-4" />
            Baca Kebijakan Privasi →
          </Link>
          <Link href="/" className="font-semibold text-gray-500 hover:text-gray-800">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
