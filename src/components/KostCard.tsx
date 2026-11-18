"use client";

import Link from "next/link";
import { BadgeCheck, Heart, MapPin, ShieldCheck, Star, Zap } from "lucide-react";
import { getKostHref } from "@/lib/seo";
import { formatCategoryLabel, formatRupiah, getDisplayPrice, resolveImageUrl, type Kost } from "@/lib/types";
import { FacilityIcon } from "./FacilityIcon";

interface KostCardProps {
  kost: Kost;
  isFavorite?: boolean;
  onToggleFavorite?: (kostId: number) => void;
}

export function KostCard({ kost, isFavorite, onToggleFavorite }: KostCardProps) {
  const thumb = resolveImageUrl(kost.images?.[0]);
  const price = getDisplayPrice(kost);
  const isBoosted = Boolean(kost.boostedUntil && kost.boostTier);
  const fav = isFavorite ?? Boolean(kost.isFavorite);

  return (
    <Link
      href={getKostHref(kost)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={kost.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-400">
            Foto belum tersedia
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 pr-10">
          <span className="rounded-lg bg-white/95 px-2 py-0.5 text-[11px] font-bold text-gray-800 shadow-xs">
            {kost.type}
          </span>
          {kost.allowDirectBooking && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              <ShieldCheck className="h-3 w-3" />
              Booking Langsung
            </span>
          )}
          {isBoosted && (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              <Zap className="h-3 w-3" />
              Unggulan
            </span>
          )}
        </div>

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {kost.discountPercent > 0 && (
            <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
              -{kost.discountPercent}%
            </span>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label="Simpan ke Favorit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(kost.id);
              }}
              className="rounded-full bg-white/90 p-1.5 text-gray-700 shadow-xs hover:bg-white transition"
            >
              <Heart
                className={`h-4 w-4 ${
                  fav ? "fill-rose-500 text-rose-500" : "text-gray-600"
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 truncate font-bold text-emerald-700">
            {formatCategoryLabel(kost.propertyCategory)}
            {kost.isVerified && (
              <BadgeCheck
                className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                aria-label="Terverifikasi"
              />
            )}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-gray-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {Number(kost.rating || 0).toFixed(1)}
            <span className="font-normal text-gray-400">
              ({kost.reviewCount || 0})
            </span>
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-base font-extrabold text-gray-900 group-hover:text-emerald-700 transition">
          {kost.name}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>
            {kost.district}, {kost.city}
          </span>
        </p>

        {(kost.roomFacilities?.length > 0 || kost.electricityIncluded) && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {kost.electricityIncluded && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Listrik Termasuk
              </span>
            )}
            {(kost.roomFacilities || []).slice(0, 2).map((fac) => (
              <span
                key={fac}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
              >
                <FacilityIcon name={fac} className="h-3 w-3 shrink-0 text-gray-500" />
                {fac}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between border-t border-gray-100">
          <div>
            {kost.originalPrice && kost.originalPrice > price.amount && (
              <p className="text-[11px] text-gray-400 line-through">
                {formatRupiah(kost.originalPrice)}
              </p>
            )}
            <p className="text-base font-black text-emerald-700">
              {formatRupiah(price.amount)}
              <span className="text-xs font-semibold text-gray-500">
                {price.unit}
              </span>
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              kost.availableRooms > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {kost.availableRooms > 0
              ? `Sisa ${kost.availableRooms}`
              : "Penuh"}
          </span>
        </div>
      </div>
    </Link>
  );
}
