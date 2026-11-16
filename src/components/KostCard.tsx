import Link from "next/link";
import { MapPin, ShieldCheck, Star, Zap } from "lucide-react";
import { formatRupiah, getDisplayPrice, resolveImageUrl, type Kost } from "@/lib/types";

export function KostCard({ kost }: { kost: Kost }) {
  const thumb = resolveImageUrl(kost.images?.[0]);
  const price = getDisplayPrice(kost);
  const isBoosted = Boolean(kost.boostedUntil && kost.boostTier);

  return (
    <Link
      href={`/kost/${kost.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={kost.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-400">
            Foto belum tersedia
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
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

        {kost.discountPercent > 0 && (
          <span className="absolute right-2.5 top-2.5 rounded-lg bg-rose-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
            -{kost.discountPercent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
          <span className="truncate font-semibold text-emerald-700">
            {kost.propertyCategory}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-gray-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {Number(kost.rating || 0).toFixed(1)}
            <span className="font-normal text-gray-400">
              ({kost.reviewCount || 0})
            </span>
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-base font-extrabold text-gray-900 group-hover:text-emerald-700">
          {kost.name}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>
            {kost.district}, {kost.city}
          </span>
        </p>

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
