import { ImageResponse } from "next/og";

export const alt = "Keyloka — Cari Kost, Apartemen & Kontrakan Aman";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #064e3b 0%, #059669 55%, #10b981 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#ffffff",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 900,
            }}
          >
            K
          </div>
          <span style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Keyloka
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "920px" }}>
          <div
            style={{
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
            }}
          >
            Cari Kost, Apartemen & Kontrakan Aman
          </div>
          <div
            style={{
              fontSize: "26px",
              lineHeight: 1.4,
              color: "#d1fae5",
            }}
          >
            Pembayaran Escrow terlindungi, survei lokasi terverifikasi, dan poin loyalti setiap transaksi.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "22px",
            color: "#ecfdf5",
          }}
        >
          <span>Escrow Aman • Terverifikasi • Transparan</span>
          <span style={{ fontWeight: 700 }}>keyloka.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
