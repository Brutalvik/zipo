import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Callout,
  Circle,
} from "react-native-maps";

import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import NearbyFiltersModal, {
  DEFAULT_FILTERS,
  NearbyFilters,
} from "@/components/nearby/NearbyFilterModal";
import {
  bboxFromRadiusKm,
  regionFromRadius,
  titleCaseCity,
} from "@/lib/locationHelpers";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { CarToolTip } from "@/components/cars/CarToolTip";

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

const PRICE_MAX = 300;
const RATING_ANY = 5.0;
const LOCATION_EXPLAINER_KEY = "zipo_location_explainer_shown_v1";

function filterToChips(f: NearbyFilters): string[] {
  const chips: string[] = [];
  if (f.vehicleType) chips.push(f.vehicleType);
  if (f.transmission) chips.push(f.transmission);
  if (f.fuelType) chips.push(f.fuelType);

  if (f.minSeats != null)
    chips.push(f.minSeats >= 5 ? "5+ seats" : `${f.minSeats}+ seats`);

  if (
    typeof (f as any).minRating === "number" &&
    (f as any).minRating < RATING_ANY
  ) {
    chips.push(`${(f as any).minRating.toFixed(1)}★+`);
  }

  if (
    typeof (f as any).maxPricePerDay === "number" &&
    (f as any).maxPricePerDay < PRICE_MAX
  ) {
    chips.push(`≤ $${(f as any).maxPricePerDay}/day`);
  }

  return chips;
}

function isDefaultFilters(f: NearbyFilters) {
  const ratingIsDefault = ((f as any).minRating ?? RATING_ANY) >= RATING_ANY;
  const priceIsDefault = ((f as any).maxPricePerDay ?? PRICE_MAX) >= PRICE_MAX;

  return (
    (f.vehicleType ?? null) == null &&
    (f.transmission ?? null) == null &&
    (f.fuelType ?? null) == null &&
    (f.minSeats ?? null) == null &&
    ratingIsDefault &&
    priceIsDefault
  );
}

function trackEvent(name: string, props?: Record<string, any>) {
  console.log(`[analytics] ${name}`, props ?? {});
}

