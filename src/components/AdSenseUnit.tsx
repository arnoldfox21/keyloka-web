"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSenseUnitProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  layout?: "in-article";
  minHeightClass?: string;
  className?: string;
}

/**
 * Reusable Google AdSense ad slot with anti-CLS min-height.
 * Renders nothing when AdSense client ID or slot ID is not configured.
 */
export function AdSenseUnit({
  slot,
  format = "auto",
  layout,
  minHeightClass = "min-h-[100px]",
  className = "",
}: AdSenseUnitProps) {
  const clientId = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "").trim();
  const slotId = (slot || "").trim();
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!clientId || !slotId || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Abaikan jika script AdSense diblokir oleh browser/adblocker
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-gray-200/80 bg-gray-50/70 p-2.5 text-center ${minHeightClass} ${className}`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Iklan
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", textAlign: layout === "in-article" ? "center" : undefined }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout": layout } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}
