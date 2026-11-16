import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { serverFetch, getServerToken } from "@/lib/server-api";
import type { UserProfile } from "@/lib/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HuniVio — Cari Kost, Apartemen & Kontrakan Aman",
  description:
    "Platform pencarian & booking hunian dengan pembayaran Escrow aman, survei terverifikasi, dan poin loyalti.",
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
  const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptUrl = isProd
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F6F7F9] text-gray-900">
        {clientKey ? (
          <Script
            src={snapScriptUrl}
            data-client-key={clientKey}
            strategy="afterInteractive"
          />
        ) : null}
        <Navbar user={user} />
        <main className="flex-1">{children}</main>
        <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
          <div className="mx-auto max-w-7xl px-4">
            © {new Date().getFullYear()} HuniVio. Pembayaran langsung dilindungi Escrow HuniVio.
          </div>
        </footer>
      </body>
    </html>
  );
}
