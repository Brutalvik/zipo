//services/carsApi.ts
import { apiGet } from "./api";
import type {
  CarApi,
  CarsListResponse,
  CarItemResponse,
  CarsItemsResponse,
} from "@/types/carApi";

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
