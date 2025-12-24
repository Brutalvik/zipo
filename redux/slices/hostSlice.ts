// redux/slices/hostSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type HostStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type HostType = "individual" | "business";

export type CancellationPolicy = "flexible" | "moderate" | "strict";
export type AllowedDrivers = "only_primary" | "additional_allowed";
export type IdentityStatus = "not_started" | "pending" | "verified" | "failed";

export type Host = {
  id: string;
  user_id: string;

  status: HostStatus;
  host_type: HostType;

  display_name: string | null;
  base_country_code: string | null;

  // ✅ from your real host object
  base_city?: string | null;
  base_area?: string | null;

  business_name?: string | null;
  email?: string | null;
  phone?: string | null;

  advance_notice_hours?: number | null;
  instant_book_enabled?: boolean | null;

  min_trip_days?: number | null;
  max_trip_days?: number | null;

  cancellation_policy?: CancellationPolicy | null;
  allowed_drivers?: AllowedDrivers | null;

  identity_status?: IdentityStatus | null;

  onboarding_profile_completed?: boolean;
  onboarding_identity_verified?: boolean;
  onboarding_payout_setup?: boolean;
  onboarding_agreement_accepted?: boolean;
  onboarding_first_car_created?: boolean;
  onboarding_first_car_published?: boolean;

  payout_setup_status?: string | null;

  // audit / lifecycle
  created_at?: string;
  updated_at?: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;

  rejection_reason?: string | null;

  [key: string]: any;
};

type HostState = {
  host: Host | null;
  loaded: boolean; // we attempted to load host/me at least once
  loading: boolean;
  error: string | null;
};

const initialState: HostState = {
  host: null,
  loaded: false,
  loading: false,
  error: null,
};

const hostSlice = createSlice({
  name: "host",
  initialState,
  reducers: {
    hostLoadStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    hostLoadSuccess: (state, action: PayloadAction<Host | null>) => {
      state.host = action.payload;
      state.loaded = true;
      state.loading = false;
      state.error = null;
    },
    hostLoadError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.loaded = true;
      state.error = action.payload;
    },

    // Useful for after register/update endpoints return host
    setHost: (state, action: PayloadAction<Host | null>) => {
      state.host = action.payload;
      state.loaded = true;
      state.error = null;
    },

    // Logout / user switch
    clearHost: (state) => {
      state.host = null;
      state.loaded = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  hostLoadStart,
  hostLoadSuccess,
  hostLoadError,
  setHost,
  clearHost,
} = hostSlice.actions;

export default hostSlice.reducer;

// Selectors (optional but nice)
export const selectHost = (state: any) => state.host.host as Host | null;
export const selectHostLoaded = (state: any) => state.host.loaded as boolean;
export const selectHostLoading = (state: any) => state.host.loading as boolean;
export const selectIsHost = (state: any) => !!state.host.host;
