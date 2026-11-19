import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const rawPubId = (process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "").trim();
  const pubId = rawPubId.replace(/^ca-/i, "");

  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : "# Google AdSense publisher ID belum dikonfigurasi (NEXT_PUBLIC_ADSENSE_PUBLISHER_ID)\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
