"use client";

import { useEffect, useRef } from "react";
import { Crosshair, MapPin } from "lucide-react";

interface KostLocationPickerProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}

export function KostLocationPicker({
  latitude,
  longitude,
  onChange,
}: KostLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);

  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  const hasCoords =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng);

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
        const map = L.map(containerRef.current).setView(center, hasCoords ? 15 : 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          onChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
        });

        mapRef.current = map;
      }

      const map = mapRef.current;
      if (!map) return;

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      if (hasCoords) {
        markerRef.current = L.circleMarker([parsedLat, parsedLng], {
          radius: 9,
          color: "#047857",
          fillColor: "#10b981",
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
        map.panTo([parsedLat, parsedLng]);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [hasCoords, parsedLat, parsedLng, onChange]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  function detectGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
      },
      () => {},
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          Pin Lokasi Properti di Peta (Klik peta untuk memilih titik)
        </p>
        <button
          type="button"
          onClick={detectGps}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
        >
          <Crosshair className="h-3 w-3" />
          Gunakan GPS Saya
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 z-0"
      />
    </div>
  );
}
