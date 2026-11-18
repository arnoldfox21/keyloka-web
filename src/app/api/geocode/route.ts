import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_HEADERS = {
  "User-Agent": "KeylokaWeb/1.0 (https://keyloka.id)",
  Accept: "application/json",
};

function normalizeStreetQuery(raw: string): string {
  return raw
    .trim()
    .replace(/\b(?:jln\.?|jl\.?)\s+/gi, "Jalan ")
    .replace(/\bgg\.?\s+/gi, "Gang ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAddressParts(
  addr: Record<string, unknown> | undefined,
  displayName?: string,
) {
  const safeAddr = addr || {};
  let district = String(
    safeAddr.city_district ??
      safeAddr.district ??
      safeAddr.suburb ??
      safeAddr.village ??
      safeAddr.town ??
      "",
  ).trim();

  let city = String(
    safeAddr.city ??
      safeAddr.county ??
      safeAddr.municipality ??
      safeAddr.state_district ??
      safeAddr.regency ??
      "",
  ).trim();

  district = district.replace(/^(Kecamatan|Kec\.?)\s+/i, "").trim();
  city = city.replace(/^Kab\.?\s+/i, "Kabupaten ").trim();

  const address = String(displayName ?? "").trim();
  return { city, district, address };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "reverse";

  if (mode === "search") {
    const rawQ = searchParams.get("q") || "";
    const q = normalizeStreetQuery(rawQ);
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", q);
    url.searchParams.set("countrycodes", "id");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "7");
    url.searchParams.set("accept-language", "id");
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      url.searchParams.set(
        "viewbox",
        `${lng - 0.15},${lat + 0.15},${lng + 0.15},${lat - 0.15}`,
      );
    }

    try {
      const res = await fetch(url.toString(), {
        headers: NOMINATIM_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        return NextResponse.json({ results: [] });
      }
      const data = (await res.json()) as Array<Record<string, unknown>>;
      const results = (Array.isArray(data) ? data : [])
        .map((item) => {
          const itemLat = Number(item.lat);
          const itemLng = Number(item.lon);
          if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) {
            return null;
          }
          const displayName = String(item.display_name ?? "").trim();
          const name = String(item.name ?? "").trim();
          const parts = extractAddressParts(
            item.address as Record<string, unknown> | undefined,
            displayName,
          );
          const title =
            name ||
            displayName.split(",")[0]?.trim() ||
            `${itemLat.toFixed(5)}, ${itemLng.toFixed(5)}`;
          return {
            title,
            subtitle: displayName,
            lat: itemLat,
            lng: itemLng,
            city: parts.city,
            district: parts.district,
            address: parts.address,
          };
        })
        .filter(Boolean);

      return NextResponse.json({ results });
    } catch {
      return NextResponse.json({ results: [] });
    }
  }

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { city: "", district: "", address: "" },
      { status: 400 },
    );
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "id");

    const res = await fetch(url.toString(), {
      headers: NOMINATIM_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return NextResponse.json({ city: "", district: "", address: "" });
    }
    const decoded = (await res.json()) as Record<string, unknown>;
    const parts = extractAddressParts(
      decoded.address as Record<string, unknown> | undefined,
      String(decoded.display_name ?? ""),
    );
    return NextResponse.json(parts);
  } catch {
    return NextResponse.json({ city: "", district: "", address: "" });
  }
}
