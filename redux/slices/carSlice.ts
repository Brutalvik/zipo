// src/redux/slices/carSlice.ts
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
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
type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type Page = {
  limit: number;
  offset: number;
  total: number;
};

type CarsState = {
  // Main browse list
  items: Car[];
  page: Page;

  // Featured & popular sections
  featured: Car[];
  popular: Car[];

  // Single item cache (by id)
  byId: Record<string, Car>;

  // Statuses
  statusList: AsyncStatus;
  statusFeatured: AsyncStatus;
  statusPopular: AsyncStatus;
  statusById: Record<string, AsyncStatus>;

  // Errors (human readable)
  errorList: string | null;
  errorFeatured: string | null;
  errorPopular: string | null;
  errorById: Record<string, string | null>;
};

const initialState: CarsState = {
  items: [],
  page: { limit: 20, offset: 0, total: 0 },

  featured: [],
  popular: [],

  byId: {},

  statusList: "idle",
  statusFeatured: "idle",
  statusPopular: "idle",
  statusById: {},

  errorList: null,
  errorFeatured: null,
  errorPopular: null,
  errorById: {},
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

// -------------------------------
// Thunks
// -------------------------------

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

    // api layer may return unknown shapes; normalize there.
    // Here we treat res.items as CarApi[]
    const apiItems = (res.items ?? []) as CarApi[];
    const items = apiItems.map(mapCarApiToCar);
    // console.log("Fetched cars:", items);

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

/**
 * Featured cars (home sections)
 */
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

/**
 * Popular cars (home sections)
 */
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
 * Fetch a single car by id
 * Saves into byId cache.
 */
export const fetchCarById = createAsyncThunk<Car | null, string>(
  "cars/fetchCarById",
  async (id, thunkApi) => {
    try {
      const apiItem = await apiFetchCarById(id); // returns CarApi | null
      if (!apiItem) return null;

      const car = mapCarApiToCar(apiItem as CarApi);
      return car;
    } catch (e) {
      return thunkApi.rejectWithValue(getErrorMessage(e));
    }
  }
);

// -------------------------------
// Slice
// -------------------------------

const carsSlice = createSlice({
  name: "cars",
  initialState,
  reducers: {
    // Useful for logout or switching country
    resetCarsState: () => initialState,

    // Optional: update pagination locally (rarely needed if server driven)
    setCarsPage(state, action: PayloadAction<Partial<Page>>) {
      state.page = { ...state.page, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // ---- LIST ----
    builder
      .addCase(fetchCars.pending, (state) => {
        state.statusList = "loading";
        state.errorList = null;
      })
      .addCase(fetchCars.fulfilled, (state, action) => {
        state.statusList = "succeeded";
        state.items = action.payload.items;
        state.page = action.payload.page;

        // prime byId cache
        for (const c of action.payload.items) state.byId[c.id] = c;
      })
      .addCase(fetchCars.rejected, (state, action) => {
        state.statusList = "failed";
        state.errorList =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load cars";
      });

    // ---- FEATURED ----
    builder
      .addCase(fetchFeaturedCars.pending, (state) => {
        state.statusFeatured = "loading";
        state.errorFeatured = null;
      })
      .addCase(fetchFeaturedCars.fulfilled, (state, action) => {
        state.statusFeatured = "succeeded";
        state.featured = action.payload;
        for (const c of action.payload) state.byId[c.id] = c;
      })
      .addCase(fetchFeaturedCars.rejected, (state, action) => {
        state.statusFeatured = "failed";
        state.errorFeatured =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load featured cars";
      });

    // ---- POPULAR ----
    builder
      .addCase(fetchPopularCars.pending, (state) => {
        state.statusPopular = "loading";
        state.errorPopular = null;
      })
      .addCase(fetchPopularCars.fulfilled, (state, action) => {
        state.statusPopular = "succeeded";
        state.popular = action.payload;
        for (const c of action.payload) state.byId[c.id] = c;
      })
      .addCase(fetchPopularCars.rejected, (state, action) => {
        state.statusPopular = "failed";
        state.errorPopular =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load popular cars";
      });

    // ---- BY ID ----
    builder
      .addCase(fetchCarById.pending, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "loading";
        state.errorById[id] = null;
      })
      .addCase(fetchCarById.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "succeeded";

        if (action.payload) {
          state.byId[action.payload.id] = action.payload;
        }
      })
      .addCase(fetchCarById.rejected, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "failed";
        state.errorById[id] =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load car";
      });
  },
});

export const { resetCarsState, setCarsPage } = carsSlice.actions;
export default carsSlice.reducer;

// -------------------------------
// Selectors
// -------------------------------
export const selectCars = (state: RootState) => state.cars.items;
export const selectCarsPage = (state: RootState) => state.cars.page;

export const selectFeaturedCars = (state: RootState) => state.cars.featured;
export const selectPopularCars = (state: RootState) => state.cars.popular;

export const selectCarsStatus = (state: RootState) => state.cars.statusList;
export const selectFeaturedStatus = (state: RootState) =>
  state.cars.statusFeatured;
export const selectPopularStatus = (state: RootState) =>
  state.cars.statusPopular;

export const selectCarsError = (state: RootState) => state.cars.errorList;

export const selectCarById = (id: string) => (state: RootState) =>
  state.cars.byId[id] ?? null;

export const selectCarStatusById = (id: string) => (state: RootState) =>
  state.cars.statusById[id] ?? "idle";

export const selectCarErrorById = (id: string) => (state: RootState) =>
  state.cars.errorById[id] ?? null;
