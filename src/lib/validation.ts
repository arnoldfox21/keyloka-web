export interface ValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes an Indonesian mobile/WhatsApp number to canonical `628...` digits.
 * Accepts `08...`, `628...`, or `+628...` with optional spaces, dashes, or parentheses.
 */
export function normalizeAndValidateIndonesianPhone(
  raw: string,
  options: { required?: boolean; label?: string } = {},
): ValidationResult {
  const { required = false, label = "Nomor WhatsApp" } = options;
  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) {
      return { valid: false, normalized: "", error: `${label} wajib diisi.` };
    }
    return { valid: true, normalized: "" };
  }

  // Reject letters or unexpected symbols early (allow +, digits, spaces, -, ., (, ))
  if (/[^0-9+\s\-().]/.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      error: `${label} hanya boleh berisi angka (contoh: 081234567890).`,
    };
  }

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }

  // Indonesian mobile numbers: 62 + 8 + [1-9] + 7..11 digits => 11..15 digits total
  if (!/^628[1-9][0-9]{7,11}$/.test(digits)) {
    return {
      valid: false,
      normalized: "",
      error: `${label} tidak valid. Gunakan nomor Indonesia aktif (08xx / 628xx, 10–14 digit).`,
    };
  }

  return { valid: true, normalized: digits };
}

/**
 * Converts a stored phone string into valid `628...` WhatsApp digits, or null if invalid.
 */
export function toWhatsappDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const result = normalizeAndValidateIndonesianPhone(raw, { required: true });
  return result.valid ? result.normalized : null;
}

/**
 * Validates and normalizes an Indonesian city/regency name.
 */
export function validateCityName(
  raw: string,
  options: { required?: boolean } = {},
): ValidationResult {
  const { required = false } = options;
  let normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) {
    if (required) {
      return {
        valid: false,
        normalized: "",
        error: "Kota / Kabupaten wajib diisi.",
      };
    }
    return { valid: true, normalized: "" };
  }

  normalized = normalized.replace(/^kab\.?\s+/i, "Kabupaten ").trim();

  if (normalized.length < 3 || normalized.length > 80) {
    return {
      valid: false,
      normalized: "",
      error: "Nama kota/kabupaten harus terdiri dari 3–80 karakter.",
    };
  }

  if (!/^[a-zA-Z\s.\-']+$/.test(normalized)) {
    return {
      valid: false,
      normalized: "",
      error: "Nama kota/kabupaten hanya boleh berisi huruf, spasi, titik, atau tanda hubung.",
    };
  }

  const letterCount = (normalized.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 3) {
    return {
      valid: false,
      normalized: "",
      error: "Masukkan nama kota/kabupaten yang lengkap (minimal 3 huruf).",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validates and normalizes an Indonesian district (kecamatan) name.
 */
export function validateDistrictName(
  raw: string,
  options: { required?: boolean } = {},
): ValidationResult {
  const { required = false } = options;
  let normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) {
    if (required) {
      return {
        valid: false,
        normalized: "",
        error: "Kecamatan wajib diisi.",
      };
    }
    return { valid: true, normalized: "" };
  }

  normalized = normalized.replace(/^(?:Kecamatan|Kec\.?)\s+/i, "").trim();

  if (normalized.length < 2 || normalized.length > 80) {
    return {
      valid: false,
      normalized: "",
      error: "Nama kecamatan harus terdiri dari 2–80 karakter.",
    };
  }

  if (!/^[a-zA-Z0-9\s.\-']+$/.test(normalized)) {
    return {
      valid: false,
      normalized: "",
      error: "Nama kecamatan mengandung karakter yang tidak valid.",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validates an optional username (3–30 chars: lowercase letters, digits, `.`, `_`).
 */
export function validateUsername(raw: string): ValidationResult {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return { valid: true, normalized: "" };
  }

  if (
    normalized.length < 3 ||
    normalized.length > 30 ||
    !/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(normalized) ||
    /(\.\.|__)/.test(normalized)
  ) {
    return {
      valid: false,
      normalized: "",
      error:
        "Username harus 3–30 karakter (huruf kecil, angka, titik, atau underscore, tanpa titik/underscore berurutan).",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validates optional latitude and longitude pair.
 */
export function validateLatLng(
  latRaw: string,
  lngRaw: string,
): { valid: boolean; lat?: number; lng?: number; error?: string } {
  const latStr = latRaw.trim();
  const lngStr = lngRaw.trim();
  if (!latStr && !lngStr) {
    return { valid: true };
  }
  if (!latStr || !lngStr) {
    return {
      valid: false,
      error: "Latitude dan longitude harus diisi keduanya.",
    };
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      valid: false,
      error: "Koordinat tidak valid (Latitude -90..90, Longitude -180..180).",
    };
  }

  return { valid: true, lat, lng };
}

/**
 * Validates withdrawal destination account number (bank account or e-wallet phone).
 */
export function validateWithdrawAccount(
  raw: string,
  method: "BANK" | "EWALLET",
): ValidationResult {
  if (method === "EWALLET") {
    return normalizeAndValidateIndonesianPhone(raw, {
      required: true,
      label: "Nomor HP E-Wallet",
    });
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits || /[^0-9\s\-]/.test(raw.trim())) {
    return {
      valid: false,
      normalized: "",
      error: "Nomor rekening bank hanya boleh berisi angka.",
    };
  }
  if (digits.length < 6 || digits.length > 20) {
    return {
      valid: false,
      normalized: "",
      error: "Nomor rekening bank harus terdiri dari 6–20 digit.",
    };
  }
  return { valid: true, normalized: digits };
}
