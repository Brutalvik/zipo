// src/redux/thunks/carThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/redux/store";

import type { Car } from "@/types/car";
import type { CarApi } from "@/types/carApi";
import { mapCarApiToCar } from "@/types/carMapper";

import {
  fetchCars as apiFetchCars,
  fetchFeaturedCars as apiFetchFeaturedCars,
  fetchPopularCars as apiFetchPopularCars,
  fetchCarById as apiFetchCarById,
  type CarsListParams,
} from "@/services/carsApi";

/** Generic async status */
export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type Page = {
  limit: number;
  offset: number;
  total: number;
};

// -------------------------------
// Error helper
// -------------------------------
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

/**
 * Fetch cars list (supports pagination + filters)
 * Stores UI-safe Car[] only.
 */
export const fetchCars = createAsyncThunk<
  { items: Car[]; page: Page },
  CarsListParams | undefined
>("cars/fetchCars", async (params, thunkApi) => {
  try {
    const res = await apiFetchCars(params);
    const apiItems = (res.items ?? []) as CarApi[];
    const items = apiItems.map(mapCarApiToCar);

    const page: Page = res.page
      ? {
          limit: Number(res.page.limit ?? 20),
          offset: Number(res.page.offset ?? 0),
          total: Number(res.page.total ?? items.length),
        }
      : { limit: 20, offset: 0, total: items.length };

    return { items, page };
  } catch (e) {
    return thunkApi.rejectWithValue(getErrorMessage(e));
  }
});

/** Featured cars (home sections) */
export const fetchFeaturedCars = createAsyncThunk<Car[], number | undefined>(
  "cars/fetchFeaturedCars",
  async (limit, thunkApi) => {
    try {
      const res = await apiFetchFeaturedCars(limit ?? 10);
      const apiItems = (res.items ?? []) as CarApi[];
      return apiItems.map(mapCarApiToCar);
    } catch (e) {
      return thunkApi.rejectWithValue(getErrorMessage(e));
    }
  }
);

/** Popular cars (home sections) */
export const fetchPopularCars = createAsyncThunk<Car[], number | undefined>(
  "cars/fetchPopularCars",
  async (limit, thunkApi) => {
    try {
      const res = await apiFetchPopularCars(limit ?? 10);
      const apiItems = (res.items ?? []) as CarApi[];
      return apiItems.map(mapCarApiToCar);
    } catch (e) {
      return thunkApi.rejectWithValue(getErrorMessage(e));
    }
  }
);

/**
 * Fetch a single car by id (always calls API)
 * Saves into byId cache.
 */
export const fetchCarById = createAsyncThunk<Car | null, string>(
  "cars/fetchCarById",
  async (id, thunkApi) => {
    try {
      const apiItem = await apiFetchCarById(id); // CarApi | null
      if (!apiItem) return null;
      return mapCarApiToCar(apiItem as CarApi);
    } catch (e) {
      return thunkApi.rejectWithValue(getErrorMessage(e));
    }
  }
);

/**
 * - Fetch by id "if needed" (cache-aware)
 * - If car exists in byId, returns it immediately (no network)
 * - If not, fetches from API and caches it
 *
 * Pass { id, force: true } to ALWAYS hit API.
 */
export const fetchCarByIdIfNeeded = createAsyncThunk<
  Car | null,
  { id: string; force?: boolean }
>("cars/fetchCarByIdIfNeeded", async ({ id, force }, thunkApi) => {
  try {
    const state = thunkApi.getState() as RootState;
    const cached = state.cars.byId[id] ?? null;

    if (cached && !force) return cached;

    const apiItem = await apiFetchCarById(id);
    if (!apiItem) return null;

    return mapCarApiToCar(apiItem as CarApi);
  } catch (e) {
    return thunkApi.rejectWithValue(getErrorMessage(e));
  }
});
