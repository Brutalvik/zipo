// src/redux/slices/carSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/redux/store";

import type { Car } from "@/types/car";
import type { AsyncStatus, Page } from "@/redux/thunks/carThunk";

import {
  fetchCars,
  fetchFeaturedCars,
  fetchPopularCars,
  fetchCarById,
  fetchCarByIdIfNeeded,
} from "@/redux/thunks/carThunk";

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

const carsSlice = createSlice({
  name: "cars",
  initialState,
  reducers: {
    resetCarsState: () => initialState,
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

    // ---- BY ID (always fetch) ----
    builder
      .addCase(fetchCarById.pending, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "loading";
        state.errorById[id] = null;
      })
      .addCase(fetchCarById.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "succeeded";
        if (action.payload) state.byId[action.payload.id] = action.payload;
      })
      .addCase(fetchCarById.rejected, (state, action) => {
        const id = action.meta.arg;
        state.statusById[id] = "failed";
        state.errorById[id] =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load car";
      });

    // ---- BY ID (cache-aware) ✅ ----
    builder
      .addCase(fetchCarByIdIfNeeded.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.statusById[id] = "loading";
        state.errorById[id] = null;
      })
      .addCase(fetchCarByIdIfNeeded.fulfilled, (state, action) => {
        const id = action.meta.arg.id;
        state.statusById[id] = "succeeded";
        if (action.payload) state.byId[action.payload.id] = action.payload;
      })
      .addCase(fetchCarByIdIfNeeded.rejected, (state, action) => {
        const id = action.meta.arg.id;
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
