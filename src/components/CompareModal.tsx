"use client";

import Link from "next/link";
import { Star, X } from "lucide-react";
import { formatRupiah, getDisplayPrice } from "@/lib/types";
import type { Kost } from "@/lib/types";

interface CompareModalProps {
  kosts: Kost[];
  onClose: () => void;
}

export function CompareModal({ kosts, onClose }: CompareModalProps) {
  if (kosts.length < 2) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-lg font-extrabold text-gray-900">
            Perbandingan Properti ({kosts.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup perbandingan"
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 font-bold text-gray-500 w-36">Aspek</th>
                {kosts.map((k) => (
                  <th
                    key={k.id}
                    className="py-3 px-3 font-extrabold text-gray-900 min-w-[180px]"
                  >
                    <Link href={`/kost/${k.id}`} className="hover:text-emerald-700">
                      {k.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Harga</td>
                {kosts.map((k) => {
                  const p = getDisplayPrice(k);
                  return (
                    <td key={k.id} className="py-3 px-3 font-black text-emerald-700">
                      {formatRupiah(p.amount)}
                      <span className="font-normal text-gray-500">{p.unit}</span>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Kategori & Tipe</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3">
                    {k.propertyCategory} • {k.type}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Lokasi</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3">
                    {k.district}, {k.city}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Kamar Tersedia</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3 font-semibold">
                    {k.availableRooms} kamar
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Rating</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(k.rating || 0).toFixed(1)} ({k.reviewCount})
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Listrik</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3 text-gray-600">
                    {k.electricityIncluded ? "Termasuk" : "Tidak termasuk"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Fasilitas Kamar</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3 text-gray-600">
                    {k.roomFacilities?.join(", ") || "-"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 font-bold text-gray-600">Fasilitas Umum</td>
                {kosts.map((k) => (
                  <td key={k.id} className="py-3 px-3 text-gray-600">
                    {k.publicFacilities?.join(", ") || "-"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
