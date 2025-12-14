import { Address } from "./address";

export type Transmission = "Automatic" | "Manual";

export type VehicleType =
  | "Hatchback"
  | "Sedan"
  | "SUV"
  | "MUV"
  | "Coupe"
  | "Convertible"
  | "Pickup"
  | "Van";

export type Car = {
  id: string;
  name: string;
  brand: string;
  rating: number;
  reviews: number;
  location: string;
  pricePerDay: number;
  seats: number;
  imageUrl: string;
  isPopular?: boolean;

  // Optional (if missing, we won't filter by it)
  vehicleType?: VehicleType;

  // Optional (if missing, treated as Automatic)
  transmission?: Transmission;
  pickupAddress?: Address;
};

export type Brand = {
  id: string;
  name: string;
  icon?: string;
};

export type VehicleTypeItem = {
  id: VehicleType;
  label: string;
};
