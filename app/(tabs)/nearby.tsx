import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import NearbyFiltersModal, {
  DEFAULT_FILTERS,
  NearbyFilters,
} from "@/components/nearby/NearbyFilterModal";

type ApiCar = {
  id: string;
  title: string;
  imageUrl: string;
  pricePerDay: number;
  currency: string;
  rating: number;
  reviews: number;
  vehicleType?: string | null;
  transmission?: string | null;
  seats?: number | null;
  hasImage?: boolean;
  address?: {
    countryCode?: string | null;
    city?: string | null;
    area?: string | null;
    fullAddress?: string | null;
  };
  pickup?: {
    lat?: number | null;
    lng?: number | null;
  };
};

function titleCaseCity(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function bboxFromRadiusKm(lat: number, lng: number, radiusKm: number) {
  // 1 deg lat ≈ 111km
  const dLat = radiusKm / 111;
  // 1 deg lng ≈ 111km * cos(lat)
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusKm / (111 * Math.max(0.0001, cos));

  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

function regionFromRadius(lat: number, lng: number, radiusKm: number): Region {
  // stable + sane (never world view)
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

function filterToChips(f: NearbyFilters): string[] {
  const chips: string[] = [];
  if (f.vehicleType) chips.push(f.vehicleType);
  if (f.transmission) chips.push(f.transmission);
  if (f.fuelType) chips.push(f.fuelType);
  if (f.minSeats != null) chips.push(`${f.minSeats}+ seats`);
  if (f.minRating != null) chips.push(`${f.minRating.toFixed(1)}★+`);
  if (f.onlyWithPhotos) chips.push("Photos only");
  if (f.maxPriceEnabled) {
    chips.push(
      f.maxPricePerDay >= 300 ? "≤ $Max/day" : `≤ $${f.maxPricePerDay}/day`
    );
  }
  return chips;
}

export default function NearbyScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);

  const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, "");

  const [isLoading, setIsLoading] = useState(false);

  const [locAllowed, setLocAllowed] = useState<boolean | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // City editing + persist
  const [cityInput, setCityInput] = useState<string>("");
  const [cityLabel, setCityLabel] = useState<string>(""); // pill text (chips)
  const [isUsingUserLocation, setIsUsingUserLocation] = useState(true);

  // Slider values (smooth UI vs committed)
  const [radiusUiKm, setRadiusUiKm] = useState<number>(10);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const MAX_RADIUS = 50;

  const [cars, setCars] = useState<ApiCar[]>([]);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<NearbyFilters>(DEFAULT_FILTERS);

  const carsWithCoords = useMemo(() => {
    return cars.filter(
      (c) =>
        typeof c.pickup?.lat === "number" &&
        typeof c.pickup?.lng === "number" &&
        Number.isFinite(c.pickup.lat) &&
        Number.isFinite(c.pickup.lng)
    );
  }, [cars]);

  // Apply filters to current list
  const filteredCars = useMemo(() => {
    let list = cars;

    if (filters.onlyWithPhotos) {
      list = list.filter((c) => !!c.hasImage);
    }

    if (filters.vehicleType) {
      list = list.filter(
        (c) =>
          (c.vehicleType ?? "").toLowerCase() ===
          filters.vehicleType!.toLowerCase()
      );
    }

    if (filters.transmission) {
      list = list.filter(
        (c) =>
          (c.transmission ?? "").toLowerCase() ===
          filters.transmission!.toLowerCase()
      );
    }

    // Fuel type is UI-only unless your API includes it; if not present, it simply won't match.
    if (filters.fuelType) {
      list = list.filter((c: any) => {
        const ft = String(c?.fuelType ?? c?.fuel_type ?? "").toLowerCase();
        return ft === filters.fuelType!.toLowerCase();
      });
    }

    if (filters.minSeats != null) {
      list = list.filter((c) => (c.seats ?? 0) >= filters.minSeats!);
    }

    if (filters.minRating != null) {
      list = list.filter((c) => (c.rating ?? 0) >= filters.minRating!);
    }

    if (filters.maxPriceEnabled) {
      list = list.filter(
        (c) =>
          (c.pricePerDay ?? Number.POSITIVE_INFINITY) <= filters.maxPricePerDay
      );
    }

    return list;
  }, [cars, filters]);

  const filteredCarsWithCoords = useMemo(() => {
    return filteredCars.filter(
      (c) =>
        typeof c.pickup?.lat === "number" &&
        typeof c.pickup?.lng === "number" &&
        Number.isFinite(c.pickup.lat) &&
        Number.isFinite(c.pickup.lng)
    );
  }, [filteredCars]);

  const activeFilterChips = useMemo(() => filterToChips(filters), [filters]);

  const requestAndLoadLocation = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      const granted = perm.status === "granted";
      setLocAllowed(granted);
      if (!granted) return;

      const last = await Location.getLastKnownPositionAsync();
      const pos =
        last ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);
      setIsUsingUserLocation(true);

      // label city
      const res = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      const first = res?.[0];
      const cityGuess =
        first?.city ||
        first?.subregion ||
        first?.region ||
        first?.district ||
        "";

      const label = titleCaseCity(cityGuess) || "Your area";
      setCityLabel(label);
      setCityInput(label);

      // zoom now (prevents continent view)
      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(
          regionFromRadius(lat, lng, radiusKm),
          250
        );
      });
    } catch {
      setLocAllowed(false);
    }
  }, [radiusKm]);

  const fetchCarsForRadius = useCallback(
    async (lat: number, lng: number, rKm: number) => {
      if (!API_BASE) {
        console.warn("EXPO_PUBLIC_API_BASE is missing");
        setCars([]);
        return;
      }

      const bb = bboxFromRadiusKm(lat, lng, rKm);

      const url =
        `${API_BASE}/api/cars/map` +
        `?minLat=${encodeURIComponent(bb.minLat)}` +
        `&maxLat=${encodeURIComponent(bb.maxLat)}` +
        `&minLng=${encodeURIComponent(bb.minLng)}` +
        `&maxLng=${encodeURIComponent(bb.maxLng)}` +
        `&status=active` +
        `&limit=500`;

      setIsLoading(true);
      try {
        const resp = await fetch(url);
        const json = await resp.json();

        const listRaw = Array.isArray((json as any)?.items)
          ? (json as any).items
          : Array.isArray(json)
          ? json
          : [];

        const list: ApiCar[] = Array.isArray(listRaw)
          ? (listRaw as any[]).filter(Boolean)
          : [];

        setCars(list);
      } catch (e) {
        console.warn("cars/map fetch failed", e);
        setCars([]);
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE]
  );

  // Convert typed city -> coordinates (no new endpoint)
  const geocodeCityAndSearch = useCallback(
    async (city: string) => {
      const cleaned = city.trim();
      if (!cleaned) return;

      try {
        const results = await Location.geocodeAsync(cleaned);
        const first = results?.[0];
        if (!first) {
          Alert.alert("City not found", "Try a different city name.", [
            { text: "OK" },
          ]);
          return;
        }

        const lat = first.latitude;
        const lng = first.longitude;

        setIsUsingUserLocation(false);
        setCityLabel(titleCaseCity(cleaned));
        setUserLat(lat);
        setUserLng(lng);

        mapRef.current?.animateToRegion(
          regionFromRadius(lat, lng, radiusKm),
          250
        );
        fetchCarsForRadius(lat, lng, radiusKm);
      } catch {
        Alert.alert("Couldn’t search city", "Please try again.", [
          { text: "OK" },
        ]);
      }
    },
    [fetchCarsForRadius, radiusKm]
  );

  // initial boot
  useEffect(() => {
    requestAndLoadLocation();
  }, [requestAndLoadLocation]);

  // fetch + zoom when committed radius changes
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    mapRef.current?.animateToRegion(
      regionFromRadius(userLat, userLng, radiusKm),
      250
    );
    fetchCarsForRadius(userLat, userLng, radiusKm);
  }, [userLat, userLng, radiusKm, fetchCarsForRadius]);

  const headerTitle = useMemo(() => {
    if (locAllowed === false) return "Location needed";
    const n = filteredCarsWithCoords.length;
    if (n === 0) return "No cars found nearby";
    if (n >= 50) return "50+ cars found nearby";
    return `${n} cars found nearby`;
  }, [filteredCarsWithCoords.length, locAllowed]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Text style={styles.brand}>Zipo</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={[styles.iconBtn, SHADOW_CARD]}>
            <Feather name="bell" size={18} color={COLORS.text} />
            <View style={styles.badgeDot}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.avatar, SHADOW_CARD]}>
            <Text style={styles.avatarText}>VK</Text>
          </Pressable>
        </View>
      </View>

      {/* City input pill + buttons */}
      <View style={styles.searchRow}>
        <View style={[styles.cityPill, SHADOW_CARD]}>
          <Feather name="map-pin" size={16} color={COLORS.muted} />

          <TextInput
            value={cityInput}
            onChangeText={(t) => {
              setCityInput(t);
              setCityLabel(t);
            }}
            placeholder="Search city"
            placeholderTextColor="#9CA3AF"
            style={styles.cityInput}
            returnKeyType="search"
            onSubmitEditing={() => geocodeCityAndSearch(cityInput)}
          />

          {/* back to user location */}
          <Pressable
            onPress={() => requestAndLoadLocation()}
            style={styles.circleBtn}
            accessibilityRole="button"
          >
            <Feather name="crosshair" size={16} color={COLORS.text} />
          </Pressable>
        </View>

        {/* Filters */}
        <Pressable
          onPress={() => {
            if (cars.length === 0) {
              Alert.alert(
                "No cars found",
                "Try increasing the radius or refresh location, then apply filters.",
                [{ text: "OK" }]
              );
              return;
            }
            setFiltersOpen(true);
          }}
          style={[styles.filterBtn, SHADOW_CARD]}
          accessibilityRole="button"
        >
          <Feather name="sliders" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      {/* Count + subtitle */}
      <View style={styles.resultsBlock}>
        <Text style={styles.resultsTitle}>{headerTitle}</Text>
        <Text style={styles.resultsSub}>
          {locAllowed === false
            ? "Enable location to see nearby cars."
            : `Showing results within ${radiusKm} km`}
        </Text>

        {/* Active filter chips + clear */}
        {activeFilterChips.length ? (
          <View style={styles.chipsRow}>
            {activeFilterChips.map((c) => (
              <View key={c} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{c}</Text>
              </View>
            ))}

            <Pressable
              onPress={() => setFilters(DEFAULT_FILTERS)}
              style={[styles.clearChip, SHADOW_CARD]}
            >
              <Text style={styles.clearChipText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Radius slider */}
      <View style={styles.radiusCard}>
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Radius</Text>
          <Text style={styles.radiusValue}>{radiusUiKm} km</Text>
        </View>

        <Slider
          value={radiusUiKm}
          minimumValue={1}
          maximumValue={MAX_RADIUS}
          step={1}
          minimumTrackTintColor={COLORS.black}
          maximumTrackTintColor={"rgba(0,0,0,0.14)"}
          thumbTintColor={COLORS.black}
          onValueChange={(v) => setRadiusUiKm(v)}
          onSlidingComplete={(v) => setRadiusKm(v)}
        />
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 51.0447,
            longitude: -114.0719,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
        >
          {/* Blue dot (custom) */}
          {userLat != null && userLng != null ? (
            <Marker
              coordinate={{ latitude: userLat, longitude: userLng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.blueDotOuter}>
                <View style={styles.blueDot} />
              </View>
            </Marker>
          ) : null}

          {/* Cars */}
          {filteredCarsWithCoords.map((car) => (
            <Marker
              key={car.id}
              coordinate={{
                latitude: car.pickup!.lat!,
                longitude: car.pickup!.lng!,
              }}
              tracksViewChanges={false}
            >
              <View style={styles.priceMarker}>
                <Text style={styles.priceMarkerText}>${car.pricePerDay}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Refresh */}
        <Pressable
          onPress={() => {
            if (userLat != null && userLng != null) {
              mapRef.current?.animateToRegion(
                regionFromRadius(userLat, userLng, radiusKm),
                250
              );
              fetchCarsForRadius(userLat, userLng, radiusKm);
            } else {
              requestAndLoadLocation();
            }
          }}
          style={[styles.refreshFab, SHADOW_CARD]}
          accessibilityRole="button"
        >
          <Feather name="refresh-cw" size={18} color={COLORS.text} />
          <Text style={styles.refreshFabText}>
            {isLoading ? "Loading…" : "Refresh"}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: tabBarHeight }} />

      {/* Filters modal */}
      <NearbyFiltersModal
        visible={filtersOpen}
        initial={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next: any) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB", paddingHorizontal: 16 },

  topRow: {
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 28, fontWeight: "900", color: COLORS.text },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  searchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cityInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    paddingVertical: 0,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  resultsBlock: { paddingTop: 14, paddingBottom: 10 },
  resultsTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  resultsSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },

  chipsRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  activeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  activeChipText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  clearChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearChipText: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  radiusCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radiusLabel: { fontSize: 12, fontWeight: "900", color: COLORS.muted },
  radiusValue: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  mapWrap: {
    flex: 1,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
  },

  refreshFab: {
    position: "absolute",
    right: 12,
    bottom: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshFabText: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  // Blue dot like Google Maps
  blueDotOuter: {
    width: 15,
    height: 15,
    borderRadius: 9,
    backgroundColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  blueDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(35, 95, 223, 1)",
    borderWidth: 4,
    borderColor: "#fff",
  },

  // Price marker
  priceMarker: {
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  priceMarkerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});
