"use client";

import { useId, useState } from "react";

export interface AreaSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

interface TrendAreaChartProps {
  points: AreaSeriesPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  formatPrimary?: (v: number) => string;
  formatSecondary?: (v: number) => string;
  emptyText?: string;
}

export function TrendAreaChart({
  points,
  primaryLabel,
  secondaryLabel,
  primaryColor = "#059669",
  secondaryColor = "#0284c7",
  formatPrimary = (v) => v.toLocaleString("id-ID"),
  formatSecondary = (v) => v.toLocaleString("id-ID"),
  emptyText = "Belum ada data untuk ditampilkan.",
}: TrendAreaChartProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-xs text-gray-400">
        {emptyText}
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padLeft = 14;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const hasSecondary = Boolean(secondaryLabel);
  const maxPrimary = Math.max(1, ...points.map((p) => p.primary));
  const maxSecondary = hasSecondary
    ? Math.max(1, ...points.map((p) => p.secondary ?? 0))
    : 1;

  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };
  const getYPrimary = (val: number) =>
    padTop + plotH - (Math.max(0, val) / maxPrimary) * plotH;
  const getYSecondary = (val: number) =>
    padTop + plotH - (Math.max(0, val) / maxSecondary) * plotH;

  const primaryCoords = points.map((p, idx) => `${getX(idx)},${getYPrimary(p.primary)}`);
  const areaPoints = [
    `${getX(0)},${padTop + plotH}`,
    ...primaryCoords,
    `${getX(points.length - 1)},${padTop + plotH}`,
  ].join(" ");
  const secondaryCoords = hasSecondary
    ? points.map((p, idx) => `${getX(idx)},${getYSecondary(p.secondary ?? 0)}`)
    : [];

  const tickStep = Math.max(1, Math.ceil(points.length / 6));
  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-gray-700">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            {primaryLabel}
          </span>
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: secondaryColor }}
              />
              {secondaryLabel}
            </span>
          )}
        </div>
        {activePoint && (
          <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
            {activePoint.label}: {primaryLabel} {formatPrimary(activePoint.primary)}
            {secondaryLabel
              ? ` • ${secondaryLabel} ${formatSecondary(activePoint.secondary ?? 0)}`
              : ""}
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-52 w-full select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.26} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + plotH * ratio;
            return (
              <line
                key={ratio}
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray={ratio === 1 ? undefined : "3 3"}
                strokeWidth="1"
              />
            );
          })}

          <polygon points={areaPoints} fill={`url(#${gradId})`} />
          <polyline
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={primaryCoords.join(" ")}
          />

          {hasSecondary && (
            <polyline
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={secondaryCoords.join(" ")}
            />
          )}

          {points.map((p, idx) => {
            const x = getX(idx);
            const y1 = getYPrimary(p.primary);
            const isActive = hoverIdx === idx;
            const showLabel =
              idx === 0 || idx === points.length - 1 || idx % tickStep === 0;
            const hitW = Math.max(12, plotW / Math.max(1, points.length));
            return (
              <g key={`${p.label}-${idx}`}>
                {isActive && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotH}
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={x}
                  cy={y1}
                  r={isActive ? 5 : points.length <= 12 ? 3.5 : 0}
                  fill={primaryColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {hasSecondary && isActive && (
                  <circle
                    cx={x}
                    cy={getYSecondary(p.secondary ?? 0)}
                    r={4.5}
                    fill={secondaryColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
                {showLabel && (
                  <text
                    x={x}
                    y={height - 8}
                    textAnchor={
                      idx === 0
                        ? "start"
                        : idx === points.length - 1
                          ? "end"
                          : "middle"
                    }
                    fontSize="10"
                    fill="#6b7280"
                    fontWeight="600"
                  >
                    {p.label}
                  </text>
                )}
                <rect
                  x={x - hitW / 2}
                  y={padTop}
                  width={hitW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                  onClick={() => setHoverIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const size = 152;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = slices.reduce<
    Array<DonutSlice & { dash: number; offset: number }>
  >((acc, slice) => {
    const prevUsed = acc.reduce((s, item) => s + item.dash, 0);
    const val = Math.max(0, slice.value);
    const dash = total > 0 ? (val / total) * circumference : 0;
    acc.push({
      ...slice,
      dash,
      offset: -prevUsed,
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((seg) =>
              seg.dash > 0 ? (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${seg.dash} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              ) : null,
            )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-lg font-black text-gray-900 leading-tight">
            {centerValue}
          </span>
          <span className="text-[10px] font-semibold text-gray-500">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div
              key={s.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-bold text-gray-900">
                {s.value}{" "}
                <span className="text-[11px] font-medium text-gray-400">
                  ({pct}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface HorizontalBarItem {
  label: string;
  sublabel?: string;
  value: number;
  displayValue: string;
  colorClass?: string;
}

export function HorizontalBarChart({
  items,
  emptyText = "Belum ada data untuk dibandingkan.",
}: {
  items: HorizontalBarItem[];
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">
        {emptyText}
      </p>
    );
  }

  const maxVal = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = Math.max(
          item.value > 0 ? 4 : 0,
          Math.round((item.value / maxVal) * 100),
        );
        return (
          <div key={`${item.label}-${idx}`} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-bold text-gray-800">
                {item.label}
                {item.sublabel && (
                  <span className="ml-1.5 font-normal text-gray-500">
                    ({item.sublabel})
                  </span>
                )}
              </span>
              <span className="shrink-0 font-extrabold text-gray-900">
                {item.displayValue}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${item.colorClass || "bg-emerald-600"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
