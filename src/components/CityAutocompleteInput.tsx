"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface CityAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  showIcon?: boolean;
  inputClassName?: string;
}

export function CityAutocompleteInput({
  id,
  value,
  onChange,
  placeholder = "Contoh: Kota Malang",
  required = false,
  showIcon = true,
  inputClassName = "w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500",
}: CityAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/proxy/locations/cities?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as Array<string | { name?: string }>;
        const list = Array.isArray(data)
          ? data
              .map((item) => (typeof item === "string" ? item : item.name || ""))
              .filter(Boolean)
              .slice(0, 8)
          : [];
        setSuggestions(list);
      } catch {
        // Ignore abort / network errors for autocomplete
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {showIcon && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <input
          id={id}
          type="text"
          required={required}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            if (nextVal.trim().length < 2) {
              setSuggestions([]);
            }
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-emerald-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
