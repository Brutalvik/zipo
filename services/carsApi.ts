// services/carsApi.ts
import * as Location from "expo-location";
import { apiGet } from "./api";
import type {
  CarApi,
  CarsListResponse,
  CarItemResponse,
  CarsItemsResponse,
} from "@/types/carApi";

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
  | { items?: unknown; item?: unknown; page?: unknown };

function isCarApi(x: unknown): x is CarApi {
  return !!x && typeof x === "object" && "id" in (x as any);
}

function normalizeCarsList(payload: AnyCarsResponse): CarsListResponse {
  if (Array.isArray(payload)) {
    return { items: payload.filter(isCarApi) };
  }

  const p: any = payload ?? {};
  if (Array.isArray(p.items)) {
    return {
      items: p.items.filter(isCarApi),
      page: p.page && typeof p.page === "object" ? p.page : undefined,
    };
  }

  if (p.item && isCarApi(p.item)) {
    return { items: [p.item] };
  }

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

export async function fetchCarById(id: string) {
  const payload = await apiGet<CarItemResponse>(
    `/api/cars/${encodeURIComponent(id)}`
  );
  return payload?.item ?? null;
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
        pickup: {
          lat: pickupLat,
          lng: pickupLng,
        },
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
