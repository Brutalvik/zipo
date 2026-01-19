// types/car.ts

import { Feather } from "@expo/vector-icons";

export type CarAmenity =
  | "adaptive_cruise"
  | "air_conditioning"
  | "all_wheel_drive"
  | "android_auto"
  | "apple_carplay"
  | "backup_camera"
  | "blind_spot_monitor"
  | "bluetooth"
  | "child_seat"
  | "heated_seats"
  | "heated_steering_wheel"
  | "keyless_entry"
  | "lane_keep_assist"
  | "navigation"
  | "parking_sensors"
  | "remote_start"
  | "roof_rack"
  | "smoke_free"
  | "sunroof"
  | "usb"
  | "ventilated_seats"
  | "wireless_charging";

export type CarFeatures = {
  amenities: CarAmenity[];
};

export type Car = {
  /* =========================
   * Identity
   * ========================= */
  id: string;
  title: string; // Display name (ex: "Tesla Model 3")
  slug?: string; // Optional SEO / deep link

  /* =========================
   * Media
   * ========================= */
  imageUrl: string; // Primary image (ALWAYS present)
  imageGallery?: string[];
  hasImage?: boolean;
  imagePublic?: boolean;

  /* =========================
   * Vehicle specs
   * ========================= */
  make?: string;
  model?: string;
  trim?: string;
  year?: number;
  bodyType?: string;
  vehicleType?: string;
  fuelType?: string;
  transmission?: string;
  seats?: number;
  doors?: number;
  evRangeKm?: number;
  odometerKm?: number;

  /* =========================
   * Pricing
   * ========================= */
  currency: string;
  pricePerDay: number;
  pricePerHour?: number;
  depositAmount?: number;

  /* =========================
   * Ratings / popularity
   * ========================= */
  rating: number; // 0–5
  reviews: number;
  ratingAvg?: number;
  ratingCount?: number;

  isPopular?: boolean;
  isFeatured?: boolean;

  /* =========================
   * Location (UI friendly)
   * ========================= */
  location: string; // "Downtown, Toronto"
  city?: string;
  area?: string;
  countryCode?: string;

  /* =========================
   * Map support
   * ========================= */
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;

  /* =========================
   * Status / lifecycle
   * ========================= */
  status?: "draft" | "active" | "inactive" | "deleted";
  createdAt?: string;
  updatedAt?: string;

  /* =========================
   * Flexible / future
   * ========================= */
  features?: CarFeatures;
  requirements?: unknown[];
  pricingRules?: Record<string, unknown>;

  /* =========================
   * Host (owner of the car)
   * ========================= */
  host?: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    isVerified?: boolean;
    isAllStar?: boolean;
  } | null;
};

export type HostCar = {
  id: string;
  title?: string | null;
  status?: string | null;

  vehicle_type?: string | null;
  transmission?: string | null;
  seats?: number | null;

  price_per_day?: number | null;
  currency?: string | null;

  country_code?: string | null;
  city?: string | null;
  area?: string | null;

  full_address?: string | null;
  pickup_address?: string | null;

  image_path?: string | null;
  image_gallery?: any[] | string[] | null;

  odometer_km?: number | null;

  features?: any; // jsonb
  requirements?: any; // jsonb

  updated_at?: string | null;
};

export type FeatureItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};