export default function NearbyScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);
  const shouldZoomRef = useRef(true);
  const markerRefs = useRef<Record<string, any>>({});
  const suppressNextMapPressRef = useRef(false);
  const regionRef = useRef<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const lastSelectedRef = useRef<string | null>(null);

  const API_BASE = useMemo(
    () => (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, ""),
    []
  );

  const [isLoading, setIsLoading] = useState(false);

  const [locAllowed, setLocAllowed] = useState<boolean | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [isApproxLocation, setIsApproxLocation] = useState(false);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  const [cityInput, setCityInput] = useState<string>("");
  const [cityLabel, setCityLabel] = useState<string>("");
  const [isUsingUserLocation, setIsUsingUserLocation] = useState(true);

  const [radiusUiKm, setRadiusUiKm] = useState<number>(10);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const MAX_RADIUS = 50;

  const [cars, setCars] = useState<ApiCar[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<NearbyFilters>(DEFAULT_FILTERS);

  const [explainerLoaded, setExplainerLoaded] = useState(false);
  const [explainerShown, setExplainerShown] = useState(false);
  const [showExplainerInline, setShowExplainerInline] = useState(false);

  const [searchLat, setSearchLat] = useState<number | null>(null);
  const [searchLng, setSearchLng] = useState<number | null>(null);

  const activeFilterChips = useMemo(() => filterToChips(filters), [filters]);
  const canClear = useMemo(() => !isDefaultFilters(filters), [filters]);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const effectiveLat = isUsingUserLocation ? userLat : searchLat ?? userLat;
  const effectiveLng = isUsingUserLocation ? userLng : searchLng ?? userLng;

  const filteredCars = useMemo(() => {
    let list = cars;

    if (filters.vehicleType) {
      const vt = filters.vehicleType.toLowerCase();
      list = list.filter((c) => (c.vehicleType ?? "").toLowerCase() === vt);
    }

    if (filters.transmission) {
      const tr = filters.transmission.toLowerCase();
      list = list.filter((c) => (c.transmission ?? "").toLowerCase() === tr);
    }

    if (filters.fuelType) {
      const ft = filters.fuelType.toLowerCase();
      list = list.filter((c: any) => {
        const val = String(c?.fuelType ?? c?.fuel_type ?? "").toLowerCase();
        return val === ft;
      });
    }

    if (filters.minSeats != null) {
      list = list.filter((c) => (c.seats ?? 0) >= filters.minSeats!);
    }

    const r = (filters as any).minRating;
    if (typeof r === "number" && r < RATING_ANY) {
      list = list.filter((c) => (c.rating ?? 0) >= r);
    }

    const p = (filters as any).maxPricePerDay;
    if (typeof p === "number" && p < PRICE_MAX) {
      list = list.filter(
        (c) => (c.pricePerDay ?? Number.POSITIVE_INFINITY) <= p
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

  const requestAndLoadLocation = useCallback(
    async (opts?: { reason?: "initial" | "user_action" }) => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
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

        const acc =
          typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;
        setAccuracyMeters(acc);

        const approx = acc != null && acc >= 1000;
        setIsApproxLocation(approx);
        if (approx) {
          trackEvent("location_approx_detected", {
            accuracy_m: acc,
            reason: opts?.reason,
          });
        }

        shouldZoomRef.current = true;
        setUserLat(lat);
        setUserLng(lng);
        if (opts?.reason === "user_action") {
          setIsUsingUserLocation(true);
        }

        trackEvent("location_granted_and_loaded", {
          accuracy_m: acc,
          reason: opts?.reason,
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

        const label = titleCaseCity(cityGuess) || "Your area";
        setCityLabel(label);
        setCityInput(label);
      } catch {
        setLocAllowed(false);
      }
    },
    []
  );

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
        `&lat=${encodeURIComponent(lat)}` +
        `&lng=${encodeURIComponent(lng)}` +
        `&radiusKm=${encodeURIComponent(rKm)}` +
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

        const list: any[] = Array.isArray(listRaw)
          ? listRaw.filter(Boolean)
          : [];

        const normalized: ApiCar[] = list.map((c: any) => {
          const pickupLat =
            typeof c?.pickup?.lat === "number"
              ? c.pickup.lat
              : typeof c?.pickup_lat === "number"
              ? c.pickup_lat
              : typeof c?.pickupLat === "number"
              ? c.pickupLat
              : null;

          const pickupLng =
            typeof c?.pickup?.lng === "number"
              ? c.pickup.lng
              : typeof c?.pickup_lng === "number"
              ? c.pickup_lng
              : typeof c?.pickupLng === "number"
              ? c.pickupLng
              : null;

          return {
            id: String(c.id),
            title: String(c.title ?? c.name ?? ""),
            imageUrl: String(c.imageUrl ?? c.image_url ?? c.image_path ?? ""),
            pricePerDay: Number(c.pricePerDay ?? c.price_per_day ?? 0),
            currency: String(c.currency ?? "CAD"),
            rating: Number(c.rating ?? c.rating_avg ?? 0),
            reviews: Number(c.reviews ?? c.rating_count ?? 0),
            vehicleType: (c.vehicleType ?? c.vehicle_type ?? null) as any,
            transmission: (c.transmission ?? null) as any,
            seats: typeof c.seats === "number" ? c.seats : null,
            address: {
              countryCode: c?.address?.countryCode ?? c?.country_code ?? null,
              city: c?.address?.city ?? c?.city ?? null,
              area: c?.address?.area ?? c?.area ?? null,
              fullAddress: c?.address?.fullAddress ?? c?.full_address ?? null,
            },
            pickup: {
              lat: pickupLat,
              lng: pickupLng,
            },
          };
        });

        setCars(normalized);
      } catch (e) {
        console.warn("cars/map fetch failed", e);
        setCars([]);
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE]
  );

  useEffect(() => {
    if (effectiveLat == null || effectiveLng == null) return;

    if (selectedCarId) return;

    const PAD = 1.25;
    mapRef.current?.animateToRegion(
      regionFromRadius(effectiveLat, effectiveLng, radiusKm * PAD),
      200
    );
  }, [effectiveLat, effectiveLng, radiusKm, selectedCarId]);

  useEffect(() => {
    lastSelectedRef.current = selectedCarId;
  }, [selectedCarId]);

  useEffect(() => {
    if (!selectedCarId) return;

    const car = filteredCarsWithCoords.find((c) => c.id === selectedCarId);
    const lat = car?.pickup?.lat;
    const lng = car?.pickup?.lng;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    const r = regionRef.current;

    const latitudeDelta = r?.latitudeDelta ?? 0.12;
    const longitudeDelta = r?.longitudeDelta ?? 0.12;

    const OFFSET_FACTOR = 0.25;

    mapRef.current?.animateToRegion(
      {
        latitude: lat + latitudeDelta * OFFSET_FACTOR,
        longitude: lng,
        latitudeDelta,
        longitudeDelta,
      },
      250
    );
  }, [selectedCarId, filteredCarsWithCoords]);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(LOCATION_EXPLAINER_KEY);
        setExplainerShown(v === "1");
      } catch {
        setExplainerShown(false);
      } finally {
        setExplainerLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        const granted = perm.status === "granted";
        setLocAllowed(granted);

        if (granted) {
          requestAndLoadLocation({ reason: "initial" });
        } else {
          if (explainerLoaded && !explainerShown) {
            setShowExplainerInline(true);
            trackEvent("location_explainer_shown", {
              surface: "nearby_inline",
            });
          }
        }
      } catch {
        setLocAllowed(false);
      }
    })();
  }, [explainerLoaded, explainerShown, requestAndLoadLocation]);

  const prevLocationRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  // Effect 1 - handles both location and radius changes
  useEffect(() => {
    if (effectiveLat == null || effectiveLng == null) return;
    fetchCarsForRadius(effectiveLat, effectiveLng, radiusKm);
  }, [effectiveLat, effectiveLng, radiusKm]);

  // Effect 2 - Zoom map ONLY when location coordinates actually change
  useEffect(() => {
    if (effectiveLat == null || effectiveLng == null) return;

    const locationChanged =
      prevLocationRef.current.lat !== effectiveLat ||
      prevLocationRef.current.lng !== effectiveLng;

    if (!locationChanged) return;

    prevLocationRef.current = {
      lat: effectiveLat,
      lng: effectiveLng,
    };

    const zoomRadius = isApproxLocation
      ? Math.min(MAX_RADIUS, Math.max(radiusKm, 15))
      : radiusKm;

    mapRef.current?.animateToRegion(
      regionFromRadius(effectiveLat, effectiveLng, zoomRadius),
      250
    );
  }, [effectiveLat, effectiveLng, radiusKm, isApproxLocation]);

  const headerTitle = useMemo(() => {
    if (locAllowed === false) return "Location needed";
    const n = filteredCarsWithCoords.length;
    if (n === 0) return "No cars found nearby";
    if (n >= 50) return "50+ cars found nearby";
    return `${n} cars found nearby`;
  }, [filteredCarsWithCoords.length, locAllowed]);

  const requestLocationPermissionAgain = useCallback(async () => {
    if (explainerLoaded && !explainerShown) {
      setShowExplainerInline(true);
      trackEvent("location_explainer_shown", {
        surface: "nearby_inline_trigger",
      });
      return;
    }

    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      setLocAllowed(true);
      requestAndLoadLocation({ reason: "user_action" });
      return;
    }

    trackEvent("location_permission_request_attempt", { canAskAgain });

    if (canAskAgain) {
      trackEvent("location_permission_prompt_shown", { surface: "nearby" });

      const req = await Location.requestForegroundPermissionsAsync();
      const granted = req.status === "granted";
      setLocAllowed(granted);

      if (granted) {
        trackEvent("location_permission_granted", { surface: "nearby" });
        requestAndLoadLocation({ reason: "user_action" });
      } else {
        trackEvent("location_permission_denied", {
          surface: "nearby",
          canAskAgain: req.canAskAgain,
        });
      }
      return;
    }

    trackEvent("location_permission_blocked", { surface: "nearby" });

    Alert.alert(
      "Enable Location",
      "Location access is required to find nearby cars. Please enable it in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            trackEvent("location_open_settings_tapped", { surface: "nearby" });
            if (Platform.OS === "ios") Linking.openURL("app-settings:");
            else Linking.openSettings();
          },
        },
      ]
    );
  }, [explainerLoaded, explainerShown, requestAndLoadLocation]);

  const acceptExplainerAndRequest = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCATION_EXPLAINER_KEY, "1");
      setExplainerShown(true);
    } catch {
      // ignore
    } finally {
      setShowExplainerInline(false);
    }

    trackEvent("location_explainer_continue", { surface: "nearby_inline" });
    requestLocationPermissionAgain();
  }, [requestLocationPermissionAgain]);

  const dismissExplainer = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCATION_EXPLAINER_KEY, "1");
      setExplainerShown(true);
    } catch {
      // ignore
    } finally {
      setShowExplainerInline(false);
    }
    trackEvent("location_explainer_dismiss", { surface: "nearby_inline" });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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

      {showExplainerInline ? (
        <View style={[styles.explainerCard, SHADOW_CARD]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={styles.explainerIcon}>
              <Feather name="map-pin" size={18} color={COLORS.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.explainerTitle}>Enable location</Text>
              <Text style={styles.explainerBody}>
                We use your location to show cars near you and set the map to
                your area. You can still search by city anytime.
              </Text>
            </View>
          </View>

          <View style={styles.explainerActions}>
            <Pressable
              onPress={dismissExplainer}
              style={[styles.explainerBtnGhost, SHADOW_CARD]}
            >
              <Text style={styles.explainerBtnGhostText}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={acceptExplainerAndRequest}
              style={[styles.explainerBtn, SHADOW_CARD]}
            >
              <Text style={styles.explainerBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {locAllowed === true && isApproxLocation ? (
        <View style={[styles.approxBanner, SHADOW_CARD]}>
          <Text style={styles.approxTitle}>Using approximate location</Text>
          <Text style={styles.approxBody}>
            Results may be less accurate. Try increasing radius or search by
            city.
            {accuracyMeters != null ? ` (~${Math.round(accuracyMeters)}m)` : ""}
          </Text>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <View style={styles.cityPillWrapper}>
          <GooglePlacesAutocomplete
            placeholder="Search city"
            fetchDetails
            debounce={300}
            enablePoweredByContainer={false}
            listViewDisplayed="auto"
            keepResultsAfterBlur={false}
            query={{
              key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!,
              language: "en",
              components: "country:ca",
              types: "(cities)",
            }}
            onPress={(data, details) => {
              if (!details) return;

              const lat = details.geometry?.location?.lat;
              const lng = details.geometry?.location?.lng;

              if (lat && lng) {
                shouldZoomRef.current = true;
                setIsUsingUserLocation(false);
                setCityLabel(data.description);
                setCityInput(data.description);
                setSearchLat(lat);
                setSearchLng(lng);

                mapRef.current?.animateToRegion(
                  regionFromRadius(lat, lng, radiusKm),
                  250
                );
              }
            }}
            textInputProps={{
              value: cityInput,
              onChangeText: (text) => {
                setCityInput(text);
                if (text === "") {
                  setCityLabel("");
                }
              },
              placeholderTextColor: "#9CA3AF",
              clearButtonMode: "while-editing",
            }}
            renderLeftButton={() => (
              <View style={styles.leftIconWrapper}>
                <Feather name="map-pin" size={16} color={COLORS.muted} />
              </View>
            )}
            renderRightButton={() => (
              <Pressable
                onPress={() => requestLocationPermissionAgain()}
                style={styles.circleBtn}
                accessibilityRole="button"
              >
                <Feather name="crosshair" size={16} color={COLORS.text} />
              </Pressable>
            )}
            styles={{
              container: {
                flex: 1,
              },
              textInputContainer: {
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.xl,
                paddingHorizontal: 0,
                paddingRight: 14,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
              },
              textInput: {
                flex: 1,
                height: 48,
                fontSize: 14,
                fontWeight: "800",
                color: COLORS.text,
                backgroundColor: "transparent",
                paddingHorizontal: 10,
                paddingVertical: 0,
                margin: 0,
              },
              listView: {
                position: "absolute",
                top: 54,
                left: 0,
                right: 0,
                backgroundColor: COLORS.white,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: COLORS.border,
                zIndex: 1001,
                elevation: 10,
                maxHeight: 200,
              },
              row: {
                padding: 12,
                backgroundColor: COLORS.white,
              },
              description: {
                fontSize: 13,
                fontWeight: "800",
                color: COLORS.text,
              },
              separator: { height: 1, backgroundColor: COLORS.border },
            }}
          />
        </View>

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

      {/* Rest of the component stays the same */}
      <View style={styles.resultsBlock}>
        <Text style={styles.resultsTitle}>{headerTitle}</Text>
        <Text style={styles.resultsSub}>
          {locAllowed === false
            ? "Enable location or search by city to see nearby cars."
            : `Showing results within ${radiusKm} km`}
        </Text>

        {locAllowed === false ? (
          <Pressable
            onPress={requestLocationPermissionAgain}
            style={[styles.enableLocChip, SHADOW_CARD]}
          >
            <Feather name="navigation" size={14} color={COLORS.text} />
            <Text style={styles.enableLocChipText}>Enable location</Text>
          </Pressable>
        ) : null}

        {activeFilterChips.length ? (
          <View style={styles.chipsRow}>
            {activeFilterChips.map((c) => (
              <View key={c} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{c}</Text>
              </View>
            ))}

            {canClear ? (
              <Pressable
                onPress={() => setFilters(DEFAULT_FILTERS)}
                style={[styles.clearChip, SHADOW_CARD]}
              >
                <Text style={styles.clearChipText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

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
          onRegionChangeComplete={(r) => {
            regionRef.current = r;
          }}
          onPress={(e) => {
            if (suppressNextMapPressRef.current) {
              suppressNextMapPressRef.current = false;
              return;
            }
            e.stopPropagation();
            setSelectedCarId(null);
          }}
        >
          {effectiveLat != null && effectiveLng != null ? (
            <Circle
              center={{ latitude: effectiveLat, longitude: effectiveLng }}
              radius={radiusKm * 1000}
              strokeWidth={2}
              strokeColor="rgba(17,24,39,0.28)"
              fillColor="rgba(17,24,39,0.10)"
            />
          ) : null}

          {isUsingUserLocation && userLat != null && userLng != null ? (
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

          {filteredCarsWithCoords.map((car) => {
            const isSelected = car.id === selectedCarId;
            const wasSelected = car.id === lastSelectedRef.current;

            return (
              <Marker
                key={car.id}
                coordinate={{
                  latitude: car.pickup!.lat!,
                  longitude: car.pickup!.lng!,
                }}
                onPress={() => {
                  suppressNextMapPressRef.current = true;
                  setSelectedCarId((prev) => (prev === car.id ? null : car.id));
                }}
                tracksViewChanges={isSelected || wasSelected}
              >
                <View
                  style={[
                    styles.priceMarker,
                    isSelected && styles.priceMarkerSelected,
                  ]}
                >
                  <Text style={styles.priceMarkerText}>${car.pricePerDay}</Text>
                </View>

                <Callout tooltip>
                  <CarToolTip car={car} isSelected={isSelected} />
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <Pressable
          onPress={() => {
            const lat = effectiveLat;
            const lng = effectiveLng;
            if (lat != null && lng != null) {
              const zoomRadius = isApproxLocation
                ? Math.min(MAX_RADIUS, Math.max(radiusKm, 15))
                : radiusKm;
              mapRef.current?.animateToRegion(
                regionFromRadius(lat, lng, zoomRadius),
                250
              );
              fetchCarsForRadius(lat, lng, radiusKm);
            } else {
              requestLocationPermissionAgain();
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

      <NearbyFiltersModal
        visible={filtersOpen}
        initial={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next: NearbyFilters) => {
          setFilters(next);
          setFiltersOpen(false);
          trackEvent("nearby_filters_applied", {
            hasChips: filterToChips(next).length > 0,
          });
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
  explainerCard: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 14,
  },
  explainerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  explainerTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  explainerBody: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 16,
  },
  explainerActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  explainerBtnGhost: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  explainerBtnGhostText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },
  explainerBtn: {
    flex: 1,
    backgroundColor: COLORS.black,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  explainerBtnText: { fontSize: 13, fontWeight: "900", color: COLORS.white },
  approxBanner: {
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: RADIUS.xl,
    padding: 12,
  },
  approxTitle: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  approxBody: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 16,
  },
  searchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 1000,
  },
  cityPillWrapper: {
    flex: 1,
    zIndex: 1000,
  },
  leftIconWrapper: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
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
    zIndex: 1,
  },
  resultsBlock: { paddingTop: 14, paddingBottom: 10, zIndex: 1 },
  resultsTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  resultsSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  enableLocChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  enableLocChipText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
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
    zIndex: 1,
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
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    zIndex: 1,
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
  priceMarkerSelected: {
    backgroundColor: COLORS.amber,
    transform: [{ scale: 1.1 }],
  },
});
