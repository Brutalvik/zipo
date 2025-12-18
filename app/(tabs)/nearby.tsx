import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

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

function regionFromRadius(lat: number, lng: number, radiusKm: number): Region {
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

type SearchMode = "gps" | "city";

export default function NearbyScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);

  const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, "");

  const [isLoading, setIsLoading] = useState(false);

  // permission + real user location
  const [locAllowed, setLocAllowed] = useState<boolean | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // search center (either GPS or city)
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);

  // labels
  const [gpsCityLabel, setGpsCityLabel] = useState<string>("");
  const [mode, setMode] = useState<SearchMode>("gps");
  const [cityQuery, setCityQuery] = useState<string>("");

  // slider UI / committed
  const [radiusUiKm, setRadiusUiKm] = useState<number>(10);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const MAX_RADIUS = 50;

  const [cars, setCars] = useState<ApiCar[]>([]);

  const carsWithCoords = useMemo(() => {
    return cars.filter(
      (c) =>
        typeof c.pickup?.lat === "number" &&
        typeof c.pickup?.lng === "number" &&
        Number.isFinite(c.pickup.lat) &&
        Number.isFinite(c.pickup.lng)
    );
  }, [cars]);

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

        const list: ApiCar[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
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

      // GPS mode search center becomes user coords
      setCenterLat(lat);
      setCenterLng(lng);

      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(
          regionFromRadius(lat, lng, radiusKm),
          250
        );
      });

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

      setGpsCityLabel(titleCaseCity(cityGuess) || "Your area");
    } catch {
      setLocAllowed(false);
    }
  }, [radiusKm]);

  // ✅ forward-geocode typed city -> set center -> fetch map
  const geocodeCityAndRefresh = useCallback(
    async (rawCity: string) => {
      const city = rawCity.trim();
      if (!city) return;

      try {
        // You can bias Canada (helps results)
        const query = city.toLowerCase().includes("canada")
          ? city
          : `${city}, Canada`;

        const results = await Location.geocodeAsync(query);
        const first = results?.[0];

        if (!first) {
          console.warn("No geocode results for city:", city);
          setCars([]); // optional: keep old cars if you prefer
          return;
        }

        const lat = first.latitude;
        const lng = first.longitude;

        setMode("city");
        setCenterLat(lat);
        setCenterLng(lng);

        requestAnimationFrame(() => {
          mapRef.current?.animateToRegion(
            regionFromRadius(lat, lng, radiusKm),
            250
          );
        });

        await fetchCarsForRadius(lat, lng, radiusKm);
      } catch (e) {
        console.warn("City geocode failed:", e);
      }
    },
    [fetchCarsForRadius, radiusKm]
  );

  // initial boot
  useEffect(() => {
    requestAndLoadLocation();
  }, [requestAndLoadLocation]);

  // when radius changes, refetch for current center (gps OR city)
  useEffect(() => {
    if (centerLat == null || centerLng == null) return;

    mapRef.current?.animateToRegion(
      regionFromRadius(centerLat, centerLng, radiusKm),
      250
    );
    fetchCarsForRadius(centerLat, centerLng, radiusKm);
  }, [centerLat, centerLng, radiusKm, fetchCarsForRadius]);

  const headerTitle = useMemo(() => {
    if (locAllowed === false) return "Location needed";
    const n = carsWithCoords.length;
    if (n === 0) return "No cars found nearby";
    if (n >= 50) return "50+ cars found nearby";
    return `${n} cars found nearby`;
  }, [carsWithCoords.length, locAllowed]);

  const subtitle = useMemo(() => {
    if (locAllowed === false) return "Enable location to see nearby cars.";
    if (mode === "city") {
      const label = titleCaseCity(cityQuery.trim());
      return label
        ? `Showing cars in ${label} • within ${radiusKm} km`
        : `Within ${radiusKm} km`;
    }
    return `Showing results within ${radiusKm} km`;
  }, [locAllowed, mode, cityQuery, radiusKm]);

  const pillValue = useMemo(() => {
    if (mode === "city") return cityQuery;
    return gpsCityLabel; // shows detected city but user can type to switch
  }, [mode, cityQuery, gpsCityLabel]);

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

      {/* City input + filter */}
      <View style={styles.searchRow}>
        <View style={[styles.cityPill, SHADOW_CARD]}>
          <Feather name="map-pin" size={16} color={COLORS.muted} />

          <TextInput
            value={pillValue}
            onChangeText={(t) => {
              // if they start typing, we enter city mode and keep text
              if (mode !== "city") setMode("city");
              setCityQuery(t);
            }}
            placeholder="Search a city (e.g., Calgary)"
            placeholderTextColor="#9CA3AF"
            style={styles.cityInput}
            returnKeyType="search"
            autoCapitalize="words"
            selectTextOnFocus={mode === "gps"}
            onSubmitEditing={() => geocodeCityAndRefresh(cityQuery)}
          />

          {/* 🔁 double-circle behavior: return to user GPS */}
          <Pressable
            onPress={() => {
              setMode("gps");
              setCityQuery("");
              // restore center to user location, otherwise refresh GPS
              if (userLat != null && userLng != null) {
                setCenterLat(userLat);
                setCenterLng(userLng);
                requestAnimationFrame(() => {
                  mapRef.current?.animateToRegion(
                    regionFromRadius(userLat, userLng, radiusKm),
                    250
                  );
                });
                fetchCarsForRadius(userLat, userLng, radiusKm);
              } else {
                requestAndLoadLocation();
              }
            }}
            style={styles.gpsBtn}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
          >
            <Feather name="crosshair" size={16} color={COLORS.muted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            // hook filter modal later
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
        <Text style={styles.resultsSub}>{subtitle}</Text>
      </View>

      {/* Radius slider (still works for city mode too) */}
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
          {userLat != null && userLng != null ? (
            <Marker
              coordinate={{ latitude: userLat, longitude: userLng }}
              title="You"
              pinColor="#111827"
            />
          ) : null}

          {carsWithCoords.map((car) => (
            <Marker
              key={car.id}
              coordinate={{
                latitude: car.pickup!.lat!,
                longitude: car.pickup!.lng!,
              }}
            >
              <View style={styles.priceMarker}>
                <Text style={styles.priceMarkerText}>${car.pricePerDay}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Refresh button */}
        <Pressable
          onPress={() => {
            if (centerLat != null && centerLng != null) {
              mapRef.current?.animateToRegion(
                regionFromRadius(centerLat, centerLng, radiusKm),
                250
              );
              fetchCarsForRadius(centerLat, centerLng, radiusKm);
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

  gpsBtn: {
    width: 36,
    height: 36,
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
  priceMarkerText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});
