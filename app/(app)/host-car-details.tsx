// app/host-car-details.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";

import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { HostCar } from "@/types/car";
import { useIdToken } from "@/hooks/useIdToken";
import {
  deleteHostCar,
  fetchHostCar,
  patchHostCar,
  publishHostCar,
} from "@/services/carsApi";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type FeatureItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

// -------------------------
// URL helpers
// -------------------------
function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function getGalleryUrls(car: HostCar): string[] {
  const g = Array.isArray(car?.image_gallery) ? car.image_gallery : [];
  const urls: string[] = [];

  for (const it of g) {
    const u =
      typeof it === "string"
        ? it
        : typeof (it as any)?.url === "string"
        ? String((it as any).url)
        : "";
    if (u && isHttpUrl(u)) urls.push(u);
  }

  const imagePath = String(car?.image_path || "").trim();
  if (imagePath && !imagePath.startsWith("draft/")) {
    if (isHttpUrl(imagePath)) urls.push(imagePath);
    else if (imagePath.startsWith("cars/")) {
      urls.push(
        `https://storage.googleapis.com/zipo-car-photos-ca/${imagePath}`
      );
    }
  }

  return Array.from(new Set(urls));
}

function getCoverUrl(car: HostCar) {
  return getGalleryUrls(car)[0] || "";
}

// -------------------------
// Formatting helpers
// -------------------------
function money(n: any, currency: string) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  const cur = (currency || "CAD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${cur} ${num}`;
  }
}

function statusLabel(s: any) {
  const v = String(s || "draft");
  return v.replace(/_/g, " ");
}

function formatUpdatedAt(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

// -------------------------
// Date helpers (YYYY-MM-DD)
// -------------------------
function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function isBeforeDateKey(a: string, b: string) {
  return String(a) < String(b);
}

function isSameOrAfter(a: string, b: string) {
  return String(a) >= String(b);
}

function normalizeRange(a: string, b: string) {
  const A = String(a);
  const B = String(b);
  return A <= B ? { start: A, end: B } : { start: B, end: A };
}

function isInRange(key: string, start: string, end: string) {
  const a = String(start);
  const b = String(end);
  const k = String(key);
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  return k >= lo && k <= hi;
}

function dateRangeKeys(startKey: string, endKey: string) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const dir = start.getTime() <= end.getTime() ? 1 : -1;

  const out: string[] = [];
  const cur = new Date(start);

  while (true) {
    out.push(toDateKey(cur));
    if (toDateKey(cur) === toDateKey(end)) break;
    cur.setDate(cur.getDate() + dir);
    if (out.length > 400) break;
  }

  return out.sort(
    (x, y) => parseDateKey(x).getTime() - parseDateKey(y).getTime()
  );
}

// -------------------------
// Array helpers
// -------------------------
function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function uniqSortedStrings(xs: string[]) {
  return Array.from(new Set(xs.filter((x) => typeof x === "string"))).sort();
}

function sanitizeOdoText(v: string) {
  return String(v).replace(/[^\d]/g, "").slice(0, 7);
}

