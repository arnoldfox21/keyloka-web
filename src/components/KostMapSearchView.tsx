"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin, Star, X } from "lucide-react";
import { formatCategoryLabel, formatRupiah, resolveImageUrl } from "@/lib/types";
import type { MapPoint } from "@/lib/types";

interface KostMapSearchViewProps {
  points: MapPoint[];
  loading: boolean;
}

export function KostMapSearchView({ points, loading }: KostMapSearchViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [selected, setSelected] = useState<MapPoint | null>(null);

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
        const map = L.map(containerRef.current).setView([-7.9666, 112.6326], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        layerGroupRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
      }

      const map = mapRef.current;
      const group = layerGroupRef.current;
      if (!map || !group) return;

      group.clearLayers();
      const validPoints = points.filter(
        (p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)),
      );

      const coords: [number, number][] = [];
      for (const pt of validPoints) {
        const lat = Number(pt.latitude);
        const lng = Number(pt.longitude);
        coords.push([lat, lng]);

        const displayPrice =
          (pt.propertyCategory || "").toUpperCase() === "HUNIAN_HARIAN" &&
          (pt.pricePerDay ?? 0) > 0
            ? pt.pricePerDay!
            : (pt.propertyCategory || "").toUpperCase() === "KONTRAKAN" &&
                (pt.pricePerYear ?? 0) > 0
              ? pt.pricePerYear!
              : pt.pricePerMonth;

        const shortPrice =
          displayPrice >= 1_000_000
            ? `${(displayPrice / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`
            : `${Math.round(displayPrice / 1000)}rb`;

        const icon = L.divIcon({
          className: "keyloka-map-pin",
          html: `<div style="background:#059669;color:#fff;font-weight:800;font-size:11px;padding:3px 8px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;">Rp${shortPrice}</div>`,
          iconSize: [70, 26],
          iconAnchor: [35, 13],
        });

        const marker = L.marker([lat, lng], { icon });
        marker.on("click", () => {
          setSelected(pt);
        });
        marker.addTo(group);
      }

      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords), { padding: [36, 36], maxZoom: 15 });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [points]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  const selectedImg = selected?.images?.[0]
    ? resolveImageUrl(selected.images[0])
    : "";

  const selectedDisplayPrice = selected
    ? (selected.propertyCategory || "").toUpperCase() === "HUNIAN_HARIAN" &&
      (selected.pricePerDay ?? 0) > 0
      ? { amount: selected.pricePerDay!, unit: "/hari" }
      : (selected.propertyCategory || "").toUpperCase() === "KONTRAKAN" &&
          (selected.pricePerYear ?? 0) > 0
        ? { amount: selected.pricePerYear!, unit: "/tahun" }
        : { amount: selected.pricePerMonth, unit: "/bulan" }
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
      <div ref={containerRef} className="h-[460px] w-full bg-gray-100" />

      {loading && (
        <div className="absolute top-3 left-3 z-[400] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow">
          Memuat titik lokasi...
        </div>
      )}

      {!loading && points.length === 0 && (
        <div className="absolute top-3 left-3 z-[400] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-600 shadow">
          Belum ada properti dengan koordinat peta pada filter ini.
        </div>
      )}

      {selected && selectedDisplayPrice && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xl">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Tutup preview"
            className="absolute right-2.5 top-2.5 rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-3">
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {selectedImg ? (
                <Image
                  src={selectedImg}
                  alt={selected.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <MapPin className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pr-5">
              <p className="text-[11px] font-bold uppercase text-emerald-700">
                {formatCategoryLabel(selected.propertyCategory)} • {selected.type}
              </p>
              <Link
                href={`/kost/${selected.id}`}
                className="line-clamp-1 text-sm font-extrabold text-gray-900 hover:text-emerald-700"
              >
                {selected.name}
              </Link>
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                {selected.district}, {selected.city}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-emerald-700">
                  {formatRupiah(selectedDisplayPrice.amount)}
                  <span className="text-[11px] font-normal text-gray-500">
                    {selectedDisplayPrice.unit}
                  </span>
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(selected.rating || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/kost/${selected.id}`}
            className="mt-3 block w-full rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white hover:bg-emerald-700"
          >
            Lihat Detail Properti
          </Link>
        </div>
      )}
    </div>
  );
}
