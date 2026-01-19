// src/types/carMapper.ts

import { Feather } from "@expo/vector-icons";
import type { Car, FeatureItem } from "./car";
import type { CarApi } from "./carApi";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/800x500?text=Zipo+Car";

function coerceNumber(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function nonEmpty(s: unknown): string | undefined {
  const v = typeof s === "string" ? s.trim() : "";
  return v ? v : undefined;
}

export function mapCarApiToCar(api: CarApi): Car {
  const area = api.address?.area ?? null;
  const city = api.address?.city ?? null;

  const location = [area, city].filter(Boolean).join(", ") || "—";

  const imageUrl =
    nonEmpty(api.imageUrl) || nonEmpty(api.imagePath) || PLACEHOLDER_IMAGE;

  return {
    id: String(api.id),
    title: api.title?.trim() || "Untitled car",

    imageUrl,
    imageGallery: Array.isArray(api.gallery)
      ? (api.gallery as any[])
          .map((g) => (typeof g === "string" ? g : g?.url))
          .filter(
            (u): u is string => typeof u === "string" && u.trim().length > 0
          )
      : [],
    hasImage: !!api.hasImage,
    imagePublic: !!api.imagePublic,

    vehicleType: api.vehicleType ?? undefined,
    fuelType: api.fuelType ?? undefined,
    transmission: api.transmission ?? undefined,
    seats: api.seats ?? undefined,
    year: api.year ?? undefined,

    currency: api.currency ?? "USD",
    pricePerDay: coerceNumber(api.pricePerDay, 0),

    rating: coerceNumber(api.rating, 0),
    reviews: coerceNumber(api.reviews, 0),

    isPopular: !!api.isPopular,
    isFeatured: !!api.isFeatured,

    location,
    city: city ?? undefined,
    area: area ?? undefined,
    countryCode: api.address?.countryCode ?? undefined,

    pickupLat: api.pickup?.lat ?? undefined,
    pickupLng: api.pickup?.lng ?? undefined,
    pickupAddress: api.address?.fullAddress ?? undefined,

    // FIX: carry features through (your backend sends { amenities: [...] })
    features: api.features,

    host: api.host
      ? {
          id: String(api.host.id),
          name: api.host.name ?? null,
          avatarUrl: api.host.avatarUrl ?? null,
          phone: api.host.phone ?? null,
          isVerified: !!api.host.isVerified,
          // add all-star if backend provides it
          isAllStar: !!(api.host as any)?.isAllStar,
        }
      : null,

    status: (api.status ?? undefined) as Car["status"],
    createdAt: api.createdAt ?? undefined,
    updatedAt: api.updatedAt ?? undefined,
  };
}

export function resolveAmenities(amenityIds: string[]): FeatureItem[] {
  if (!Array.isArray(amenityIds) || amenityIds.length === 0) return [];

  const set = new Set(amenityIds);

  return ALL_FEATURE_ITEMS.filter((f) => set.has(f.id));
}

export const ALL_FEATURE_ITEMS: FeatureItem[] = [
  // Comfort
  { id: "air_conditioning", label: "Air conditioning", icon: "wind" },
  { id: "heated_seats", label: "Heated seats", icon: "wind" },
  { id: "ventilated_seats", label: "Ventilated seats", icon: "wind" },
  { id: "heated_steering_wheel", label: "Heated steering wheel", icon: "wind" },
  { id: "sunroof", label: "Sunroof", icon: "sun" },
  { id: "panoramic_roof", label: "Panoramic roof", icon: "sun" },

  // Tech
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { id: "apple_carplay", label: "Apple CarPlay", icon: "smartphone" },
  { id: "android_auto", label: "Android Auto", icon: "smartphone" },
  { id: "navigation", label: "Navigation", icon: "map" },
  { id: "usb", label: "USB", icon: "cpu" },
  { id: "wireless_charging", label: "Wireless charging", icon: "zap" },
  { id: "keyless_entry", label: "Keyless entry", icon: "key" },
  { id: "remote_start", label: "Remote start", icon: "power" },

  // Safety
  { id: "backup_camera", label: "Backup camera", icon: "camera" },
  { id: "parking_sensors", label: "Parking sensors", icon: "crosshair" },
  { id: "blind_spot_monitor", label: "Blind spot monitor", icon: "eye" },
  { id: "lane_keep_assist", label: "Lane keep assist", icon: "navigation" },
  { id: "adaptive_cruise", label: "Adaptive cruise", icon: "target" },

  // Utility
  { id: "all_wheel_drive", label: "AWD", icon: "compass" },
  { id: "roof_rack", label: "Roof rack", icon: "package" },
  { id: "tow_hitch", label: "Tow hitch", icon: "link" },
  { id: "third_row", label: "3rd row seating", icon: "users" },
  { id: "ski_rack", label: "Ski rack", icon: "archive" },

  // Policies / convenience
  { id: "pet_friendly", label: "Pet friendly", icon: "heart" },
  { id: "smoke_free", label: "Smoke-free", icon: "slash" },
  { id: "child_seat", label: "Child seat", icon: "user" },
];
