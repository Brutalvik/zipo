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

export type HostCarsPage = {
  items: HostCar[];
  page?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
};

/**
 * Convert ANY backend car shape (snake_case, camelCase, mixed)
 * into the single UI-facing CarApi shape your app expects.
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

    hasImage: raw?.hasImage === true || raw?.has_image === true,
    imagePublic: raw?.imagePublic !== false && raw?.image_public !== false,
    imagePath: raw?.imagePath ?? raw?.image_path ?? null,

    // hero image preference: gallery[0].url > imageUrl > image_path
    imageUrl: firstGalleryUrl || imageUrlCandidate || null,

    gallery: rawGallery,
    features: raw?.features,
    isPopular: !!(raw?.isPopular ?? raw?.is_popular),
    isFeatured: !!(raw?.isFeatured ?? raw?.is_featured),

    host:
      raw.host && typeof raw.host === "object"
        ? {
            id: String(raw.host.id ?? raw.host_id ?? ""),
            name: raw.host.name ?? null,
            avatarUrl: raw.host.avatarUrl ?? raw.host.avatar_url ?? null,
            phone: raw.host.phone ?? null,
            isVerified: !!raw.host.isVerified,
            isAllStar: !!raw.host.isAllStar,
          }
        : raw.host_id
          ? {
              id: String(raw.host_id),
              name: raw.host_name ?? null,
              avatarUrl: raw.host_avatar_url ?? null,
              phone: raw.host_phone ?? null,
              isVerified: !!raw.host_is_verified,
              isAllStar: !!raw.host_is_all_star,
            }
          : null,

    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

/** =========================================================================
 * Host fetch helper (consistent headers + consistent error parsing)
 * ========================================================================= */
async function hostFetch<T = any>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  if (!token) throw new Error("Missing auth token");

  const res = await fetch(`${HOST_CARS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Request failed");

  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // backend returned non-json but ok; return as any
    return text as unknown as T;
  }
}

/** ===== Host APIs (auth) ===== */

/** Fetch single host car by ID with auth */
export async function fetchHostCar(
  carId: string,
  token: string
): Promise<HostCar> {
  if (!carId) throw new Error("Missing carId");

  const json = await hostFetch<{ car?: HostCar }>(
    `/${encodeURIComponent(carId)}`,
    token
  );

  const car = json?.car ?? null;
  if (!car) throw new Error("Car not found");
  return car;
}

/** Patch host car */
export async function patchHostCar(
  carId: string,
  token: string,
  body: Partial<HostCar>
): Promise<HostCar> {
  if (!carId) throw new Error("Missing carId");

  const json = await hostFetch<{ car?: HostCar }>(
    `/${encodeURIComponent(carId)}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }
  );

  const car = json?.car ?? null;
  if (!car) throw new Error("Failed to update car");
  return car;
}

/** Publish host car */
export async function publishHostCar(
  carId: string,
  token: string
): Promise<HostCar | true> {
  if (!carId) throw new Error("Missing carId");

  const json = await hostFetch<{ car?: HostCar }>(
    `/${encodeURIComponent(carId)}/publish`,
    token,
    { method: "POST" }
  );

  return json?.car ?? true;
}

/**
 * Delist / delete host car
 * NOTE: You had TWO functions doing the same DELETE.
 * Keep ONE canonical function and alias the old name to avoid breaking imports.
 */
export async function delistHostCar(
  carId: string,
  token: string
): Promise<true> {
  if (!carId) throw new Error("Missing carId");

  await hostFetch(`/${encodeURIComponent(carId)}`, token, { method: "DELETE" });

  return true;
}

/** Backwards-compatible alias (so you don’t break existing imports) */
export async function deleteHostCar(
  carId: string,
  token: string
): Promise<true> {
  return delistHostCar(carId, token);
}

/** Relist / activate host car */
export async function relistHostCar(
  carId: string,
  token: string
): Promise<HostCar | true> {
  if (!carId) throw new Error("Missing carId");

  const json = await hostFetch<{ car?: HostCar }>(
    `/${encodeURIComponent(carId)}/activate`,
    token,
    { method: "POST" }
  );

  return json?.car ?? true;
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
  if (Array.isArray(payload)) {
    return { items: payload.filter(Boolean).map(toCarApi) };
  }

  const p: any = payload ?? {};

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

  const single = p.item ?? p.car ?? null;
  if (single) return { items: [toCarApi(single)] };

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

/** Fetch car by id */
export async function fetchCarById(id: string): Promise<CarApi | null> {
  const cleanId = String(id ?? "")
    .trim()
    .split("?")[0]
    .split("#")[0];
  if (!cleanId) return null;

  // cache-buster as a REAL query param (not inside the id)
  const t = Date.now();

  const payload = await apiGet<any>(
    `/api/cars/${encodeURIComponent(cleanId)}?t=${t}`
  );

  const raw = payload?.item ?? payload?.car ?? payload ?? null;
  if (!raw) return null;

  console.log("RAW CAR --> ", raw);

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

// fetch host cars page
export async function fetchHostCarsPage(
  token: string,
  params?: { limit?: number; offset?: number }
): Promise<HostCarsPage> {
  const limit = Number(params?.limit ?? 20);
  const offset = Number(params?.offset ?? 0);

  const json = await hostFetch<HostCarsPage>(
    `?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
      String(offset)
    )}`,
    token
  );

  return {
    items: Array.isArray((json as any)?.items) ? (json as any).items : [],
    page:
      (json as any)?.page && typeof (json as any).page === "object"
        ? (json as any).page
        : undefined,
  };
}
