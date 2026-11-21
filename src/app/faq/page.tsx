import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ & Panduan Transaksi Aman",
  description:
    "Pertanyaan yang sering diajukan seputar cara cari kost, tanya ketersediaan, jadwal survei, sistem pembayaran Escrow, dan pemasangan iklan properti di Keyloka.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/faq",
    title: `FAQ & Panduan Transaksi Aman | ${SITE_NAME}`,
    description:
      "Jawaban lengkap seputar booking kost, pembayaran Escrow, poin loyalti, dan cara bergabung sebagai pemilik properti di Keyloka.",
  },
};

const FAQ_ITEMS = [
  {
    category: "Untuk Pencari Hunian",
    question: "Apa itu sistem pembayaran Escrow di Keyloka?",
    answer:
      "Escrow adalah sistem rekening bersama yang menahan dana sewa Anda dengan aman. Dana baru diteruskan ke pemilik properti setelah Anda melakukan konfirmasi check-in sesuai kesepakatan, sehingga transaksi terhindar dari risiko penipuan.",
  },
  {
    category: "Untuk Pencari Hunian",
    question: "Apakah menjadwalkan survei atau mengecek ketersediaan dikenakan biaya?",
    answer:
      "Tidak. Anda dapat menekan tombol Jadwalkan Survei Dulu / Survei & Cek Ketersediaan di halaman properti secara gratis untuk memastikan kamar masih kosong dan menyepakati jadwal survei dengan pemilik.",
  },
  {
    category: "Untuk Pencari Hunian",
    question: "Apa perbedaan Jadwalkan Survei dan Booking Sekarang (Escrow)?",
    answer:
      "Jadwalkan Survei Dulu / Survei & Cek Ketersediaan cocok jika Anda ingin memastikan kondisi kamar atau menjadwalkan survei terlebih dahulu tanpa langsung membayar. Booking Sekarang (Escrow) memungkinkan Anda langsung mengunci kamar dengan pembayaran penuh atau DP secara aman.",
  },
  {
    category: "Untuk Pencari Hunian",
    question: "Bagaimana cara kerja Poin Loyalti Keyloka?",
    answer:
      "Setiap transaksi booking yang berhasil diselesaikan di Keyloka akan memberikan poin loyalti yang dapat ditukarkan sebagai potongan harga pada transaksi sewa berikutnya.",
  },
  {
    category: "Untuk Pemilik Properti",
    question: "Apakah pasang iklan kost, kontrakan, atau villa di Keyloka gratis?",
    answer:
      "Ya, pemilik properti dapat mendaftarkan dan mempublikasikan listing kost, apartemen, kontrakan, villa, maupun homestay secara gratis di Keyloka.",
  },
  {
    category: "Untuk Pemilik Properti",
    question: "Bagaimana cara pemilik menerima pencairan dana sewa?",
    answer:
      "Setelah penyewa melakukan check-in dan transaksi terkonfirmasi, saldo sewa otomatis masuk ke Dompet Pemilik di Dashboard dan dapat ditarik ke rekening bank Anda kapan saja.",
  },
];

export default function FaqPage() {
  const siteUrl = getSiteUrl();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "FAQ", item: `${siteUrl}/faq` },
    ],
  };

  return (
    <>
      <JsonLd data={[faqJsonLd, breadcrumbJsonLd]} />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 p-6 sm:p-10 text-white shadow-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            <HelpCircle className="h-3.5 w-3.5" />
            Pusat Informasi Keyloka
          </span>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/90 leading-relaxed">
            Pelajari cara kerja transaksi Escrow, tanya ketersediaan kamar, poin loyalti, hingga
            pengelolaan properti untuk pemilik di Keyloka.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs"
            >
              <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {item.category}
              </span>
              <h2 className="mt-2 text-base sm:text-lg font-extrabold text-gray-900">
                {item.question}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Siap mencari atau memasarkan hunian Anda?
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Jelajahi ribuan listing terverifikasi atau pasang iklan properti Anda secara gratis.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              Cari Hunian
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/gabung-pemilik"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
            >
              Untuk Pemilik Properti
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
