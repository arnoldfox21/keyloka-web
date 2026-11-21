"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { formatRoleLabel, formatRupiah, resolveImageUrl, type Kost, type UserProfile } from "@/lib/types";
import { compressImageToDataUrl } from "@/lib/image-compress";
import {
  normalizeAndValidateIndonesianPhone,
  validateCityName,
  validateDistrictName,
  validateLatLng,
} from "@/lib/validation";
import { KostLocationPicker } from "./KostLocationPicker";
import { FacilityIcon } from "./FacilityIcon";

interface NewPropertyClientProps {
  currentUser: UserProfile;
  masterFacilities: {
    roomFacilities: string[];
    publicFacilities: string[];
  };
  existingPropertyCount: number;
  pendingPropertyCount?: number;
  maxPendingPropertiesPerOwner?: number;
  creditBalance: number;
  freePropertyQuota?: number;
  extraPropertySlotFee?: number;
  initialKost?: Kost;
}

const PROPERTY_CATEGORIES = [
  { value: "KOST", label: "Kost", desc: "Kamar kost bulanan / tahunan" },
  { value: "APARTEMEN", label: "Apartemen", desc: "Unit apartemen sewa" },
  { value: "KONTRAKAN", label: "Kontrakan", desc: "Rumah atau petak kontrakan" },
  { value: "HUNIAN_HARIAN", label: "Hunian Harian", desc: "Homestay, villa, atau kamar harian" },
] as const;

const KOST_TYPES = ["Campur", "Putra", "Putri"] as const;
const DAILY_UNIT_TYPES = [
  "Homestay",
  "Villa",
  "Guest House",
  "Glamping",
  "Kamar Harian",
] as const;

const DEFAULT_FREE_PROPERTY_QUOTA = 2;
const DEFAULT_EXTRA_PROPERTY_SLOT_FEE = 10000;

const CATEGORY_FACILITY_PRESETS: Record<
  string,
  { roomFacilities: string[]; publicFacilities: string[]; roomTitle: string; publicTitle: string }
> = {
  KONTRAKAN: {
    roomTitle: "Fasilitas Rumah & Ruangan",
    publicTitle: "Fasilitas Lingkungan & Akses",
    roomFacilities: [
      "Kamar Tidur",
      "Ruang Tamu",
      "Ruang Keluarga",
      "Dapur Pribadi",
      "Kamar Mandi",
      "Shower",
      "Kloset Duduk",
      "Kloset Jongkok",
      "AC",
      "Water Heater",
      "Teras / Halaman",
      "Toren & Pompa Air",
      "Listrik Token",
      "PDAM / Air Sumur",
    ],
    publicFacilities: [
      "Carport / Garasi",
      "Parkir Motor",
      "Parkir Mobil",
      "Akses Jalan Mobil",
      "Keamanan 24 Jam / One Gate",
      "CCTV Lingkungan",
      "Dekat Masjid / Mushola",
      "Bebas Banjir",
      "Taman",
    ],
  },
  VILLA: {
    roomTitle: "Fasilitas Villa",
    publicTitle: "Area & Layanan Villa",
    roomFacilities: [
      "Private Pool",
      "AC",
      "WiFi",
      "Smart TV / Karaoke",
      "Kitchen Set Lengkap",
      "Kulkas",
      "Dispenser",
      "Ruang Keluarga",
      "Water Heater",
      "Bathtub",
      "Balkon / Rooftop",
      "View Alam",
      "Handuk & Amenities",
    ],
    publicFacilities: [
      "Area BBQ",
      "Taman Pribadi",
      "Parkir Mobil Luas",
      "Carport / Garasi",
      "Sarapan (Opsional)",
      "Penjaga / Caretaker 24 Jam",
      "CCTV",
      "Free Listrik & Air",
    ],
  },
  HOMESTAY: {
    roomTitle: "Fasilitas Kamar Homestay",
    publicTitle: "Fasilitas Umum & Layanan",
    roomFacilities: [
      "AC",
      "Kipas Angin",
      "WiFi",
      "TV",
      "Kasur Nyaman",
      "Kamar Mandi Dalam",
      "Shower",
      "Water Heater",
      "Handuk & Perlengkapan Mandi",
      "Meja & Kursi",
      "Lemari",
      "Balkon / Teras",
    ],
    publicFacilities: [
      "Sarapan",
      "Ruang Tamu Bersama",
      "Pantry / Dapur Bersama",
      "Dispenser / Air Mineral",
      "Parkir Motor",
      "Parkir Mobil",
      "Check-in 24 Jam",
      "Laundry",
      "CCTV",
    ],
  },
};

