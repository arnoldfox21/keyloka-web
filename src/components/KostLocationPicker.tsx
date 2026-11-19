"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";

export interface ResolvedLocationAddress {
  city: string;
  district: string;
  address: string;
}

interface SearchResultItem {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  city: string;
  district: string;
  address: string;
}

interface KostLocationPickerProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  onLocationResolved?: (resolved: ResolvedLocationAddress) => void;
}

export function KostLocationPicker({
  latitude,
  longitude,
  onChange,
  onLocationResolved,
}: KostLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const onResolvedRef = useRef(onLocationResolved);

  useEffect(() => {
    onChangeRef.current = onChange;
    onResolvedRef.current = onLocationResolved;
  }, [onChange, onLocationResolved]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  const hasCoords =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng);

  const triggerReverseGeocode = useCallback((lat: number, lng: number) => {
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    setResolvingAddress(true);
    reverseTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?mode=reverse&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as ResolvedLocationAddress;
        const formatted =
          data.address ||
          [data.district, data.city].filter(Boolean).join(", ");
        if (formatted) {
          setDetectedAddress(formatted);
        }
        if (data.city || data.district || data.address) {
          onResolvedRef.current?.(data);
        }
      } catch {
        // Ignore network failure during reverse geocode
      } finally {
        setResolvingAddress(false);
      }
    }, 350);
  }, []);

  const handleSelectSearchResult = useCallback(
    (item: SearchResultItem) => {
      const latStr = item.lat.toFixed(6);
      const lngStr = item.lng.toFixed(6);
      setSearchQuery(item.title);
      setSearchResults([]);
      setHasSearched(false);
      setDetectedAddress(item.subtitle || item.title);
      onChangeRef.current(latStr, lngStr);
      mapRef.current?.setView([item.lat, item.lng], 16, { animate: true });

      if (item.city || item.district || item.address) {
        onResolvedRef.current?.({
          city: item.city,
          district: item.district,
          address: item.address || item.subtitle,
        });
      } else {
        triggerReverseGeocode(item.lat, item.lng);
      }
    },
    [triggerReverseGeocode],
  );

  const performSearch = useCallback(
    async (rawQuery: string) => {
      const q = rawQuery.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const qs = new URLSearchParams({ mode: "search", q });
        if (hasCoords) {
          qs.set("lat", String(parsedLat));
          qs.set("lng", String(parsedLng));
        }
        const res = await fetch(`/api/geocode?${qs.toString()}`);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await res.json()) as {
          autoSelect?: boolean;
          results?: SearchResultItem[];
        };
        const items = Array.isArray(data.results) ? data.results : [];
        if (data.autoSelect && items.length > 0) {
          handleSelectSearchResult(items[0]);
          return;
        }
        setSearchResults(items);
        setHasSearched(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [handleSelectSearchResult, hasCoords, parsedLat, parsedLng],
  );

  function handleSearchInput(val: string) {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 450);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      if (!document.getElementById("leaflet-css-cdn")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-cdn";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!mapRef.current) {
        const center: [number, number] = hasCoords
          ? [parsedLat, parsedLng]
          : [-7.9666, 112.6326];
        const map = L.map(containerRef.current).setView(
          center,
          hasCoords ? 16 : 12,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
          triggerReverseGeocode(lat, lng);
        });

        mapRef.current = map;
      }

      const map = mapRef.current;
      if (!map) return;

      if (hasCoords) {
        if (!markerRef.current) {
          const pinIcon = L.divIcon({
            className: "",
            html: `<div style="width:28px;height:28px;border-radius:9999px;background:#059669;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#ffffff;"></div></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([parsedLat, parsedLng], {
            icon: pinIcon,
            draggable: true,
          }).addTo(map);

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            const lat = Number(pos.lat.toFixed(6));
            const lng = Number(pos.lng.toFixed(6));
            onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
            triggerReverseGeocode(lat, lng);
          });

          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng([parsedLat, parsedLng]);
        }
        map.panTo([parsedLat, parsedLng]);
      } else if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [hasCoords, parsedLat, parsedLng, triggerReverseGeocode]);

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function detectGps() {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung deteksi GPS.");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
        mapRef.current?.setView([lat, lng], 16, { animate: true });
        triggerReverseGeocode(lat, lng);
        setDetectingGps(false);
      },
      () => {
        setDetectingGps(false);
        setGpsError("Izin lokasi ditolak atau GPS tidak tersedia.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2.5 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          Pin Lokasi Properti di Peta (Klik/geser pin untuk auto-isi alamat)
        </p>
        <button
          type="button"
          disabled={detectingGps}
          onClick={detectGps}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {detectingGps ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Crosshair className="h-3 w-3" />
          )}
          {detectingGps ? "Mendeteksi..." : "Gunakan GPS Saya"}
        </button>
      </div>

      {/* Search alamat di peta */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              performSearch(searchQuery);
            }
          }}
          placeholder="Cari jalan, area, atau tempel link Google Maps / koordinat..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-16 py-2 text-xs font-medium text-gray-900 focus:border-emerald-500 focus:outline-none"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setHasSearched(false);
              }}
              aria-label="Hapus pencarian"
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {(searchResults.length > 0 || (hasSearched && !searching)) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {searchResults.length === 0 ? (
              <p className="px-3.5 py-2.5 text-xs text-gray-500 leading-relaxed">
                Lokasi tidak ditemukan. Coba ketik nama jalan/kecamatan, atau buka Google Maps →{" "}
                <strong>Bagikan</strong> → <strong>Salin Link</strong> lalu tempel di kolom ini.
              </p>
            ) : (
              searchResults.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="flex w-full items-start gap-2.5 border-b border-gray-100 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-emerald-50/70"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">
                      {item.title}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-gray-500">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        Tips: Jika nama properti tidak muncul, buka Google Maps → <strong>Bagikan</strong> → <strong>Salin Link</strong> lalu tempel di kolom pencarian di atas.
      </p>

      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 z-0"
      />

      {gpsError && (
        <p className="text-[11px] font-semibold text-red-600">{gpsError}</p>
      )}

      {(resolvingAddress || detectedAddress) && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
          {resolvingAddress ? (
            <>
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" />
              <span>Mendeteksi alamat lengkap dari titik peta...</span>
            </>
          ) : (
            <>
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="leading-relaxed">
                <strong>Alamat terdeteksi:</strong> {detectedAddress}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
