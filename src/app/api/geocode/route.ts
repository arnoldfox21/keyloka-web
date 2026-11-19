import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_HEADERS = {
  "User-Agent": "KeylokaWeb/1.0 (https://keyloka.id)",
  Accept: "application/json",
};

const ALLOWED_GMAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
]);

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

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function extractCoordsFromText(
  text: string,
): { lat: number; lng: number } | null {
  const trimmed = text.trim();

  // Direct coordinate input: "-7.9526, 112.6143" or "-7.9526 112.6143"
  const directMatch = trimmed.match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (directMatch) {
    const lat = Number(directMatch[1]);
    const lng = Number(directMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Google Maps URL patterns: !3dLAT!4dLNG, @LAT,LNG, or ?q=LAT,LNG / ll=LAT,LNG
  const patterns = [
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:q|ll|center)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,)\s*(-?\d{1,3}(?:\.\d+)?)/i,
  ];
  for (const regex of patterns) {
    const m = trimmed.match(regex);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidLatLng(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

async function resolveGoogleMapsUrl(raw: string): Promise<string> {
  const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) return raw;

  try {
    const parsed = new URL(urlMatch[0]);
    if (!ALLOWED_GMAPS_HOSTS.has(parsed.hostname.toLowerCase())) {
      return raw;
    }
    if (
      parsed.hostname.toLowerCase() === "maps.app.goo.gl" ||
      parsed.hostname.toLowerCase() === "goo.gl"
    ) {
      const res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return res.url || raw;
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function extractPlaceNameFromGmapsUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/]+)/i);
    if (placeMatch?.[1]) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
    }
    const qParam = u.searchParams.get("q");
    if (qParam && !extractCoordsFromText(qParam)) {
      return qParam.trim();
    }
  } catch {
    // Ignore invalid URL
  }
  return null;
}

async function reverseGeocode(lat: number, lng: number) {
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
      return { city: "", district: "", address: "" };
    }
    const decoded = (await res.json()) as Record<string, unknown>;
    return extractAddressParts(
      decoded.address as Record<string, unknown> | undefined,
      String(decoded.display_name ?? ""),
    );
  } catch {
    return { city: "", district: "", address: "" };
  }
}

async function searchPhoton(q: string, lat: number, lng: number) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "7");
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
  } else {
    url.searchParams.set("lat", "-2.5");
    url.searchParams.set("lon", "118.0");
  }

  try {
    const res = await fetch(url.toString(), {
      headers: NOMINATIM_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, unknown>;
      }>;
    };
    return (data.features || [])
      .filter((f) => {
        const cc = String(f.properties?.countrycode ?? "").toUpperCase();
        return !cc || cc === "ID";
      })
      .map((f) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        const itemLng = Number(coords[0]);
        const itemLat = Number(coords[1]);
        if (!isValidLatLng(itemLat, itemLng)) return null;

        const p = f.properties || {};
        const name = String(p.name ?? "").trim();
        const street = String(p.street ?? "").trim();
        const housenumber = String(p.housenumber ?? "").trim();
        const district = String(p.district ?? p.locality ?? "")
          .replace(/^(Kecamatan|Kec\.?)\s+/i, "")
          .trim();
        const city = String(p.city ?? p.county ?? p.state ?? "")
          .replace(/^Kab\.?\s+/i, "Kabupaten ")
          .trim();

        const streetLine = [street, housenumber].filter(Boolean).join(" ");
        const fullAddress = [name, streetLine, district, city, p.state]
          .map((v) => String(v || "").trim())
          .filter(Boolean)
          .join(", ");

        return {
          title: name || streetLine || `${itemLat.toFixed(5)}, ${itemLng.toFixed(5)}`,
          subtitle: fullAddress,
          lat: itemLat,
          lng: itemLng,
          city,
          district,
          address: fullAddress,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "reverse";

  if (mode === "search") {
    const rawQ = (searchParams.get("q") || "").trim();
    if (rawQ.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // 1. Check direct coordinates or Google Maps URL (including short links)
    let resolvedInput = rawQ;
    if (/https?:\/\//i.test(rawQ)) {
      resolvedInput = await resolveGoogleMapsUrl(rawQ);
    }

    const directCoords = extractCoordsFromText(resolvedInput);
    if (directCoords) {
      const parts = await reverseGeocode(directCoords.lat, directCoords.lng);
      const title =
        parts.address.split(",")[0]?.trim() ||
        `Titik Lokasi (${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)})`;
      return NextResponse.json({
        autoSelect: true,
        results: [
          {
            title,
            subtitle:
              parts.address ||
              `${directCoords.lat.toFixed(6)}, ${directCoords.lng.toFixed(6)}`,
            lat: directCoords.lat,
            lng: directCoords.lng,
            city: parts.city,
            district: parts.district,
            address: parts.address,
          },
        ],
      });
    }

    const placeFromUrl = /https?:\/\//i.test(resolvedInput)
      ? extractPlaceNameFromGmapsUrl(resolvedInput)
      : null;
    const q = normalizeStreetQuery(placeFromUrl || rawQ);
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
      const data = res.ok
        ? ((await res.json()) as Array<Record<string, unknown>>)
        : [];
      const nominatimResults = (Array.isArray(data) ? data : [])
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

      if (nominatimResults.length > 0) {
        return NextResponse.json({ results: nominatimResults });
      }

      const photonResults = await searchPhoton(q, lat, lng);
      return NextResponse.json({ results: photonResults });
    } catch {
      const photonResults = await searchPhoton(q, lat, lng);
      return NextResponse.json({ results: photonResults });
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

  const parts = await reverseGeocode(lat, lng);
  return NextResponse.json(parts);
}
