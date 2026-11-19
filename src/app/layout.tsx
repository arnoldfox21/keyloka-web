import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AdSenseScript } from "@/components/AdSenseScript";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";
import { serverFetch, getServerToken } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Keyloka — Cari Kost, Apartemen & Kontrakan Aman",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    title: "Keyloka — Cari Kost, Apartemen & Kontrakan Aman",
    description: DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Keyloka — Cari Kost, Apartemen & Kontrakan Aman",
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

async function getCurrentUser(): Promise<UserProfile | null> {
  const token = await getServerToken();
  if (!token) return null;
  try {
    return await serverFetch<UserProfile>("/auth/me");
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const isDuitkuProd = process.env.NEXT_PUBLIC_DUITKU_IS_PRODUCTION === "true";
  const duitkuScriptUrl = isDuitkuProd
    ? "https://app-prod.duitku.com/lib/js/duitku.js"
    : "https://app-sandbox.duitku.com/lib/js/duitku.js";
  const gaId = (process.env.NEXT_PUBLIC_GA_ID || "").trim();

  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F6F7F9] text-gray-900">
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
        <Script src={duitkuScriptUrl} strategy="afterInteractive" />
        <Navbar user={user} />
        <main className="flex-1">{children}</main>
        <Footer user={user} />
        <AdSenseScript />
      </body>
    </html>
  );
}
