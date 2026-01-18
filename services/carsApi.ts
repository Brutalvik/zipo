// services/carsApi.ts
import * as Location from "expo-location";
import { apiGet } from "./api";
import type {
  CarApi,
  CarsListResponse,
  CarItemResponse,
  CarsItemsResponse,
} from "@/types/carApi";
import type { HostCar } from "@/types/car";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

const HOST_CARS_API_BASE = `${API_BASE}/api/host/cars`;

/**
 * Convert ANY backend car shape (snake_case, camelCase, mixed)
 * into the single UI-facing CarApi shape your app expects.
 *
 * IMPORTANT:
 * - Hero photo should follow your host finalize/reorder behavior:
 *   prefer first gallery item's url, else fallback to imageUrl/image_path.
 */
function toCarApi(raw: any): CarApi {
  const rawGallery = raw?.gallery ?? raw?.image_gallery ?? null;

  const firstGalleryUrl =
    Array.isArray(rawGallery) && rawGallery.length > 0
      ? String(rawGallery[0]?.url ?? rawGallery[0] ?? "").trim()
      : "";

  const imageUrlCandidate = String(
    raw?.imageUrl ?? raw?.image_url ?? raw?.imagePath ?? raw?.image_path ?? ""
  ).trim();

  return {
    id: String(raw?.id ?? ""),
    title: raw?.title ?? null,

    vehicleType: raw?.vehicleType ?? raw?.vehicle_type ?? null,
    transmission: raw?.transmission ?? null,
    fuelType: raw?.fuelType ?? raw?.fuel_type ?? null,

    seats: typeof raw?.seats === "number" ? raw.seats : (raw?.seats ?? null),
    year: typeof raw?.year === "number" ? raw.year : (raw?.year ?? null),

    currency: raw?.currency ?? null,
    pricePerDay:
      typeof raw?.pricePerDay === "number"
        ? raw.pricePerDay
        : typeof raw?.price_per_day === "number"
          ? raw.price_per_day
          : (raw?.pricePerDay ?? raw?.price_per_day ?? null),

    rating:
      typeof raw?.rating === "number"
        ? raw.rating
        : typeof raw?.rating_avg === "number"
          ? raw.rating_avg
          : (raw?.rating ?? raw?.rating_avg ?? null),

    reviews:
      typeof raw?.reviews === "number"
        ? raw.reviews
        : typeof raw?.rating_count === "number"
          ? raw.rating_count
          : (raw?.reviews ?? raw?.rating_count ?? null),

    status: raw?.status ?? null,

    address: {
      countryCode: raw?.address?.countryCode ?? raw?.country_code ?? null,
      city: raw?.address?.city ?? raw?.city ?? null,
      area: raw?.address?.area ?? raw?.area ?? null,
      fullAddress: raw?.address?.fullAddress ?? raw?.full_address ?? null,
    },

    pickup: {
      lat: raw?.pickup?.lat ?? raw?.pickup_lat ?? null,
      lng: raw?.pickup?.lng ?? raw?.pickup_lng ?? null,
    },

    hasImage: !!(raw?.hasImage ?? raw?.has_image),
    imagePublic: !!(raw?.imagePublic ?? raw?.image_public),
    imagePath: raw?.imagePath ?? raw?.image_path ?? null,

    // ✅ hero image preference: gallery[0].url > imageUrl > image_path
    imageUrl: firstGalleryUrl || imageUrlCandidate || null,

    gallery: rawGallery,

    isPopular: !!(raw?.isPopular ?? raw?.is_popular),
    isFeatured: !!(raw?.isFeatured ?? raw?.is_featured),

    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

/** ===== Host APIs (auth) ===== */

/** Fetch single host car by ID with auth */
export async function fetchHostCar(
  carId: string,
  token: string
): Promise<HostCar> {
  if (!carId) throw new Error("Missing carId");
  if (!token) throw new Error("Missing auth token");

  const res = await fetch(
    `${HOST_CARS_API_BASE}/${encodeURIComponent(carId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to fetch car");

  const json = JSON.parse(text);
  const car: HostCar | null = json?.car ?? null;
  if (!car) throw new Error("Car not found");
  return car;
}

/** Patch host car */
export async function patchHostCar(
  carId: string,
  token: string,
  body: Partial<HostCar>
) {
  if (!carId) throw new Error("Missing carId");
  if (!token) throw new Error("Missing auth token");

  const res = await fetch(
    `${HOST_CARS_API_BASE}/${encodeURIComponent(carId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to update car");

  const json = JSON.parse(text);
  return json?.car;
}

/** Publish host car */
export async function publishHostCar(carId: string, token: string) {
  if (!carId) throw new Error("Missing carId");
  if (!token) throw new Error("Missing auth token");

  const res = await fetch(
    `${HOST_CARS_API_BASE}/${encodeURIComponent(carId)}/publish`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to publish car");

  const json = JSON.parse(text);
  return json?.car ?? true;
}

/** Deactivate host car */
export async function deleteHostCar(carId: string, token: string) {
  if (!carId) throw new Error("Missing carId");

  const res = await fetch(
    `${HOST_CARS_API_BASE}/${encodeURIComponent(carId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to delete car");

  return true;
}

/** ===== Bounding Box Utilities ===== */
export function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const earth = 6371; // km
  const dLat = (radiusKm / earth) * (180 / Math.PI);
  const dLng =
    ((radiusKm / earth) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);

  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/** ===== Normalize API Responses ===== */
type AnyCarsResponse =
  | CarsListResponse
  | CarsItemsResponse
  | CarItemResponse
  | CarApi[]
  | { items?: unknown; item?: unknown; car?: unknown; page?: unknown };

function normalizeCarsList(payload: AnyCarsResponse): CarsListResponse {
  // 1) Backend returned an array directly: [ ...cars ]
  if (Array.isArray(payload)) {
    return {
      items: payload.filter(Boolean).map(toCarApi),
    };
  }

  const p: any = payload ?? {};

  // 2) Backend returned { items: [...] , page: {...} }
  if (Array.isArray(p.items)) {
    return {
      items: p.items.filter(Boolean).map(toCarApi),
      page:
        p.page && typeof p.page === "object"
          ? {
              limit: Number(p.page.limit ?? 20),
              offset: Number(p.page.offset ?? 0),
              total: Number(p.page.total ?? p.items.length),
            }
          : undefined,
    };
  }

  // 3) Backend returned { item: {...} } or { car: {...} }
  const single = p.item ?? p.car ?? null;
  if (single) {
    return { items: [toCarApi(single)] };
  }

  // 4) Fallback
  return { items: [] };
}

/** ===== Query Helpers ===== */
export type CarsListParams = Partial<{
  country: string;
  city: string;
  area: string;
  type: string;
  transmission: string;
  fuel: string;
  seats: string | number;
  yearMin: string | number;
  yearMax: string | number;
  minPrice: string | number;
  maxPrice: string | number;
  hasImage: "true" | "false";
  status: string;
  q: string;
  sort: "newest" | "price_asc" | "price_desc" | "rating_desc" | "popular";
  limit: string | number;
  offset: string | number;
  lat?: number;
  lng?: number;
  radius?: string | number;
  pickup_date?: string;
  return_date?: string;
}>;

function toQuery(params?: CarsListParams) {
  const sp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** ===== Core API Fetchers ===== */
export async function fetchCars(params?: CarsListParams) {
  const payload = await apiGet<AnyCarsResponse>(`/api/cars${toQuery(params)}`);
  return normalizeCarsList(payload);
}

export async function fetchFeaturedCars(limit = 10) {
  const payload = await apiGet<AnyCarsResponse>(
    `/api/cars/featured?limit=${limit}`
  );
  return normalizeCarsList(payload);
}

export async function fetchPopularCars(limit = 10) {
  const payload = await apiGet<AnyCarsResponse>(
    `/api/cars/popular?limit=${limit}`
  );
  return normalizeCarsList(payload);
}

// ✅ FIXED: normalize to CarApi so mapCarApiToCar always gets the right shape
export async function fetchCarById(id: string): Promise<CarApi | null> {
  const payload = await apiGet<any>(`/api/cars/${encodeURIComponent(id)}`);
  const raw = payload?.item ?? payload?.car ?? payload ?? null;
  if (!raw) return null;
  return toCarApi(raw);
}

/** ===== Radius-Based Fetch + Coordinate Helpers ===== */
export type ApiCar = {
  id: string;
  title: string;
  imageUrl: string;
  pricePerDay: number;
  currency: string;
  rating: number;
  reviews: number;
  vehicleType?: string | null;
  transmission?: string | null;
  seats?: number | null;
  address?: {
    countryCode?: string | null;
    city?: string | null;
    area?: string | null;
    fullAddress?: string | null;
  };
  pickup?: {
    lat?: number | null;
    lng?: number | null;
  };
};

/** Filter out cars without coordinates */
export function filterCarsWithCoords(cars: ApiCar[]): ApiCar[] {
  return cars.filter(
    (c) =>
      typeof c.pickup?.lat === "number" &&
      typeof c.pickup?.lng === "number" &&
      Number.isFinite(c.pickup.lat) &&
      Number.isFinite(c.pickup.lng)
  );
}

/** Fetch cars from API using center lat/lng + radius (in km) */
export async function fetchCarsForRadius(
  API_BASE: string,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<ApiCar[]> {
  if (!API_BASE) {
    console.warn("EXPO_PUBLIC_API_BASE is missing");
    return [];
  }

  const bb = getBoundingBox(lat, lng, radiusKm);

  const url =
    `${API_BASE}/api/cars/map` +
    `?minLat=${encodeURIComponent(bb.minLat)}` +
    `&maxLat=${encodeURIComponent(bb.maxLat)}` +
    `&minLng=${encodeURIComponent(bb.minLng)}` +
    `&maxLng=${encodeURIComponent(bb.maxLng)}` +
    `&lat=${encodeURIComponent(lat)}` +
    `&lng=${encodeURIComponent(lng)}` +
    `&radiusKm=${encodeURIComponent(radiusKm)}` +
    `&limit=500`;

  try {
    const resp = await fetch(url);
    const json = await resp.json();

    const listRaw = Array.isArray((json as any)?.items)
      ? (json as any).items
      : Array.isArray(json)
        ? json
        : [];

    const list: any[] = Array.isArray(listRaw) ? listRaw.filter(Boolean) : [];

    return list.map((c: any) => {
      const pickupLat =
        typeof c?.pickup?.lat === "number"
          ? c.pickup.lat
          : typeof c?.pickup_lat === "number"
            ? c.pickup_lat
            : typeof c?.pickupLat === "number"
              ? c.pickupLat
              : null;

      const pickupLng =
        typeof c?.pickup?.lng === "number"
          ? c.pickup.lng
          : typeof c?.pickup_lng === "number"
            ? c.pickup_lng
            : typeof c?.pickupLng === "number"
              ? c.pickupLng
              : null;

      return {
        id: String(c.id),
        title: String(c.title ?? c.name ?? ""),
        imageUrl: String(c.imageUrl ?? c.image_url ?? c.image_path ?? ""),
        pricePerDay: Number(c.pricePerDay ?? c.price_per_day ?? 0),
        currency: String(c.currency ?? "CAD"),
        rating: Number(c.rating ?? c.rating_avg ?? 0),
        reviews: Number(c.reviews ?? c.rating_count ?? 0),
        vehicleType: (c.vehicleType ?? c.vehicle_type ?? null) as any,
        transmission: (c.transmission ?? null) as any,
        seats: typeof c.seats === "number" ? c.seats : null,
        address: {
          countryCode: c?.address?.countryCode ?? c?.country_code ?? null,
          city: c?.address?.city ?? c?.city ?? null,
          area: c?.address?.area ?? c?.area ?? null,
          fullAddress: c?.address?.fullAddress ?? c?.full_address ?? null,
        },
        pickup: { lat: pickupLat, lng: pickupLng },
      };
    });
  } catch (e) {
    console.warn("cars/map fetch failed", e);
    return [];
  }
}

/** Geocode a city string to lat/lng */
export async function geocodeCity(
  city: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const results = await Location.geocodeAsync(city.trim());
    const first = results?.[0];
    if (!first) return null;
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}
