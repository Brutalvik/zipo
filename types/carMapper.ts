// src/types/carMapper.ts

import type { Car } from "./car";
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
    nonEmpty(api.imageUrl) ||
    // if backend ever returns only a path (shouldn’t, but defensive)
    nonEmpty(api.imagePath) ||
    PLACEHOLDER_IMAGE;

  return {
    id: String(api.id),
    title: api.title?.trim() || "Untitled car",

    imageUrl,
    imageGallery: Array.isArray(api.gallery) ? (api.gallery as any[]) : [],
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

    status: (api.status ?? undefined) as Car["status"],
    createdAt: api.createdAt ?? undefined,
    updatedAt: api.updatedAt ?? undefined,
  };
}
