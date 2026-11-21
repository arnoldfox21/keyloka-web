import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/request-security";

const NOMINATIM_HEADERS = {
  "User-Agent": "KeylokaWeb/1.0 (https://keyloka.id)",
  Accept: "application/json",
};

const OLC_ALPHABET = "23456789CFGHJMPQRVWX";

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
  const cleaned = text.trim().replace(/^\((.*)\)$/, "$1").trim();

  // Direct coordinate input: "-7.9526, 112.6143", "-7.9526 112.6143", or "112.6143, -7.9526"
  const directMatch = cleaned.match(
    /^([+-]?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d{1,3}(?:\.\d+)?)$/,
  );
  if (directMatch) {
    const a = Number(directMatch[1]);
    const b = Number(directMatch[2]);
    if (isValidLatLng(a, b)) return { lat: a, lng: b };
    if (isValidLatLng(b, a)) return { lat: b, lng: a };
  }

  // DMS format: e.g. 7°57'09.4"S 112°36'51.5"E
  const dmsRegex =
    /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSEW])/gi;
  const matches = [...cleaned.matchAll(dmsRegex)];
  if (matches.length === 2) {
    let lat: number | null = null;
    let lng: number | null = null;
    for (const m of matches) {
      const deg = Number(m[1]);
      const min = Number(m[2]);
      const sec = Number(m[3]);
      const dir = m[4].toUpperCase();
      let val = deg + min / 60 + sec / 3600;
      if (dir === "S" || dir === "W") val = -val;
      if (dir === "N" || dir === "S") lat = val;
      if (dir === "E" || dir === "W") lng = val;
    }
    if (lat !== null && lng !== null && isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

function decodeFullOlc(code: string): { lat: number; lng: number } | null {
  const clean = code.toUpperCase().replace(/\+/g, "").replace(/0+$/, "");
  if (clean.length < 2) return null;

  let lat = 0;
  let lng = 0;
  let latRes = 20;
  let lngRes = 20;
  const pairLen = Math.min(clean.length, 10);
  for (let i = 0; i < pairLen; i += 2) {
    const ld = OLC_ALPHABET.indexOf(clean[i]);
    const gd = OLC_ALPHABET.indexOf(clean[i + 1]);
    if (ld < 0 || gd < 0) return null;
    lat += ld * latRes;
    lng += gd * lngRes;
    if (i + 2 < pairLen) {
      latRes /= 20;
      lngRes /= 20;
    }
  }
  lat -= 90;
  lng -= 180;

  if (clean.length > 10) {
    for (let i = 10; i < Math.min(clean.length, 15); i++) {
      const idx = OLC_ALPHABET.indexOf(clean[i]);
      if (idx < 0) return null;
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      latRes /= 5;
      lngRes /= 4;
      lat += row * latRes;
      lng += col * lngRes;
    }
  }

  const centerLat = lat + latRes / 2;
  const centerLng = lng + lngRes / 2;
  return isValidLatLng(centerLat, centerLng)
    ? { lat: centerLat, lng: centerLng }
    : null;
}

function recoverShortOlc(
  shortCode: string,
  refLat: number,
  refLng: number,
): { lat: number; lng: number } | null {
  const upper = shortCode.toUpperCase();
  const plusIdx = upper.indexOf("+");
  if (plusIdx < 2 || plusIdx > 6 || plusIdx % 2 !== 0) return null;

  const paddingLen = 8 - plusIdx;
  const resolution = Math.pow(20, 2 - paddingLen / 2);
  let rLat = Math.min(Math.max(refLat + 90, 0), 179.999999);
  let rLng = (((refLng + 180) % 360) + 360) % 360;
  let prefix = "";
  let place = 20;
  for (let i = 0; i < paddingLen / 2; i++) {
    const ld = Math.min(19, Math.floor(rLat / place));
    const gd = Math.min(19, Math.floor(rLng / place));
    prefix += OLC_ALPHABET[ld] + OLC_ALPHABET[gd];
    rLat -= ld * place;
    rLng -= gd * place;
    place /= 20;
  }

  const decoded = decodeFullOlc(prefix + upper);
  if (!decoded) return null;

  let { lat, lng } = decoded;
  if (lat - refLat > resolution / 2) lat -= resolution;
  else if (lat - refLat < -resolution / 2) lat += resolution;
  if (lng - refLng > resolution / 2) lng -= resolution;
  else if (lng - refLng < -resolution / 2) lng += resolution;

  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

function extractPlusCode(text: string): {
  code: string;
  isFull: boolean;
  restText: string;
} | null {
  const match = text.match(
    /(?:^|[\s,])([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})(?=$|[\s,])/i,
  );
  if (!match?.[1]) return null;

  const code = match[1].toUpperCase();
  const plusIdx = code.indexOf("+");
  const isFull = plusIdx === 8;
  const restText = text
    .replace(match[1], " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return { code, isFull, restText };
}

function cleanAdminSegment(seg: string): string {
  return normalizeStreetQuery(seg)
    .replace(/^(?:Kec\.?|Kecamatan|Kel\.?|Kelurahan|Ds\.?|Desa)\s+/i, "")
    .replace(/\b\d{5}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAddressCandidates(rawAddress: string): string[] {
  const seen = new Set<string>();
  const add = (val: string) => {
    const v = val.trim();
    if (v.length >= 2 && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      candidates.push(v);
    }
  };
  const candidates: string[] = [];

  add(normalizeStreetQuery(rawAddress));

  const rawParts = rawAddress
    .split(",")
    .map((p) => cleanAdminSegment(p))
    .filter((p) => p.length >= 2);

  if (rawParts.length >= 2) {
    add(rawParts.join(", "));
  }

  // Drop leading POI name and try progressively simpler locality combinations
  if (rawParts.length >= 3) {
    const startIdx = /^(?:Jalan|Gang|Blok|Perum|Komplek)\b/i.test(rawParts[0])
      ? 0
      : 1;
    const streetOrArea = rawParts[startIdx];
    const cityIdx = rawParts.findIndex((p) => /^(?:Kota|Kabupaten)\b/i.test(p));
    const cityPart = cityIdx >= 0 ? rawParts[cityIdx] : undefined;

    if (streetOrArea && cityPart && streetOrArea !== cityPart) {
      const midParts = rawParts.slice(startIdx + 1, cityIdx);
      // Prefer village/subdistrict closer to cityPart over hamlet names near the street
      for (const area of midParts.slice().reverse()) {
        add(`${streetOrArea}, ${area}, ${cityPart}`);
      }
      add(`${streetOrArea}, ${cityPart}`);
    }

    for (let i = startIdx; i < rawParts.length - 1; i++) {
      add(rawParts.slice(i).join(", "));
    }
  }

  return candidates.slice(0, 6);
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

interface GeocodeResultItem {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  city: string;
  district: string;
  address: string;
}

async function searchNominatim(
  q: string,
  lat: number,
  lng: number,
): Promise<GeocodeResultItem[]> {
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
    if (!res.ok) return [];
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return (Array.isArray(data) ? data : [])
      .map((item): GeocodeResultItem | null => {
        const itemLat = Number(item.lat);
        const itemLng = Number(item.lon);
        if (!isValidLatLng(itemLat, itemLng)) return null;

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
      .filter((item): item is GeocodeResultItem => item !== null);
  } catch {
    return [];
  }
}

async function geocodeCandidates(
  candidates: string[],
  lat: number,
  lng: number,
): Promise<GeocodeResultItem[]> {
  if (candidates.length === 0) return [];

  const primary = await searchNominatim(candidates[0], lat, lng);
  if (primary.length > 0) return primary;

  for (const candidate of candidates) {
    const photonResults = (await searchPhoton(candidate, lat, lng)).filter(
      (item): item is GeocodeResultItem => item !== null,
    );
    if (photonResults.length > 0) return photonResults;
  }

  for (const fallbackCandidate of candidates.slice(1).reverse().slice(0, 2)) {
    const fallbackResults = await searchNominatim(fallbackCandidate, lat, lng);
    if (fallbackResults.length > 0) return fallbackResults;
  }

  return [];
}

async function buildAutoSelectResponse(
  lat: number,
  lng: number,
  preferredTitle?: string,
) {
  const parts = await reverseGeocode(lat, lng);
  const title =
    preferredTitle ||
    parts.address.split(",")[0]?.trim() ||
    `Titik Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  return NextResponse.json({
    autoSelect: true,
    results: [
      {
        title,
        subtitle: parts.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng,
        city: parts.city,
        district: parts.district,
        address: parts.address,
      },
    ],
  });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`geocode:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: "Terlalu banyak permintaan pencarian lokasi. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "reverse";

  if (mode === "search") {
    const rawQ = (searchParams.get("q") || "").trim();
    if (rawQ.length < 2) {
      return NextResponse.json({ results: [] });
    }
    if (rawQ.length > 300) {
      return NextResponse.json(
        { message: "Query lokasi terlalu panjang.", results: [] },
        { status: 400 },
      );
    }

    const rawLat = searchParams.get("lat");
    const rawLng = searchParams.get("lng");
    const lat =
      rawLat !== null && rawLat.trim() !== "" ? Number(rawLat) : Number.NaN;
    const lng =
      rawLng !== null && rawLng.trim() !== "" ? Number(rawLng) : Number.NaN;

    // 1. Check direct coordinates (latitude, longitude or longitude, latitude)
    const directCoords = extractCoordsFromText(rawQ);
    if (directCoords) {
      return buildAutoSelectResponse(directCoords.lat, directCoords.lng);
    }

    // 2. Check Google Plus Code (e.g. "3HJW+J97 ZikZak Kost, Jl. Notojoyo, ... Malang")
    const plusCodeInfo = extractPlusCode(rawQ);
    if (plusCodeInfo) {
      let decoded: { lat: number; lng: number } | null = null;
      if (plusCodeInfo.isFull) {
        decoded = decodeFullOlc(plusCodeInfo.code);
      } else {
        const refCandidates = plusCodeInfo.restText
          ? buildAddressCandidates(plusCodeInfo.restText)
          : [];
        const refMatches = await geocodeCandidates(refCandidates, lat, lng);
        const refCoords =
          refMatches.length > 0
            ? { lat: refMatches[0].lat, lng: refMatches[0].lng }
            : Number.isFinite(lat) && Number.isFinite(lng)
              ? { lat, lng }
              : null;
        if (refCoords) {
          decoded = recoverShortOlc(
            plusCodeInfo.code,
            refCoords.lat,
            refCoords.lng,
          );
        }
      }

      if (decoded) {
        const firstSegment = plusCodeInfo.restText.split(",")[0]?.trim();
        const preferredTitle =
          firstSegment &&
          !/^(?:Jl\.?|Jln\.?|Jalan|Gg\.?|Gang)\b/i.test(firstSegment)
            ? firstSegment
            : undefined;
        return buildAutoSelectResponse(
          decoded.lat,
          decoded.lng,
          preferredTitle,
        );
      }
    }

    const candidates = buildAddressCandidates(
      plusCodeInfo?.restText || rawQ,
    );
    if (candidates.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await geocodeCandidates(candidates, lat, lng);
    return NextResponse.json({ results });
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
