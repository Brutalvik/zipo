// src/types/carApi.ts

export type CarApi = {
  id: string;
  title: string | null;

  vehicleType: string | null;
  transmission: string | null;
  fuelType: string | null;

  seats: number | null;
  year: number | null;

  currency: string | null;
  pricePerDay: number | null;

  rating: number | null;
  reviews: number | null;

  status: string | null;

  address: {
    countryCode: string | null;
    city: string | null;
    area: string | null;
    fullAddress: string | null;
  };

  pickup: {
    lat: number | null;
    lng: number | null;
  };

  hasImage: boolean;
  imagePublic: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  gallery: unknown[] | null;

  isPopular: boolean;
  isFeatured: boolean;

  createdAt: string | null;
  updatedAt: string | null;
};

// responses your backend uses today
export type CarsListResponse = {
  items: CarApi[];
  page?: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type CarItemResponse = { item: CarApi };
export type CarsItemsResponse = { items: CarApi[] };
