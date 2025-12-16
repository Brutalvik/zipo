// types/car.ts

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
  status?: "draft" | "active" | "inactive" | "unlisted" | "paused" | "deleted";
  createdAt?: string;
  updatedAt?: string;

  /* =========================
   * Flexible / future
   * ========================= */
  features?: unknown[];
  requirements?: unknown[];
  pricingRules?: Record<string, unknown>;
};
