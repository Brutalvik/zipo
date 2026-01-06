import * as Location from "expo-location";
import { Region } from "react-native-maps";

/** Title-case a city name */
export function titleCaseCity(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Bounding box for a lat/lng + radius in km */
export function bboxFromRadiusKm(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusKm / (111 * Math.max(0.0001, cos));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/** Map region for a lat/lng + radius */
export function regionFromRadius(
  lat: number,
  lng: number,
  radiusKm: number
): Region {
  const latDelta = Math.min(1.2, Math.max(0.02, (radiusKm / 111) * 2.4));
  const cos = Math.cos((lat * Math.PI) / 180);
  const lngDelta = Math.min(
    1.2,
    Math.max(0.02, (radiusKm / (111 * Math.max(0.0001, cos))) * 2.4)
  );
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/** Request and return user's current location (with approx flag + accuracy) */
export async function getUserLocation(): Promise<{
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  isApproxLocation: boolean;
}> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== "granted") throw new Error("Location permission denied");

  const last = await Location.getLastKnownPositionAsync();
  const pos =
    last ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracyMeters =
    typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;
  const isApproxLocation = accuracyMeters != null && accuracyMeters >= 1000;

  return { lat, lng, accuracyMeters, isApproxLocation };
}

/** Geocode a city name → returns lat/lng and normalized city label */
export async function geocodeCity(city: string): Promise<{
  lat: number;
  lng: number;
  cityLabel: string;
}> {
  const cleaned = city.trim();
  if (!cleaned) throw new Error("City name is empty");

  const results = await Location.geocodeAsync(cleaned);
  const first = results?.[0];
  if (!first) throw new Error("City not found");

  return {
    lat: first.latitude,
    lng: first.longitude,
    cityLabel: titleCaseCity(cleaned),
  };
}
