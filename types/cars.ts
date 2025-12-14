export type Transmission = "Automatic" | "Manual";

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

  // NEW (optional so your existing JSON still works)
  transmission?: Transmission;
};

export type Brand = {
  id: string;
  name: string;
  icon?: string;
};
