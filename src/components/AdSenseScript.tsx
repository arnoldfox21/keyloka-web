import Script from "next/script";

/**
 * Loads the Google AdSense script when `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is configured.
 */
export function AdSenseScript() {
  const clientId = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "").trim();
  if (!clientId) return null;

  return (
    <Script
      id="google-adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
      crossOrigin="anonymous"
    />
  );
}