// -------------------------
// UI helpers
// -------------------------
function KeyValueRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  if (!value) return null;
  return (
    <View style={styles.kvRow}>
      <View style={styles.kvLeft}>
        {icon ? (
          <Feather name={icon} size={14} color="rgba(17,24,39,0.55)" />
        ) : null}
        <Text style={styles.kvLabel}>{label}</Text>
      </View>
      <Text style={styles.kvValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ✅ Expanded “possible features” catalog
const ALL_FEATURE_ITEMS: FeatureItem[] = [
  // Comfort
  { id: "air_conditioning", label: "Air conditioning", icon: "wind" },
  { id: "heated_seats", label: "Heated seats", icon: "wind" },
  { id: "ventilated_seats", label: "Ventilated seats", icon: "wind" },
  { id: "heated_steering_wheel", label: "Heated steering wheel", icon: "wind" },
  { id: "sunroof", label: "Sunroof", icon: "sun" },
  { id: "panoramic_roof", label: "Panoramic roof", icon: "sun" },

  // Tech
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { id: "apple_carplay", label: "Apple CarPlay", icon: "smartphone" },
  { id: "android_auto", label: "Android Auto", icon: "smartphone" },
  { id: "navigation", label: "Navigation", icon: "map" },
  { id: "usb", label: "USB", icon: "cpu" },
  { id: "wireless_charging", label: "Wireless charging", icon: "zap" },
  { id: "keyless_entry", label: "Keyless entry", icon: "key" },
  { id: "remote_start", label: "Remote start", icon: "power" },

  // Safety
  { id: "backup_camera", label: "Backup camera", icon: "camera" },
  { id: "parking_sensors", label: "Parking sensors", icon: "crosshair" },
  { id: "blind_spot_monitor", label: "Blind spot monitor", icon: "eye" },
  { id: "lane_keep_assist", label: "Lane keep assist", icon: "navigation" },
  { id: "adaptive_cruise", label: "Adaptive cruise", icon: "target" },

  // Utility
  { id: "all_wheel_drive", label: "AWD", icon: "compass" },
  { id: "roof_rack", label: "Roof rack", icon: "package" },
  { id: "tow_hitch", label: "Tow hitch", icon: "link" },
  { id: "third_row", label: "3rd row seating", icon: "users" },
  { id: "ski_rack", label: "Ski rack", icon: "archive" },

  // Policies / convenience
  { id: "pet_friendly", label: "Pet friendly", icon: "heart" },
  { id: "smoke_free", label: "Smoke-free", icon: "slash" },
  { id: "child_seat", label: "Child seat", icon: "user" },
];

// -------------------------
// Top carousel (photo-first)
// -------------------------
function ImageCarousel({ urls }: { urls: string[] }) {
  const { width } = Dimensions.get("window");
  const itemW = Math.min(width - 36, 520);
  const [idx, setIdx] = useState(0);

  const onScroll = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x ?? 0;
      const next = Math.round(x / itemW);
      setIdx(next);
    },
    [itemW]
  );

  if (!urls.length) {
    return (
      <View style={[styles.carouselWrap, { width: itemW }]}>
        <View style={styles.carouselEmpty}>
          <Feather name="image" size={18} color="rgba(17,24,39,0.35)" />
          <Text style={styles.coverEmptyText}>No photo</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center" }}>
      <View style={[styles.carouselWrap, { width: itemW }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {urls.map((u) => (
            <View key={u} style={{ width: itemW, height: "100%" }}>
              <Image
                source={{ uri: u }}
                style={styles.carouselImg}
                resizeMode="cover"
              />
              <View style={styles.carouselGrad} />
            </View>
          ))}
        </ScrollView>
      </View>

      {urls.length > 1 ? (
        <View style={styles.dotsRow}>
          {urls.map((_, i) => (
            <View
              key={String(i)}
              style={[styles.dot, i === idx ? styles.dotOn : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function HostCarDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    token,
    loading: tokenLoading,
    error: tokenError,
    refreshToken,
  } = useIdToken();
  const carId = String(params?.carId || "").trim();

  const [car, setCar] = useState<HostCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const cover = useMemo(() => (car ? getCoverUrl(car) : ""), [car]);
  const gallery = useMemo(() => (car ? getGalleryUrls(car) : []), [car]);

  // ✅ local order for photos (UI-only reorder)
  const [galleryLocal, setGalleryLocal] = useState<string[]>([]);

  // -------- Local editable state (NOT auto-saving) --------
  const [odoText, setOdoText] = useState("");
  const [amenitiesLocal, setAmenitiesLocal] = useState<string[]>([]);
  const [blockedLocal, setBlockedLocal] = useState<string[]>([]); // keep sorted

  const blockedSet = useMemo(() => new Set(blockedLocal), [blockedLocal]);
  const amenitiesSet = useMemo(() => new Set(amenitiesLocal), [amenitiesLocal]);

  const initialRef = useRef<{
    odometer_km: number;
    amenities: string[];
    blocked: string[];
  } | null>(null);

  // Range selection UI
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const [displayRange, setDisplayRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [calendarNote, setCalendarNote] = useState<string>("");

  const [addFeaturesOpen, setAddFeaturesOpen] = useState(false);
  const [initialGallery, setInitialGallery] = useState<string[]>([]);

  const odometerLocked = useMemo(
    () => Number(car?.odometer_km ?? 0) > 0,
    [car?.odometer_km]
  );
  const isActive = useMemo(
    () => String(car?.status || "").toLowerCase() === "active",
    [car?.status]
  );

  const primaryLabel = useMemo(
    () => (isActive ? "Update" : "Publish"),
    [isActive]
  );

  const isDirty = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;

    const odoNow = Number(String(odoText).replace(/[^\d]/g, "")) || 0;
    const aNow = uniqSortedStrings(amenitiesLocal);
    const bNow = uniqSortedStrings(blockedLocal);

    return (
      odoNow !== init.odometer_km ||
      !arraysEqual(aNow, init.amenities) ||
      !arraysEqual(bNow, init.blocked) ||
      !arraysEqual(galleryLocal, initialGallery)
    );
  }, [odoText, amenitiesLocal, blockedLocal, galleryLocal, initialGallery]);

  const loadCar = useCallback(async () => {
    if (!carId) throw new Error("Missing carId");
    if (!token) throw new Error("Missing auth token");

    setLoading(true);
    try {
      // ✅ Fetch car via centralized API
      const c: HostCar = await fetchHostCar(carId, token);
      setCar(c);

      // === Odometer ===
      const odo = Number(c?.odometer_km ?? 0) || 0;
      setOdoText(odo ? String(odo) : "");

      // === Amenities ===
      const amenities = uniqSortedStrings(
        Array.isArray(c?.features?.amenities) ? c.features.amenities : []
      );
      setAmenitiesLocal(amenities);

      // === Blocked dates ===
      const blocked = uniqSortedStrings(
        Array.isArray(c?.requirements?.availability?.blockedDates)
          ? c.requirements.availability.blockedDates
          : []
      ).filter((k) => !isBeforeDateKey(k, todayKey));
      setBlockedLocal(blocked);

      // === Dirty detection reference ===
      initialRef.current = { odometer_km: odo, amenities, blocked };

      // === Gallery ===
      const currentGallery = getGalleryUrls(c);
      setGalleryLocal(currentGallery);
      setInitialGallery(currentGallery);

      // === Reset temporary UI state ===
      setRangeStart(null);
      setRangeEnd(null);
      setDisplayRange(null);
      setCalendarNote("");

      return c;
    } finally {
      setLoading(false);
    }
  }, [carId, token, todayKey]);

  useEffect(() => {
    loadCar().catch((e) => {
      console.warn("load car failed", e?.message || e);
      setLoading(false);
    });
  }, [loadCar]);

  const patchCar = useCallback(
    async (patch: Partial<HostCar>) => {
      if (!carId) throw new Error("Missing carId");

      // Get the token from the hook
      if (!token) throw new Error("Auth token not available");

      // Use centralized API
      const updatedCar = await patchHostCar(carId, token, patch);
      return updatedCar;
    },
    [carId, token]
  );

  const saveOnly = useCallback(async () => {
    if (!car) throw new Error("Car not loaded");

    const amenities = uniqSortedStrings(amenitiesLocal);
    const blocked = uniqSortedStrings(blockedLocal);
    const odoRaw = String(odoText).replace(/[^\d]/g, "");
    const odo = odoRaw ? Number(odoRaw) : 0;

    // Odometer validation
    if (!odometerLocked) {
      if (!Number.isFinite(odo) || odo <= 0) {
        throw new Error("Please enter a valid odometer in KM.");
      }
      if (!isActive && odo > 200000) {
        throw new Error(
          "Car cannot be registered because it is more than 200,000 km."
        );
      }
    }

    const patch: any = {
      // Save amenities
      features: {
        ...(car.features || {}),
        amenities,
      },

      // Save blocked dates
      requirements: {
        ...(car.requirements || {}),
        availability: {
          ...(car.requirements?.availability || {}),
          timezone:
            car.requirements?.availability?.timezone || "America/Edmonton",
          blockedDates: blocked,
        },
      },

      // === SAVE REORDERED PHOTO ORDER ===
      // Only saved when user taps Update/Publish — not on drag
      image_gallery: galleryLocal,
    };

    // Save odometer if not locked
    if (!odometerLocked) {
      patch.odometer_km = odo;
    }

    // Send patch to backend
    await patchCar(patch);

    // Reload fresh car data
    const fresh = await loadCar();

    // Update initial state so "Unsaved" disappears
    const freshOdo = Number(fresh?.odometer_km ?? 0) || 0;
    initialRef.current = {
      odometer_km: freshOdo,
      amenities,
      blocked,
    };

    // Also update initial gallery order so future drags detect changes correctly
    setInitialGallery(getGalleryUrls(fresh as HostCar));
  }, [
    car,
    amenitiesLocal,
    blockedLocal,
    odoText,
    odometerLocked,
    isActive,
    patchCar,
    loadCar,
    galleryLocal, // critical dependency
  ]);

  const onPrimaryAction = useCallback(async () => {
    if (!car) return;

    if (!isDirty) {
      Alert.alert("No changes", "You haven’t made any changes to update.");
      return;
    }

    if (!token) {
      Alert.alert("Auth error", "Missing authentication token.");
      return;
    }

    try {
      setBusy(true);

      // Save changes first
      await saveOnly(); // inside saveOnly, you can use patchHostCar

      if (!isActive) {
        await publishHostCar(car.id, token);
      }

      Alert.alert("Updated", "Car details updated.");
      router.replace("/(hosttabs)/cars");
    } catch (e: any) {
      const msg = e?.message || "Could not complete this action.";
      if (String(msg).includes("200,000")) {
        Alert.alert("Cannot register", msg, [
          { text: "OK", onPress: () => router.replace("/(hosttabs)/cars") },
        ]);
      } else {
        Alert.alert("Action failed", msg);
      }
    } finally {
      setBusy(false);
    }
  }, [car, isDirty, saveOnly, isActive, token, router]);

  const confirmLeave = useCallback(
    (goBack: () => void) => {
      if (!isDirty) {
        goBack();
        return;
      }

      Alert.alert(
        "Unsaved changes",
        "Do you want to save your changes before leaving?",
        [
          { text: "Discard", style: "destructive", onPress: goBack },
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async () => {
              try {
                setBusy(true);
                await saveOnly();
                goBack();
              } catch (e: any) {
                Alert.alert(
                  "Save failed",
                  e?.message || "Could not save changes."
                );
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    },
    [isDirty, saveOnly]
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      confirmLeave(() => router.back());
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave, router]);

  const onDelete = useCallback(() => {
    if (!car) return;

    Alert.alert(
      "Deactivate car?",
      "This will deactivate the car and remove it from guest board.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            if (!token) {
              Alert.alert("Auth error", "Missing authentication token.");
              return;
            }

            try {
              setDeleting(true);
              await deleteHostCar(car.id, token);

              router.replace({
                pathname: "/(hosttabs)/cars",
                params: { refresh: "1" },
              });
            } catch (e: any) {
              Alert.alert(
                "Deactivation failed",
                e?.message || "Could not deactivate this car."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [car, token, router]);

  // ---------- SMART BLOCK/UNBLOCK ----------
  const applyRangeToggleWithAlert = useCallback(
    (rangeKeys: string[], tappedStart: string, tappedEnd: string) => {
      if (!rangeKeys.length) return;

      const { start, end } = normalizeRange(tappedStart, tappedEnd);

      let blockedCount = 0;
      for (const k of rangeKeys) if (blockedSet.has(k)) blockedCount++;
      const action: "block" | "unblock" =
        blockedCount === rangeKeys.length ? "unblock" : "block";

      const rangeLabel = start === end ? start : `${start} → ${end}`;
      const note =
        action === "unblock"
          ? `This ${
              start === end ? "date" : "range"
            } will be unblocked: ${rangeLabel}.`
          : `This ${
              start === end ? "date" : "range"
            } will be blocked: ${rangeLabel}.`;

      Alert.alert(
        action === "unblock" ? "Unblock dates" : "Block dates",
        note,
        [
          {
            text: "OK",
            onPress: () => {
              const next = new Set(blockedLocal);

              if (action === "block") {
                for (const k of rangeKeys) next.add(k);
              } else {
                for (const k of rangeKeys) next.delete(k);
              }

              setBlockedLocal(Array.from(next).sort());
              setDisplayRange({ start, end });
              setCalendarNote(note);
            },
          },
        ]
      );
    },
    [blockedLocal, blockedSet]
  );

  const onDayPress = useCallback(
    (dateString: string) => {
      if (!dateString) return;
      if (isBeforeDateKey(dateString, todayKey)) return;

      if (!rangeStart) {
        setRangeStart(dateString);
        setRangeEnd(null);

        const isBlocked = blockedSet.has(dateString);
        const note = isBlocked
          ? `This date will be unblocked: ${dateString}.`
          : `This date will be blocked: ${dateString}.`;
        setDisplayRange({ start: dateString, end: dateString });
        setCalendarNote(note);
        return;
      }

      if (rangeStart && !rangeEnd) {
        setRangeEnd(dateString);

        const keys = dateRangeKeys(rangeStart, dateString).filter(
          (k) => !isBeforeDateKey(k, todayKey)
        );

        applyRangeToggleWithAlert(keys, rangeStart, dateString);
        return;
      }

      setRangeStart(dateString);
      setRangeEnd(null);

      const isBlocked = blockedSet.has(dateString);
      const note = isBlocked
        ? `This date will be unblocked: ${dateString}.`
        : `This date will be blocked: ${dateString}.`;
      setDisplayRange({ start: dateString, end: dateString });
      setCalendarNote(note);
    },
    [rangeStart, rangeEnd, todayKey, blockedSet, applyRangeToggleWithAlert]
  );

  const onDayLongPress = useCallback(
    (key: string) => {
      if (!key) return;
      if (isBeforeDateKey(key, todayKey)) return;

      const isBlocked = blockedSet.has(key);
      if (!isBlocked) return;

      Alert.alert("Unblock date?", `Unblock ${key}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: () => {
            const next = blockedLocal.filter((k) => k !== key).sort();
            setBlockedLocal(next);

            setDisplayRange({ start: key, end: key });
            setCalendarNote(`This date will be unblocked: ${key}.`);

            setRangeStart(null);
            setRangeEnd(null);
          },
        },
      ]);
    },
    [blockedLocal, blockedSet, todayKey]
  );

  const toggleAmenityLocal = useCallback(
    (id: string) => {
      const next = new Set(amenitiesLocal);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setAmenitiesLocal(Array.from(next).sort());
    },
    [amenitiesLocal]
  );

  const availableToAdd = useMemo(() => {
    const set = amenitiesSet;
    return ALL_FEATURE_ITEMS.filter((f) => !set.has(f.id));
  }, [amenitiesSet]);

  const selectedFeatures = useMemo(() => {
    const byId = new Map(ALL_FEATURE_ITEMS.map((x) => [x.id, x] as const));
    const ids = uniqSortedStrings(amenitiesLocal);
    return ids.map(
      (id) => byId.get(id) || { id, label: id, icon: "check" as any }
    );
  }, [amenitiesLocal]);

  // ✅ Calendar markings for blocked dates (range highlight handled by dayComponent)
  const markedDates = useMemo(() => {
    const out: Record<string, any> = {};
    const visibleBlocked = blockedLocal
      .filter((k) => String(k) >= String(todayKey))
      .sort();
    const set = new Set(visibleBlocked);

    for (const k of visibleBlocked) {
      const d = parseDateKey(k);
      const prev = toDateKey(
        new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
      );
      const next = toDateKey(
        new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      );

      const hasPrev = set.has(prev);
      const hasNext = set.has(next);

      out[k] = {
        startingDay: !hasPrev,
        endingDay: !hasNext,
        color: "rgba(17,24,39,0.22)",
        textColor: "#111827",
      };
    }

    return out;
  }, [blockedLocal, todayKey]);

  // Photos reorder (UI-only)
  const photoKeyExtractor = useCallback((u: string) => u, []);
  const renderPhotoItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<string>) => {
      const index = galleryLocal.findIndex((url) => url === item);
      const isMain = index === 0;

      return (
        <Pressable
          onLongPress={drag}
          delayLongPress={250}
          style={({ pressed }) => [
            styles.dragThumbWrap,
            (pressed || isActive) && { opacity: 0.9 },
          ]}
        >
          <Image
            source={{ uri: item }}
            style={styles.dragThumb}
            resizeMode="cover"
          />

          {/* Number badge (1, 2, 3, ...) */}
          <View style={styles.photoNumberBadge}>
            <Text style={styles.photoNumberText}>{index + 1}</Text>
          </View>

          {/* "Main" badge only on the first photo */}
          {isMain && (
            <View style={styles.mainPhotoBadge}>
              <Text style={styles.mainPhotoText}>Main</Text>
            </View>
          )}

          {/* Drag handle */}
          <View style={styles.dragHandle}>
            <Feather name="move" size={14} color="rgba(255,255,255,0.90)" />
          </View>
        </Pressable>
      );
    },
    [galleryLocal]
  );

  const onDragEnd = useCallback((next: string[], from: number, to: number) => {
    setGalleryLocal(next);
    if (to === 0 && from !== 0) {
      Alert.alert("Main photo", "This will be the main photo.", [
        { text: "OK" },
      ]);
    }
  }, []);

  if (!carId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.err}>Missing carId</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroImages = useMemo(() => {
    const xs = galleryLocal.length ? galleryLocal : cover ? [cover] : [];
    return xs;
  }, [galleryLocal, cover]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => confirmLeave(() => router.back())}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={18} color="#111827" />
        </Pressable>

        <Text style={styles.h1} numberOfLines={1}>
          Car Details
        </Text>

        <Pressable
          onPress={onDelete}
          disabled={deleting || loading || busy}
          style={({ pressed }) => [
            styles.deleteBtn,
            (deleting || loading || busy) && { opacity: 0.6 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete car"
        >
          {deleting ? (
            <ActivityIndicator />
          ) : (
            <>
              <Feather name="trash-2" size={16} color="#991B1B" />
              <Text style={styles.deleteText}>Deactivate</Text>
            </>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !car ? (
        <View style={styles.center}>
          <Text style={styles.err}>Car not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={styles.heroBigCard}>
            <ImageCarousel urls={heroImages} />

            <View style={styles.heroInfo}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.titleBig} numberOfLines={2}>
                  {String(car.title || "Untitled")}
                </Text>

                <View
                  style={[
                    styles.statusPill,
                    String(car?.status || "").toLowerCase() === "active"
                      ? styles.statusPillActive
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      String(car?.status || "").toLowerCase() === "active"
                        ? styles.statusTextActive
                        : null,
                    ]}
                  >
                    {statusLabel(car.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMetaBig}>
                {[
                  car.vehicle_type
                    ? String(car.vehicle_type).toUpperCase()
                    : "",
                  car.transmission
                    ? String(car.transmission).toUpperCase()
                    : "",
                  car.seats ? `${car.seats} seats` : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>

              <Text style={styles.heroLocBig}>
                {[
                  car.area ? String(car.area) : "",
                  car.city ? String(car.city) : "",
                  car.country_code ? String(car.country_code) : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>

              {!!car.price_per_day && (
                <Text style={styles.heroPriceBig}>
                  {money(car.price_per_day, car.currency || "CAD")} / day
                </Text>
              )}
            </View>
          </View>

          {/* DETAILS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            <KeyValueRow label="Car ID" value={String(car.id)} icon="hash" />
            <KeyValueRow
              label="Updated"
              value={formatUpdatedAt(car.updated_at)}
              icon="clock"
            />
            <KeyValueRow
              label="Full address"
              value={String(car.full_address || "")}
              icon="home"
            />
            <KeyValueRow
              label="Pickup address"
              value={String(car.pickup_address || "")}
              icon="navigation"
            />
          </View>

          {/* ODOMETER */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Odometer</Text>

            {odometerLocked ? (
              <View style={styles.odoDisplayRow}>
                <View style={styles.odoLeft}>
                  <View style={styles.odoIcon}>
                    <Feather
                      name="activity"
                      size={14}
                      color="rgba(17,24,39,0.70)"
                    />
                  </View>

                  <View>
                    <Text style={styles.odoLabel}>Current odometer</Text>
                    <Text style={styles.odoHint}>Locked after publishing</Text>
                  </View>
                </View>

                <Text style={styles.odoValue}>
                  {Number(car?.odometer_km ?? 0).toLocaleString("en-CA")} km
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.note}>
                  Enter the odometer once. It will be locked after it’s set.
                  Cars above 200,000 km cannot be registered.
                </Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    value={odoText}
                    editable
                    onChangeText={(v) => setOdoText(sanitizeOdoText(v))}
                    placeholder="e.g. 123456"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}
          </View>

          {/* AVAILABILITY */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Text style={styles.note}>
              Tap a start date, then an end date to toggle a range
              (block/unblock). Long-press a blocked date to unblock one day.
              Past dates are disabled.
            </Text>

            <View style={styles.rangeRow}>
              <View style={styles.rangePill}>
                <Feather
                  name="calendar"
                  size={14}
                  color="rgba(17,24,39,0.70)"
                />

                <Text style={styles.rangeText}>
                  {rangeStart ? (
                    !rangeEnd ? (
                      <>
                        <Text style={styles.rangeDateText}>{rangeStart}</Text>
                        <Text style={styles.rangeArrow}> → </Text>
                        <Text style={styles.rangeDateText}>
                          Select end date
                        </Text>
                      </>
                    ) : (
                      (() => {
                        const n = normalizeRange(rangeStart, rangeEnd);
                        return (
                          <>
                            <Text style={styles.rangeDateText}>{n.start}</Text>
                            <Text style={styles.rangeArrow}> → </Text>
                            <Text style={styles.rangeDateText}>{n.end}</Text>
                          </>
                        );
                      })()
                    )
                  ) : displayRange ? (
                    displayRange.start === displayRange.end ? (
                      <Text style={styles.rangeDateText}>
                        {displayRange.start}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.rangeDateText}>
                          {displayRange.start}
                        </Text>
                        <Text style={styles.rangeArrow}> → </Text>
                        <Text style={styles.rangeDateText}>
                          {displayRange.end}
                        </Text>
                      </>
                    )
                  ) : (
                    "Select Dates"
                  )}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setRangeStart(null);
                  setRangeEnd(null);
                  setDisplayRange(null);
                  setCalendarNote("");
                }}
                style={({ pressed }) => [
                  styles.clearBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            <Calendar
              minDate={todayKey}
              disableAllTouchEventsForDisabledDays
              markingType="period"
              markedDates={markedDates}
              dayComponent={({ date }) => {
                const key = String(date?.dateString || "");
                if (!key) return null;

                const isPast = !isSameOrAfter(key, todayKey);
                const isBlocked = blockedSet.has(key);

                // ✅ selection highlight: always stays on while selecting a range
                const selecting =
                  !!rangeStart &&
                  (rangeEnd
                    ? isInRange(key, rangeStart, rangeEnd)
                    : key === rangeStart);

                const isStart = selecting && rangeStart && key === rangeStart;
                const isEnd = selecting && rangeEnd && key === rangeEnd;
                const isSingle =
                  selecting &&
                  rangeStart &&
                  rangeEnd &&
                  rangeStart === rangeEnd;

                const rangeStyle = selecting
                  ? isSingle
                    ? styles.selSingle
                    : isStart
                    ? styles.selStart
                    : isEnd
                    ? styles.selEnd
                    : styles.selMid
                  : null;

                const onPress = () => {
                  if (isPast) return;
                  onDayPress(key);
                };

                const onLongPress = () => {
                  if (isPast) return;
                  onDayLongPress(key);
                };

                return (
                  <Pressable
                    onPress={onPress}
                    onLongPress={onLongPress}
                    disabled={isPast}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      styles.dayCell,
                      pressed && !isPast ? { opacity: 0.9 } : null,
                    ]}
                  >
                    {selecting ? (
                      <View style={[styles.selBg, rangeStyle]} />
                    ) : null}

                    {isBlocked && !selecting && !isPast ? (
                      <View style={styles.diagonalStrike} />
                    ) : null}

                    <Text
                      style={[
                        styles.dayText,
                        isPast ? styles.dayTextDisabled : null,
                        isBlocked && !selecting ? styles.dayTextBlocked : null,
                        selecting ? styles.dayTextOnSelection : null,
                      ]}
                    >
                      {date?.day}
                    </Text>
                  </Pressable>
                );
              }}
              theme={{
                textMonthFontWeight: "900",
                textDayHeaderFontWeight: "900",
                arrowColor: "rgba(17,24,39,0.65)",
                todayTextColor: "#111827",
                textDisabledColor: "rgba(17,24,39,0.25)",
              }}
            />

            {calendarNote ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.note, { color: "rgba(17,24,39,0.55)" }]}>
                  {calendarNote}
                </Text>
              </View>
            ) : null}
          </View>

          {/* FEATURES */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionTitle}>Features</Text>

              <Pressable
                onPress={() => setAddFeaturesOpen(true)}
                style={({ pressed }) => [
                  styles.addMiniBtn,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather name="plus" size={14} color="#111827" />
                <Text style={styles.addMiniText}>Add</Text>
              </Pressable>
            </View>

            {selectedFeatures.length ? (
              <View style={styles.pillGrid}>
                {selectedFeatures.map((f) => {
                  const on = amenitiesSet.has(f.id);
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleAmenityLocal(f.id)}
                      style={({ pressed }) => [
                        styles.featurePill,
                        on ? styles.featureOn : styles.featureOff,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <Feather
                        name={f.icon}
                        size={14}
                        color={
                          on ? "rgba(17,24,39,0.95)" : "rgba(17,24,39,0.55)"
                        }
                      />
                      <Text
                        style={[styles.featureText, on && styles.featureTextOn]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.note, { marginTop: 8 }]}>
                No features selected yet. Tap “Add” to choose from the full
                list.
              </Text>
            )}
          </View>

          {/* Add Features Modal */}
          <Modal visible={addFeaturesOpen} transparent animationType="fade">
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setAddFeaturesOpen(false)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add features</Text>
                <Pressable
                  onPress={() => setAddFeaturesOpen(false)}
                  style={({ pressed }) => [
                    styles.modalClose,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="x" size={16} color="#111827" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {availableToAdd.length ? (
                  <View style={styles.pillGrid}>
                    {availableToAdd.map((f) => (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          const next = new Set(amenitiesLocal);
                          next.add(f.id);
                          setAmenitiesLocal(Array.from(next).sort());
                        }}
                        style={({ pressed }) => [
                          styles.featurePill,
                          styles.featureOff,
                          pressed && { opacity: 0.92 },
                        ]}
                      >
                        <Feather
                          name={f.icon}
                          size={14}
                          color="rgba(17,24,39,0.55)"
                        />
                        <Text style={styles.featureText}>{f.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.note}>
                    All available features are already selected.
                  </Text>
                )}
              </ScrollView>
            </View>
          </Modal>

          {/* PHOTOS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionTitle}>Photos</Text>

              <Pressable
                onPress={() =>
                  router.push(
                    `/host-onboarding-photos?carId=${encodeURIComponent(
                      car.id
                    )}`
                  )
                }
                style={({ pressed }) => [
                  styles.addMiniBtn,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather name="camera" size={14} color="#111827" />
                <Text style={styles.addMiniText}>Add</Text>
              </Pressable>
            </View>

            {galleryLocal.length ? (
              <>
                <Text style={[styles.note, { marginTop: 8 }]}>
                  Long-press and drag to reorder. The first photo is the main
                  photo.
                </Text>

                <View style={{ marginTop: 10 }}>
                  <DraggableFlatList
                    data={galleryLocal}
                    keyExtractor={photoKeyExtractor}
                    renderItem={renderPhotoItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dragRow}
                    onDragEnd={({ data, from, to }) =>
                      onDragEnd(data, from, to)
                    }
                  />
                </View>
              </>
            ) : (
              <Text style={[styles.note, { marginTop: 8 }]}>
                No photos yet. Tap “Add” to upload photos.
              </Text>
            )}
          </View>

          {/* PRIMARY ACTION */}
          <View style={styles.sectionCard}>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.sectionTitle}>{primaryLabel}</Text>
              {isDirty ? (
                <View style={styles.dirtyPill}>
                  <Text style={styles.dirtyText}>Unsaved</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={onPrimaryAction}
              disabled={busy || deleting}
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || deleting) && { opacity: 0.6 },
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Feather
                    name={primaryLabel === "Publish" ? "upload" : "check"}
                    size={16}
                    color="#111827"
                  />
                  <Text style={styles.primaryText}>{primaryLabel}</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  h1: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },

  deleteText: { fontSize: 12, fontWeight: "900", color: "#991B1B" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { fontSize: 14, fontWeight: "900", color: "rgba(17,24,39,0.65)" },

  content: { paddingHorizontal: 18, paddingBottom: 24 },

  heroBigCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  carouselWrap: {
    height: 260,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  carouselImg: { width: "100%", height: "100%" },

  carouselGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  carouselEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  dotsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.18)",
  },

  dotOn: {
    width: 16,
    backgroundColor: "rgba(17,24,39,0.45)",
  },

  heroInfo: { marginTop: 12 },

  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  titleBig: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.15,
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  statusPillActive: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.30)",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
    textTransform: "capitalize",
  },

  statusTextActive: {
    color: "rgba(6,95,70,0.95)",
  },

  heroMetaBig: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  heroLocBig: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  heroPriceBig: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.92)",
  },

  sectionCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  sectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  addMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  addMiniText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  kvRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.06)",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  kvLeft: { flexDirection: "row", alignItems: "center", gap: 8 },

  kvLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  kvValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 16,
  },

  inputWrap: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },

  input: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },

  rangeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  rangePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  rangeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },

  clearText: { fontSize: 12, fontWeight: "900", color: "#991B1B" },

  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },

  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  featureOn: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.22)",
  },

  featureOff: {
    backgroundColor: "rgba(17,24,39,0.03)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  featureText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },

  featureTextOn: {
    color: "rgba(17,24,39,0.92)",
  },

  // Photos drag row
  dragRow: { paddingVertical: 6, gap: 10 },

  dragThumbWrap: {
    width: 132,
    height: 132,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginRight: 10,
  },

  dragThumb: { width: "100%", height: "100%" },

  dragHandle: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dirtyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },

  dirtyText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#991B1B",
  },

  primaryBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  primaryText: { fontSize: 14, fontWeight: "900", color: "#111827" },

  odoDisplayRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  odoLeft: { flexDirection: "row", alignItems: "center", gap: 10 },

  odoIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  odoLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },

  odoHint: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
  },

  odoValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  rangeDateText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  rangeArrow: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(48, 206, 69, 1)",
  },

  dayCell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  dayText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  dayTextDisabled: {
    color: "rgba(17,24,39,0.22)",
  },

  dayTextBlocked: {
    color: "rgba(185, 28, 28, 0.75)",
    fontWeight: "900",
  },

  diagonalStrike: {
    position: "absolute",
    width: 21,
    height: 2,
    backgroundColor: "rgba(185, 28, 28, 0.85)",
    transform: [{ rotate: "-45deg" }],
  },

  dayTextOnSelection: {
    color: "#111827",
  },

  selBg: {
    position: "absolute",
    height: 34,
    left: 0,
    right: 0,
    borderRadius: 0,
    backgroundColor: "rgba(17,24,39,0.28)", // ✅ darker so it’s obvious
  },

  selMid: { borderRadius: 0 },

  selStart: {
    left: 6,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },

  selEnd: {
    right: 6,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },

  selSingle: {
    left: 6,
    right: 6,
    borderRadius: 999,
  },

  // Modal
  modalBackdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  modalCard: {
    marginTop: 90,
    marginHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 12,
    maxHeight: "70%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.06)",
  },

  modalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  coverEmptyText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },
  photoNumberBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 10,
  },
  photoNumberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  mainPhotoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(34,197,94,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 10,
  },
  mainPhotoText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
