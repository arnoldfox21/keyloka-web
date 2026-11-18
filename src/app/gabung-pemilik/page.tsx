import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pasang Iklan Kost, Kontrakan, Villa & Apartemen Gratis",
  description:
    "Kelola dan pasarkan properti kost, apartemen, kontrakan, villa, dan homestay Anda di Keyloka. Gratis pasang iklan, sistem Escrow aman, dan dashboard pemilik lengkap.",
  alternates: {
    canonical: "/gabung-pemilik",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/gabung-pemilik",
    title: `Gabung Pemilik Properti | ${SITE_NAME}`,
    description:
      "Jangkau lebih banyak calon penyewa potensial, kelola pertanyaan ketersediaan, jadwal survei, dan terima pembayaran aman lewat Keyloka.",
  },
};

const BENEFITS = [
  {
    icon: Building2,
    title: "Gratis Pasang Iklan Properti",
    description:
      "Publikasikan kost, apartemen, kontrakan, villa, maupun homestay lengkap dengan foto, fasilitas, dan titik peta tanpa biaya pendaftaran.",
  },
  {
    icon: ShieldCheck,
    title: "Transaksi Terlindungi Escrow",
    description:
      "Tingkatkan kepercayaan calon penyewa dengan sistem pembayaran resmi (QRIS, Virtual Account, e-Wallet) dan pencairan dana transparan.",
  },
  {
    icon: CalendarCheck,
    title: "Kelola Ketersediaan & Survei",
    description:
      "Terima permintaan tanya ketersediaan, jadwal survei, dan booking langsung dari satu dashboard pemilik yang rapi.",
  },
  {
    icon: MessageCircle,
    title: "Chat & Grup Penghuni Terintegrasi",
    description:
      "Komunikasi langsung dengan calon penyewa maupun penghuni aktif tanpa perlu membagikan nomor pribadi jika tidak diinginkan.",
  },
  {
    icon: Wallet,
    title: "Dompet Pemilik & Penarikan Mudah",
    description:
      "Pantau pemasukan sewa secara real-time dan ajukan penarikan dana ke rekening bank Anda langsung dari menu Dashboard.",
  },
  {
    icon: CheckCircle2,
    title: "Badge Pemilik Terverifikasi",
    description:
      "Dapatkan lencana terverifikasi untuk menaikkan kredibilitas listing dan mempercepat keputusan sewa calon penyewa.",
  },
];

export default function GabungPemilikPage() {
  const siteUrl = getSiteUrl();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Gabung Pemilik",
        item: `${siteUrl}/gabung-pemilik`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-7 sm:p-12 text-white shadow-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            <Building2 className="h-3.5 w-3.5 text-emerald-200" />
            Solusi Pemilik & Pengelola Properti
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Pasarkan Kost, Kontrakan & Villa Anda Lebih Cepat dan Aman
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-emerald-50/90 leading-relaxed">
            Jangkau ribuan pencari hunian aktif, kelola pertanyaan ketersediaan & jadwal survei,
            serta terima pembayaran sewa secara otomatis dalam satu platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/new-property"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-emerald-800 shadow-sm hover:bg-emerald-50 transition"
            >
              Pasang Iklan Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition"
            >
              Pelajari FAQ Pemilik
            </Link>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-extrabold text-gray-900">{item.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