export function NewPropertyClient({
  currentUser,
  masterFacilities,
  existingPropertyCount,
  pendingPropertyCount = 0,
  maxPendingPropertiesPerOwner = 10,
  creditBalance,
  freePropertyQuota = DEFAULT_FREE_PROPERTY_QUOTA,
  extraPropertySlotFee = DEFAULT_EXTRA_PROPERTY_SLOT_FEE,
  initialKost,
}: NewPropertyClientProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialKost);
  const role = (currentUser.role || "").toUpperCase();
  const isStaffOrAdmin = role === "STAFF" || role === "ADMINISTRATOR";
  const isAutoApproved = isStaffOrAdmin || Boolean(currentUser.isVerified);
  const needsSlotFee = !isEditMode && !isStaffOrAdmin && existingPropertyCount >= freePropertyQuota;
  const isPendingLimitReached =
    !isEditMode &&
    !isStaffOrAdmin &&
    pendingPropertyCount >= maxPendingPropertiesPerOwner;

  const [propertyCategory, setPropertyCategory] = useState<string>(
    initialKost?.propertyCategory || "KOST",
  );
  const [unitType, setUnitType] = useState<string>(
    initialKost?.unitType || "Homestay",
  );
  const [type, setType] = useState<string>(initialKost?.type || "Campur");
  const [name, setName] = useState(initialKost?.name || "");
  const [description, setDescription] = useState(initialKost?.description || "");

  const [city, setCity] = useState(initialKost?.city || "");
  const [district, setDistrict] = useState(initialKost?.district || "");
  const [address, setAddress] = useState(initialKost?.address || "");
  const [nearbyLandmark, setNearbyLandmark] = useState(
    initialKost?.nearbyLandmark || "",
  );
  const [latitude, setLatitude] = useState(
    initialKost?.latitude != null ? String(initialKost.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    initialKost?.longitude != null ? String(initialKost.longitude) : "",
  );

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerOptions, setOwnerOptions] = useState<
    Array<{ id: number; name: string; email: string; phone?: string; role: string }>
  >([]);
  const [ownerSearching, setOwnerSearching] = useState(false);

  const [pricePerMonth, setPricePerMonth] = useState(
    initialKost?.pricePerMonth ? String(initialKost.pricePerMonth) : "",
  );
  const [pricePerDay, setPricePerDay] = useState(
    initialKost?.pricePerDay ? String(initialKost.pricePerDay) : "",
  );
  const [pricePerYear, setPricePerYear] = useState(
    initialKost?.pricePerYear ? String(initialKost.pricePerYear) : "",
  );
  const [originalPrice, setOriginalPrice] = useState(
    initialKost?.originalPrice ? String(initialKost.originalPrice) : "",
  );
  const [availableRooms, setAvailableRooms] = useState(
    initialKost?.availableRooms != null ? String(initialKost.availableRooms) : "1",
  );
  const [roomSize, setRoomSize] = useState(initialKost?.roomSize || "3x4 m");
  const [bedrooms, setBedrooms] = useState(
    initialKost?.bedrooms != null ? String(initialKost.bedrooms) : "1",
  );
  const [bathrooms, setBathrooms] = useState(
    initialKost?.bathrooms != null ? String(initialKost.bathrooms) : "1",
  );
  const [electricityIncluded, setElectricityIncluded] = useState(
    initialKost?.electricityIncluded ?? false,
  );
  const [allowDirectBooking, setAllowDirectBooking] = useState(
    initialKost?.allowDirectBooking ?? false,
  );
  const [hasDeposit, setHasDeposit] = useState(
    Boolean(initialKost?.depositAmount && initialKost.depositAmount > 0),
  );
  const [depositAmount, setDepositAmount] = useState(
    initialKost?.depositAmount && initialKost.depositAmount > 0
      ? String(initialKost.depositAmount)
      : "",
  );

  const [roomFacilities, setRoomFacilities] = useState<string[]>(
    initialKost?.roomFacilities || [],
  );
  const [publicFacilities, setPublicFacilities] = useState<string[]>(
    initialKost?.publicFacilities || [],
  );
  const [customRoomFacility, setCustomRoomFacility] = useState("");
  const [customPublicFacility, setCustomPublicFacility] = useState("");
  const [rulesText, setRulesText] = useState(
    initialKost?.rules?.length ? initialKost.rules.join(", ") : "",
  );

  type PropertyImageItem =
    | { kind: "remote"; url: string }
    | { kind: "local"; file: File; previewUrl: string };

  const [images, setImages] = useState<PropertyImageItem[]>(() =>
    (initialKost?.images || []).map((url) => ({ kind: "remote", url })),
  );
  const [imageUrlInput, setImageUrlInput] = useState("");
  const latestImagesRef = useRef(images);

  useEffect(() => {
    latestImagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const item of latestImagesRef.current) {
        if (item.kind === "local") {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  const [ownerName, setOwnerName] = useState(
    initialKost?.ownerName || currentUser.name || "",
  );
  const [ownerPhone, setOwnerPhone] = useState(
    initialKost?.ownerPhone || currentUser.phone || "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

  const STEPS = [
    { id: 1, label: "Info Dasar" },
    { id: 2, label: "Lokasi & Peta" },
    { id: 3, label: "Harga & Booking" },
    { id: 4, label: "Fasilitas & Foto" },
    { id: 5, label: "Kontak & Simpan" },
  ] as const;

  function validateStep(step: number): string | null {
    if (step === 1) {
      if (!name.trim()) return "Nama properti wajib diisi.";
      if (!description.trim()) return "Deskripsi properti wajib diisi.";
    }
    if (step === 2) {
      const cityCheck = validateCityName(city, { required: true });
      if (!cityCheck.valid) {
        return cityCheck.error || "Kota / Kabupaten wajib diisi dengan benar.";
      }
      const districtCheck = validateDistrictName(district, { required: true });
      if (!districtCheck.valid) {
        return districtCheck.error || "Kecamatan wajib diisi dengan benar.";
      }
      if (!address.trim() || address.trim().length < 5) {
        return "Alamat lengkap wajib diisi (minimal 5 karakter).";
      }
      const coordCheck = validateLatLng(latitude, longitude);
      if (!coordCheck.valid) {
        return coordCheck.error || "Koordinat peta tidak valid.";
      }
    }
    if (step === 3) {
      const parsedMonth = Math.round(Number(pricePerMonth));
      const parsedDay = Math.round(Number(pricePerDay));
      const parsedYear = pricePerYear.trim() ? Math.round(Number(pricePerYear)) : undefined;
      if (isDailyStay && (!Number.isFinite(parsedDay) || parsedDay <= 0)) {
        return "Harga per hari wajib diisi untuk hunian harian.";
      }
      if (isKontrakan && (!parsedYear || !Number.isFinite(parsedYear) || parsedYear <= 0)) {
        return "Harga per tahun wajib diisi untuk kontrakan.";
      }
      if (!isDailyStay && !isKontrakan && (!Number.isFinite(parsedMonth) || parsedMonth <= 0)) {
        return "Harga per bulan wajib diisi.";
      }
      if (hasDeposit) {
        const parsedDeposit = Math.round(Number(depositAmount));
        if (!Number.isFinite(parsedDeposit) || parsedDeposit <= 0) {
          return "Jumlah deposit keamanan wajib diisi lebih dari 0 jika diaktifkan.";
        }
      }
    }
    return null;
  }

  function handleNextStep() {
    const stepErr = validateStep(currentStep);
    if (stepErr) {
      setError(stepErr);
      return;
    }
    setError(null);
    setCurrentStep((s) => Math.min(5, s + 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrevStep() {
    setError(null);
    setCurrentStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const isDailyStay = propertyCategory === "HUNIAN_HARIAN";
  const isKontrakan = propertyCategory === "KONTRAKAN";

  const activeFacilityPreset =
    propertyCategory === "KONTRAKAN"
      ? CATEGORY_FACILITY_PRESETS.KONTRAKAN
      : isDailyStay
        ? unitType.toLowerCase() === "villa"
          ? CATEGORY_FACILITY_PRESETS.VILLA
          : CATEGORY_FACILITY_PRESETS.HOMESTAY
        : {
            roomTitle: "Fasilitas Kamar",
            publicTitle: "Fasilitas Umum",
            roomFacilities: masterFacilities.roomFacilities,
            publicFacilities: masterFacilities.publicFacilities,
          };

  useEffect(() => {
    const q = city.trim();
    if (q.length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/proxy/locations/cities?q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) return;
        const list = (await res.json()) as Array<{ name?: string } | string>;
        const names = list
          .map((item) => (typeof item === "string" ? item : item.name || ""))
          .filter(Boolean);
        setCitySuggestions(names.slice(0, 8));
      } catch {
        // Abaikan error autocomplete
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [city]);

  useEffect(() => {
    const q = district.trim();
    if (q.length < 2 && !city.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (city.trim()) params.set("city", city.trim());
        if (q) params.set("q", q);
        const res = await fetch(
          `/api/proxy/locations/districts?${params.toString()}`,
        );
        if (!res.ok) return;
        const list = (await res.json()) as Array<{ name?: string } | string>;
        const names = list
          .map((item) => (typeof item === "string" ? item : item.name || ""))
          .filter(Boolean);
        setDistrictSuggestions(names.slice(0, 8));
      } catch {
        // Abaikan error autocomplete
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [city, district]);

  function toggleFacility(
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  function addCustomFacility(
    value: string,
    clear: () => void,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    clear();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validItems: PropertyImageItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const isAllowedMime = ["image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      );
      const isAllowedExt = /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!isAllowedMime && !(file.type === "" && isAllowedExt)) {
        errors.push(
          `Format "${file.name}" tidak didukung. Gunakan file JPG atau PNG.`,
        );
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        errors.push(`Ukuran "${file.name}" melebihi batas maksimal 15 MB.`);
        continue;
      }
      validItems.push({
        kind: "local",
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (validItems.length > 0) {
      setImages((prev) => [...prev, ...validItems]);
    }
    setError(errors.length > 0 ? errors[0] : null);
    e.target.value = "";
  }

  function handleAddImageUrl() {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setError("URL gambar harus diawali http:// atau https://");
      return;
    }
    const alreadyExists = images.some(
      (item) => item.kind === "remote" && item.url === trimmed,
    );
    if (!alreadyExists) {
      setImages((prev) => [...prev, { kind: "remote", url: trimmed }]);
    }
    setImageUrlInput("");
    setError(null);
  }

  function handleRemoveImage(idx: number) {
    setImages((prev) => {
      const target = prev[idx];
      if (target?.kind === "local") {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleSetFeaturedImage(idx: number) {
    if (idx <= 0) return;
    setImages((prev) => {
      if (idx >= prev.length) return prev;
      const target = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [target, ...rest];
    });
  }

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung deteksi lokasi.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => {
        setError("Gagal mengambil koordinat lokasi. Pastikan izin lokasi aktif.");
      },
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama properti wajib diisi.");
      return;
    }
    const cityCheck = validateCityName(city, { required: true });
    if (!cityCheck.valid) {
      setError(cityCheck.error || "Kota / Kabupaten wajib diisi dengan benar.");
      return;
    }
    const districtCheck = validateDistrictName(district, { required: true });
    if (!districtCheck.valid) {
      setError(districtCheck.error || "Kecamatan wajib diisi dengan benar.");
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError("Alamat lengkap wajib diisi (minimal 5 karakter).");
      return;
    }
    const coordCheck = validateLatLng(latitude, longitude);
    if (!coordCheck.valid) {
      setError(coordCheck.error || "Koordinat peta tidak valid.");
      return;
    }
    const phoneInput = ownerPhone.trim() || currentUser.phone || "";
    const phoneCheck = normalizeAndValidateIndonesianPhone(phoneInput, {
      required: false,
      label: "Nomor WhatsApp / Telepon",
    });
    if (!phoneCheck.valid) {
      setError(phoneCheck.error || "Nomor WhatsApp tidak valid.");
      return;
    }
    if (!description.trim()) {
      setError("Deskripsi properti wajib diisi.");
      return;
    }

    const parsedMonth = Math.round(Number(pricePerMonth));
    const parsedDay = Math.round(Number(pricePerDay));
    const parsedYear = pricePerYear.trim()
      ? Math.round(Number(pricePerYear))
      : undefined;
    if (isDailyStay) {
      if (!Number.isFinite(parsedDay) || parsedDay <= 0) {
        setError("Harga per hari wajib diisi dengan angka lebih dari 0.");
        return;
      }
    } else if (isKontrakan) {
      if (!parsedYear || !Number.isFinite(parsedYear) || parsedYear <= 0) {
        setError("Harga per tahun wajib diisi dengan angka lebih dari 0.");
        return;
      }
    } else if (!Number.isFinite(parsedMonth) || parsedMonth <= 0) {
      setError("Harga per bulan wajib diisi dengan angka lebih dari 0.");
      return;
    }

    if (needsSlotFee && creditBalance < extraPropertySlotFee) {
      setError(
        `Kuota gratis (${freePropertyQuota} properti) sudah penuh. Saldo kredit iklan Anda ${formatRupiah(creditBalance)}, butuh ${formatRupiah(extraPropertySlotFee)} untuk slot tambahan.`,
      );
      return;
    }

    if (isPendingLimitReached) {
      setError(
        `Anda masih memiliki ${pendingPropertyCount} properti yang menunggu persetujuan (Pending Approval). Tunggu hingga tim Keyloka meninjau properti Anda sebelum menambahkan properti baru (maksimal ${maxPendingPropertiesPerOwner} properti pending).`,
      );
      return;
    }

    const parsedRooms = Math.max(0, Math.round(Number(availableRooms) || 1));
    const parsedBedrooms = Math.max(1, Math.round(Number(bedrooms) || 1));
    const parsedBathrooms = Math.max(1, Math.round(Number(bathrooms) || 1));
    const parsedOriginal = originalPrice.trim()
      ? Math.round(Number(originalPrice))
      : undefined;
    const parsedDeposit = hasDeposit ? Math.round(Number(depositAmount)) : 0;
    if (hasDeposit && (!Number.isFinite(parsedDeposit) || parsedDeposit <= 0)) {
      setError("Jumlah deposit keamanan wajib diisi lebih dari 0 jika diaktifkan.");
      return;
    }
    const parsedLat = coordCheck.lat;
    const parsedLng = coordCheck.lng;

    const rules = rulesText
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const basePayload: Record<string, unknown> = {
      propertyCategory,
      ...(isDailyStay ? { unitType } : {}),
      name: name.trim(),
      type: isDailyStay || isKontrakan ? "Campur" : type,
      city: cityCheck.normalized,
      district: districtCheck.normalized,
      address: address.trim(),
      nearbyLandmark: nearbyLandmark.trim() || undefined,
      description: description.trim(),
      pricePerMonth: isDailyStay || isKontrakan ? 0 : parsedMonth,
      ...(isDailyStay ? { pricePerDay: parsedDay } : {}),
      ...(parsedYear && Number.isFinite(parsedYear) && parsedYear > 0
        ? { pricePerYear: parsedYear }
        : {}),
      ...(parsedOriginal && Number.isFinite(parsedOriginal) && parsedOriginal > 0
        ? { originalPrice: parsedOriginal }
        : {}),
      availableRooms: parsedRooms,
      roomSize: roomSize.trim() || "3x4 m",
      bedrooms: parsedBedrooms,
      bathrooms: parsedBathrooms,
      electricityIncluded: isDailyStay ? true : electricityIncluded,
      allowDirectBooking: isAutoApproved ? allowDirectBooking : false,
      depositAmount: parsedDeposit,
      roomFacilities,
      publicFacilities,
      rules,
      ownerName: ownerName.trim() || currentUser.name,
      ownerPhone: phoneCheck.normalized || undefined,
      ...(!isEditMode && isStaffOrAdmin && selectedOwnerId
        ? { ownerId: selectedOwnerId }
        : {}),
      ...(parsedLat !== undefined && Number.isFinite(parsedLat)
        ? { latitude: parsedLat }
        : {}),
      ...(parsedLng !== undefined && Number.isFinite(parsedLng)
        ? { longitude: parsedLng }
        : {}),
    };

    setSubmitting(true);
    try {
      const preparedImages: string[] = [];
      for (const item of images) {
        if (item.kind === "remote") {
          preparedImages.push(item.url);
        } else {
          const { dataUrl } = await compressImageToDataUrl(item.file, {
            maxDimension: 1600,
            quality: 0.82,
          });
          preparedImages.push(dataUrl);
        }
      }

      const payload: Record<string, unknown> = {
        ...basePayload,
        images: preparedImages,
      };
      const endpoint =
        isEditMode && initialKost
          ? `/api/proxy/kosts/${initialKost.id}`
          : "/api/proxy/kosts";
      const res = await fetch(endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            (isEditMode ? "Gagal memperbarui properti." : "Gagal menambahkan properti."),
        );
      }
      router.push(isEditMode ? "/dashboard?updated=1" : "/dashboard?created=1");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Dashboard
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900">
            {isEditMode ? "Edit Properti" : "Tambah Properti Baru"}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Lengkapi informasi hunian agar mudah ditemukan oleh calon penyewa.
          </p>
        </div>
      </div>

      {/* Info Approval & Kuota */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
        <p className="font-extrabold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          {isAutoApproved
            ? "Mode Staff/Admin: Properti yang ditambahkan langsung berstatus APPROVED dan tayang di beranda."
            : "Properti baru akan ditinjau oleh tim Staff/Admin sebelum tayang di beranda."}
        </p>
        {!isAutoApproved && (
          <p className="text-emerald-800">
            Properti aktif Anda saat ini:{" "}
            <span className="font-bold">{existingPropertyCount}</span> (Kuota gratis{" "}
            {freePropertyQuota} properti, menunggu persetujuan:{" "}
            <span className="font-bold">
              {pendingPropertyCount}/{maxPendingPropertiesPerOwner}
            </span>
            ).{" "}
            {needsSlotFee ? (
              <>
                Penambahan properti ini memerlukan biaya aktivasi slot{" "}
                <span className="font-bold">
                  {formatRupiah(extraPropertySlotFee)}
                </span>{" "}
                dari Saldo Kredit Iklan (saldo Anda:{" "}
                <span className="font-bold">{formatRupiah(creditBalance)}</span>).
              </>
            ) : (
              <span>Slot ini masih gratis.</span>
            )}
          </p>
        )}
      </div>

      {isPendingLimitReached && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          Anda sudah mencapai batas maksimal {maxPendingPropertiesPerOwner} properti yang masih berstatus{" "}
          <span className="underline">Menunggu Persetujuan (Pending Approval)</span>. Silakan tunggu tim Keyloka meninjau properti Anda sebelum menambahkan properti baru.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Stepper */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || isEditMode) {
                    setError(null);
                    setCurrentStep(step.id);
                    return;
                  }
                  const stepErr = validateStep(currentStep);
                  if (stepErr) {
                    setError(stepErr);
                    return;
                  }
                  setError(null);
                  setCurrentStep(step.id);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : isDone
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                    isActive
                      ? "bg-white text-emerald-700"
                      : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.id}
                </span>
                <span className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-1">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* 1. Informasi Dasar */}
        {currentStep === 1 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-gray-900">
              1. Informasi Dasar
            </h2>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Kategori Properti *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PROPERTY_CATEGORIES.map((cat) => {
                const active = propertyCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setPropertyCategory(cat.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-extrabold">{cat.label}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">{cat.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {isDailyStay ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Jenis Unit Harian *
              </label>
              <div className="flex flex-wrap gap-2">
                {DAILY_UNIT_TYPES.map((ut) => (
                  <button
                    key={ut}
                    type="button"
                    onClick={() => setUnitType(ut)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      unitType === ut
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {ut}
                  </button>
                ))}
              </div>
            </div>
          ) : !isKontrakan ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Tipe Penghuni *
              </label>
              <div className="flex flex-wrap gap-2">
                {KOST_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                      type === t
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="prop-name"
              className="block text-xs font-bold text-gray-700"
            >
              Nama Properti *
            </label>
            <input
              id="prop-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kost Eksklusif Melati Lowokwaru"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="prop-desc"
              className="block text-xs font-bold text-gray-700"
            >
              Deskripsi Lengkap *
            </label>
            <textarea
              id="prop-desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan keunggulan lokasi, suasana lingkungan, akses jalan, dan detail kamar..."
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </section>
        )}

        {/* 2. Lokasi & Alamat */}
        {currentStep === 2 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-gray-900">
                2. Lokasi & Alamat
              </h2>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <MapPin className="h-3.5 w-3.5" />
              Deteksi Koordinat GPS
            </button>
          </div>

          <KostLocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            onLocationResolved={({ city: c, district: d, address: a }) => {
              if (c) setCity(c);
              if (d) setDistrict(d);
              if (a) setAddress(a);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="prop-city"
                className="block text-xs font-bold text-gray-700"
              >
                Kota / Kabupaten *
              </label>
              <input
                id="prop-city"
                list="city-suggestions"
                required
                value={city}
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  if (val.trim().length < 2) setCitySuggestions([]);
                }}
                placeholder="Contoh: Kota Malang"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <datalist id="city-suggestions">
                {citySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="prop-district"
                className="block text-xs font-bold text-gray-700"
              >
                Kecamatan *
              </label>
              <input
                id="prop-district"
                list="district-suggestions"
                required
                value={district}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistrict(val);
                  if (val.trim().length < 2 && !city.trim()) {
                    setDistrictSuggestions([]);
                  }
                }}
                placeholder="Contoh: Lowokwaru"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <datalist id="district-suggestions">
                {districtSuggestions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="prop-address"
              className="block text-xs font-bold text-gray-700"
            >
              Alamat Lengkap *
            </label>
            <input
              id="prop-address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Soekarno Hatta No. 12, RT 02 / RW 05"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="prop-landmark"
                className="block text-xs font-bold text-gray-700"
              >
                Patokan Terdekat
              </label>
              <input
                id="prop-landmark"
                value={nearbyLandmark}
                onChange={(e) => setNearbyLandmark(e.target.value)}
                placeholder="Dekat Kampus UB / Polinema"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="prop-lat"
                className="block text-xs font-bold text-gray-700"
              >
                Latitude (Opsional)
              </label>
              <input
                id="prop-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-7.9526"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="prop-lng"
                className="block text-xs font-bold text-gray-700"
              >
                Longitude (Opsional)
              </label>
              <input
                id="prop-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="112.6143"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>
        )}

        {/* 3. Harga & Spesifikasi Unit */}
        {currentStep === 3 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-extrabold text-gray-900">
              3. Harga & Spesifikasi Kamar
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isDailyStay ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="prop-price-day"
                  className="block text-xs font-bold text-gray-700"
                >
                  Harga per Hari (Rp) *
                </label>
                <input
                  id="prop-price-day"
                  type="number"
                  min={1000}
                  required
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  placeholder="250000"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : isKontrakan ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="prop-price-year"
                  className="block text-xs font-bold text-gray-700"
                >
                  Harga per Tahun (Rp) *
                </label>
                <input
                  id="prop-price-year"
                  type="number"
                  min={1000}
                  required
                  value={pricePerYear}
                  onChange={(e) => setPricePerYear(e.target.value)}
                  placeholder="18000000"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="prop-price-month"
                    className="block text-xs font-bold text-gray-700"
                  >
                    Harga per Bulan (Rp) *
                  </label>
                  <input
                    id="prop-price-month"
                    type="number"
                    min={1000}
                    required
                    value={pricePerMonth}
                    onChange={(e) => setPricePerMonth(e.target.value)}
                    placeholder="1500000"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="prop-price-year"
                    className="block text-xs font-bold text-gray-700"
                  >
                    Harga per Tahun (Opsional)
                  </label>
                  <input
                    id="prop-price-year"
                    type="number"
                    min={0}
                    value={pricePerYear}
                    onChange={(e) => setPricePerYear(e.target.value)}
                    placeholder="16500000"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="prop-original-price"
                className="block text-xs font-bold text-gray-700"
              >
                Harga Coret / Normal (Opsional)
              </label>
              <input
                id="prop-original-price"
                type="number"
                min={0}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="1800000"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="prop-rooms"
                className="block text-xs font-bold text-gray-700"
              >
                Sisa Kamar / Unit
              </label>
              <input
                id="prop-rooms"
                type="number"
                min={0}
                value={availableRooms}
                onChange={(e) => setAvailableRooms(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="prop-size"
                className="block text-xs font-bold text-gray-700"
              >
                Ukuran Kamar
              </label>
              <input
                id="prop-size"
                value={roomSize}
                onChange={(e) => setRoomSize(e.target.value)}
                placeholder="3x4 m"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="prop-bedrooms"
                className="block text-xs font-bold text-gray-700"
              >
                Kamar Tidur
              </label>
              <input
                id="prop-bedrooms"
                type="number"
                min={1}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="prop-bathrooms"
                className="block text-xs font-bold text-gray-700"
              >
                Kamar Mandi
              </label>
              <input
                id="prop-bathrooms"
                type="number"
                min={1}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {!isDailyStay && (
            <label className="inline-flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={electricityIncluded}
                onChange={(e) => setElectricityIncluded(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-gray-700">
                Harga sewa sudah termasuk listrik
              </span>
            </label>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              disabled={!isAutoApproved}
              checked={isAutoApproved ? allowDirectBooking : false}
              onChange={(e) => setAllowDirectBooking(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
            />
            <span className="text-xs">
              <span className="block font-bold text-gray-700">
                Aktifkan Booking Langsung (Escrow)
              </span>
              <span className="block text-[11px] text-gray-500">
                {isAutoApproved
                  ? "Penyewa dapat langsung membayar booking melalui Midtrans dengan sistem Escrow."
                  : "Khusus pemilik terverifikasi. Lakukan verifikasi akun untuk mengaktifkan fitur booking."}
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-xs font-bold text-gray-700">
                  Syaratkan Deposit Keamanan
                </span>
                <span className="block text-[11px] text-gray-500">
                  Opsional. Dibayar terpisah saat Check-In dan dikembalikan saat Check-Out jika tidak ada kerusakan.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasDeposit}
                aria-label="Aktifkan Deposit Keamanan"
                onClick={() => {
                  setHasDeposit((prev) => !prev);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                  hasDeposit ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    hasDeposit ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {hasDeposit && (
              <div className="space-y-1 pt-1 border-t border-gray-200/80">
                <label
                  htmlFor="prop-deposit-amount"
                  className="block text-xs font-bold text-gray-700"
                >
                  Jumlah Deposit Keamanan (Rp)
                </label>
                <input
                  id="prop-deposit-amount"
                  type="number"
                  min={1}
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Contoh: 500000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-950">
            <strong>Ketentuan Fee Pemilik:</strong> Setiap transaksi Booking Langsung dikenakan potongan{" "}
            <strong>Biaya Platform 1%</strong> dan{" "}
            <strong>Biaya Layanan & Payment Gateway 2,5% (min. Rp5.000)</strong> yang dipotong otomatis dari dana pemilik. Penyewa bebas biaya tambahan.
          </div>
        </section>
        )}

        {/* 4. Fasilitas & Peraturan */}
        {currentStep === 4 && (
        <>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-extrabold text-gray-900">
              4. Fasilitas & Peraturan
            </h2>
          </div>

          {/* Fasilitas Kamar / Unit */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-700">
              {activeFacilityPreset.roomTitle}
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set([
                  ...activeFacilityPreset.roomFacilities,
                  ...roomFacilities,
                ]),
              ).map((fac) => {
                const selected = roomFacilities.includes(fac);
                return (
                  <button
                    key={fac}
                    type="button"
                    onClick={() =>
                      toggleFacility(setRoomFacilities, fac)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <FacilityIcon name={fac} className="h-3.5 w-3.5 shrink-0" />
                    {fac}
                    {selected && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                value={customRoomFacility}
                onChange={(e) => setCustomRoomFacility(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomFacility(
                      customRoomFacility,
                      () => setCustomRoomFacility(""),
                      roomFacilities,
                      setRoomFacilities,
                    );
                  }
                }}
                placeholder="Tambah fasilitas kamar lain..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  addCustomFacility(
                    customRoomFacility,
                    () => setCustomRoomFacility(""),
                    roomFacilities,
                    setRoomFacilities,
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>
          </div>

          {/* Fasilitas Umum */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-700">
              {activeFacilityPreset.publicTitle}
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set([
                  ...activeFacilityPreset.publicFacilities,
                  ...publicFacilities,
                ]),
              ).map((fac) => {
                const selected = publicFacilities.includes(fac);
                return (
                  <button
                    key={fac}
                    type="button"
                    onClick={() =>
                      toggleFacility(setPublicFacilities, fac)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <FacilityIcon name={fac} className="h-3.5 w-3.5 shrink-0" />
                    {fac}
                    {selected && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                value={customPublicFacility}
                onChange={(e) => setCustomPublicFacility(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomFacility(
                      customPublicFacility,
                      () => setCustomPublicFacility(""),
                      publicFacilities,
                      setPublicFacilities,
                    );
                  }
                }}
                placeholder="Tambah fasilitas umum lain..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  addCustomFacility(
                    customPublicFacility,
                    () => setCustomPublicFacility(""),
                    publicFacilities,
                    setPublicFacilities,
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="prop-rules"
              className="block text-xs font-bold text-gray-700"
            >
              Peraturan Properti (pisahkan dengan koma)
            </label>
            <input
              id="prop-rules"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Dilarang merokok di kamar, Tamu menginap lapor pengelola"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </section>

        {/* 5. Foto Properti */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-gray-900">
                5. Foto Properti
              </h2>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {images.length} foto ditambahkan
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/70 px-4 py-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 transition">
              <Upload className="h-4 w-4" />
              <span>Pilih Foto Properti</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={submitting}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <div className="flex flex-1 gap-2">
              <input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
                placeholder="Atau tempel URL foto (https://...)"
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Tambah URL
              </button>
            </div>
          </div>

          {images.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] text-gray-500">
                Foto dengan tanda <strong className="text-emerald-700">Foto Utama</strong> akan ditampilkan sebagai sampul (featured image) di kartu properti & halaman detail. Klik tombol <strong>Jadikan Foto Utama</strong> pada foto lain untuk menggantinya.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((item, idx) => {
                  const src =
                    item.kind === "local"
                      ? item.previewUrl
                      : resolveImageUrl(item.url);
                  const key =
                    item.kind === "local" ? item.previewUrl : `${item.url}-${idx}`;
                  const isFeatured = idx === 0;
                  return (
                    <div
                      key={key}
                      className={`group relative aspect-4/3 overflow-hidden rounded-xl border bg-gray-100 transition ${
                        isFeatured
                          ? "border-2 border-emerald-600 ring-2 ring-emerald-500/20"
                          : "border-gray-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Foto properti ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {isFeatured ? (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                          Foto Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetFeaturedImage(idx)}
                          title="Jadikan Foto Utama (Featured Image)"
                          className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1 rounded-lg bg-gray-900/80 px-2 py-1.5 text-[10px] font-bold text-white backdrop-blur-xs transition hover:bg-emerald-600"
                        >
                          <Star className="h-3 w-3" />
                          Jadikan Foto Utama
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Hapus foto"
                        className="absolute right-2 top-2 rounded-lg bg-red-600/90 p-1.5 text-white opacity-90 hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        </>
        )}

        {/* 6. Kontak Pengelola */}
        {currentStep === 5 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-extrabold text-gray-900">
              6. Kontak Pengelola
            </h2>
          </div>

          {!isEditMode && isStaffOrAdmin && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-blue-900">
                  Pilih Pemilik Properti (Opsional — khusus Staff/Admin)
                </p>
                {selectedOwnerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOwnerId(null);
                      setOwnerSearch("");
                      setOwnerName(currentUser.name || "");
                      setOwnerPhone(currentUser.phone || "");
                    }}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Reset ke Akun Saya
                  </button>
                )}
              </div>
              <p className="text-[11px] text-blue-800/80">
                Kosongkan jika properti diposting atas nama Staff (nantinya dapat diklaim pemilik asli).
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setOwnerSearching(true);
                      try {
                        const res = await fetch(
                          `/api/proxy/auth/users?search=${encodeURIComponent(ownerSearch.trim())}&limit=10`,
                        );
                        if (res.ok) {
                          const list = await res.json();
                          setOwnerOptions(Array.isArray(list) ? list : []);
                        }
                      } finally {
                        setOwnerSearching(false);
                      }
                    }
                  }}
                  placeholder="Cari nama atau email pemilik..."
                  className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={ownerSearching}
                  onClick={async () => {
                    setOwnerSearching(true);
                    try {
                      const res = await fetch(
                        `/api/proxy/auth/users?search=${encodeURIComponent(ownerSearch.trim())}&limit=10`,
                      );
                      if (res.ok) {
                        const list = await res.json();
                        setOwnerOptions(Array.isArray(list) ? list : []);
                      }
                    } finally {
                      setOwnerSearching(false);
                    }
                  }}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {ownerSearching ? "Mencari..." : "Cari Pemilik"}
                </button>
              </div>
              {ownerOptions.length > 0 && (
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-blue-200 bg-white">
                  {ownerOptions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedOwnerId(u.id);
                        setOwnerSearch(`${u.name} (${u.email})`);
                        setOwnerOptions([]);
                        setOwnerName(u.name);
                        if (u.phone) setOwnerPhone(u.phone);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50 ${
                        selectedOwnerId === u.id ? "bg-blue-50 font-bold" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900">{u.name}</p>
                        <p className="truncate text-[11px] text-gray-500">
                          {u.email} • {formatRoleLabel(u.role)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-blue-700">
                        Pilih
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(() => {
            const isContactLocked = !isStaffOrAdmin || Boolean(selectedOwnerId);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prop-owner-name"
                      className="flex items-center justify-between text-xs font-bold text-gray-700"
                    >
                      <span>Nama Pengelola</span>
                      {isContactLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                          <Lock className="h-3 w-3" />
                          Dari Profil
                        </span>
                      )}
                    </label>
                    <input
                      id="prop-owner-name"
                      value={ownerName}
                      readOnly={isContactLocked}
                      disabled={isContactLocked}
                      onChange={(e) => {
                        if (!isContactLocked) setOwnerName(e.target.value);
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${
                        isContactLocked
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 font-semibold text-gray-600"
                          : "border-gray-200 bg-white focus:border-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prop-owner-phone"
                      className="flex items-center justify-between text-xs font-bold text-gray-700"
                    >
                      <span>Nomor WhatsApp / Telepon</span>
                      {isContactLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                          <Lock className="h-3 w-3" />
                          Terkunci
                        </span>
                      )}
                    </label>
                    <input
                      id="prop-owner-phone"
                      type="tel"
                      value={ownerPhone}
                      readOnly={isContactLocked}
                      disabled={isContactLocked}
                      onChange={(e) => {
                        if (!isContactLocked) setOwnerPhone(e.target.value);
                      }}
                      placeholder={
                        isContactLocked
                          ? "Belum diatur di pengaturan profil"
                          : "08xxxxxxxxxx"
                      }
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${
                        isContactLocked
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 font-semibold text-gray-600"
                          : "border-gray-200 bg-white focus:border-emerald-500"
                      }`}
                    />
                  </div>
                </div>

                {!isStaffOrAdmin && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="space-y-1 text-xs text-emerald-950">
                      <p className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                        <Settings className="h-3.5 w-3.5 text-emerald-600" />
                        Kontak Mengikuti Pengaturan Profil Akun
                      </p>
                      <p className="text-[11px] leading-relaxed text-emerald-800">
                        Nama pengelola, nomor WhatsApp, serta opsi tampilkan/sembunyikan tombol WhatsApp di halaman properti diatur secara terpusat melalui halaman Pengaturan Profil Anda.
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-emerald-700 transition"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Atur di Pengaturan Profil</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}
        </section>
        )}

        {/* Submit / Step Navigation Bar */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </Link>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Kembali
              </button>
            )}
          </div>

          {currentStep < 5 ? (
            <button
              key="next-step-btn"
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700"
            >
              Lanjut ke Step {currentStep + 1}
            </button>
          ) : (
            <button
              key="submit-property-btn"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting
                ? "Menyimpan Properti..."
                : isEditMode
                  ? "Simpan Perubahan"
                  : "Simpan & Ajukan Properti"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
