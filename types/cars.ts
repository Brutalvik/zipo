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
};

export type Brand = {
  id: string;
  name: string;
  icon?: string;
};
