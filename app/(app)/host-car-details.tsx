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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";
import { auth } from "@/services/firebase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type HostCar = {
  id: string;
  title?: string | null;
  status?: string | null;

  vehicle_type?: string | null;
  transmission?: string | null;
  seats?: number | null;

  price_per_day?: number | null;
  currency?: string | null;

  country_code?: string | null;
  city?: string | null;
  area?: string | null;

  full_address?: string | null;
  pickup_address?: string | null;

  image_path?: string | null;
  image_gallery?: any[] | string[] | null;

  odometer_km?: number | null;

  features?: any; // jsonb
  requirements?: any; // jsonb

  updated_at?: string | null;
};

async function getIdToken() {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error("Missing auth token");
  return token;
}

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

function isSameOrAfter(a: string, b: string) {
  return String(a) >= String(b);
}

function isInRange(key: string, start: string, end: string) {
  const a = String(start);
  const b = String(end);
  const k = String(key);
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  return k >= lo && k <= hi;
}

function normalizeRange(a: string, b: string) {
  const A = String(a);
  const B = String(b);
  return A <= B ? { start: A, end: B } : { start: B, end: A };
}

/** --------- Features catalog (icons + ids) --------- */
const FEATURE_ITEMS: Array<{
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { id: "apple_carplay", label: "Apple CarPlay", icon: "smartphone" },
  { id: "android_auto", label: "Android Auto", icon: "smartphone" },
  { id: "backup_camera", label: "Backup camera", icon: "camera" },
  { id: "heated_seats", label: "Heated seats", icon: "wind" },
  { id: "sunroof", label: "Sunroof", icon: "sun" },
  { id: "all_wheel_drive", label: "AWD", icon: "compass" },
  { id: "navigation", label: "Navigation", icon: "map" },
  { id: "usb", label: "USB", icon: "cpu" },
  { id: "pet_friendly", label: "Pet friendly", icon: "heart" },
];

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

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function uniqSortedStrings(xs: string[]) {
  return Array.from(new Set(xs.filter((x) => typeof x === "string"))).sort();
}

export default function HostCarDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const carId = String(params?.carId || "").trim();

  const [car, setCar] = useState<HostCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const cover = useMemo(() => (car ? getCoverUrl(car) : ""), [car]);
  const gallery = useMemo(() => (car ? getGalleryUrls(car) : []), [car]);

  // -------- Local editable state (NOT auto-saving) --------
  const [odoText, setOdoText] = useState("");
  const [amenitiesLocal, setAmenitiesLocal] = useState<string[]>([]);
  const [blockedLocal, setBlockedLocal] = useState<string[]>([]);

  // Initial snapshot for dirty-check
  const initialRef = useRef<{
    odometer_km: number;
    amenities: string[];
    blocked: string[];
  } | null>(null);

  // Range selection UI
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Persisted “display” range + message under calendar (until Clear)
  const [displayRange, setDisplayRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [calendarNote, setCalendarNote] = useState<string>("");

  const odometerLocked = useMemo(() => {
    return Number(car?.odometer_km ?? 0) > 0;
  }, [car?.odometer_km]);

  const isDirty = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;

    const odoNow = Number(String(odoText).replace(/[^\d]/g, "")) || 0;
    const aNow = uniqSortedStrings(amenitiesLocal);
    const bNow = uniqSortedStrings(blockedLocal);

    return (
      odoNow !== init.odometer_km ||
      !arraysEqual(aNow, init.amenities) ||
      !arraysEqual(bNow, init.blocked)
    );
  }, [odoText, amenitiesLocal, blockedLocal]);

  const isActive = useMemo(
    () => String(car?.status || "").toLowerCase() === "active",
    [car?.status]
  );

  const primaryLabel = useMemo(
    () => (isActive ? "Update" : "Publish"),
    [isActive]
  );

  const loadCar = useCallback(async () => {
    if (!carId) throw new Error("Missing carId");
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch(
        `${API_BASE}/api/host/cars/${encodeURIComponent(carId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to load car");

      const json = JSON.parse(text);
      const c: HostCar | null = json?.car ?? null;
      setCar(c);

      const odo = Number(c?.odometer_km ?? 0) || 0;
      const amenities = uniqSortedStrings(
        Array.isArray(c?.features?.amenities) ? c!.features.amenities : []
      );
      const blocked = uniqSortedStrings(
        Array.isArray(c?.requirements?.availability?.blockedDates)
          ? c!.requirements.availability.blockedDates
          : []
      ).filter((k) => !isBeforeDateKey(k, todayKey));

      setOdoText(odo ? String(odo) : "");
      setAmenitiesLocal(amenities);
      setBlockedLocal(blocked);

      initialRef.current = { odometer_km: odo, amenities, blocked };

      // Reset display message on initial load
      setDisplayRange(null);
      setCalendarNote("");

      return c; // ✅ IMPORTANT
    } finally {
      setLoading(false);
    }
  }, [carId, todayKey]);

  useEffect(() => {
    loadCar().catch((e) => {
      console.warn("load car failed", e?.message || e);
      setLoading(false);
    });
  }, [loadCar]);

  const patchCar = useCallback(
    async (patch: Partial<HostCar>) => {
      const token = await getIdToken();
      const res = await fetch(
        `${API_BASE}/api/host/cars/${encodeURIComponent(carId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to update car");

      const json = JSON.parse(text);
      console.log("PATCH PAYLOAD", json?.car);
      return json?.car;
    },
    [carId]
  );

  const saveOnly = useCallback(async () => {
    if (!car) throw new Error("Car not loaded");

    const amenities = uniqSortedStrings(amenitiesLocal);
    const blocked = uniqSortedStrings(blockedLocal);

    // ✅ Only compute/validate odo if it is NOT locked
    const odoRaw = String(odoText).replace(/[^\d]/g, "");
    const odo = odoRaw ? Number(odoRaw) : 0;

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

    // ✅ Build patch without accidentally overwriting odometer
    const patch: any = {
      features: {
        ...(car.features || {}),
        amenities,
      },
      requirements: {
        ...(car.requirements || {}),
        availability: {
          ...(car.requirements?.availability || {}),
          timezone:
            car.requirements?.availability?.timezone || "America/Edmonton",
          blockedDates: blocked,
        },
      },
    };

    if (!odometerLocked) {
      patch.odometer_km = odo; // ✅ only set once
    }

    await patchCar(patch);

    // ✅ Re-fetch canonical state so UI locks correctly
    const fresh = await loadCar();

    const freshOdo = Number(fresh?.odometer_km ?? 0) || 0;
    initialRef.current = { odometer_km: freshOdo, amenities, blocked };
  }, [
    car,
    amenitiesLocal,
    blockedLocal,
    odoText,
    odometerLocked,
    isActive,
    patchCar,
    loadCar,
  ]);

  const onPrimaryAction = useCallback(async () => {
    if (!car) return;

    if (!isDirty) {
      Alert.alert("No changes", "You haven’t made any changes to update.");
      return;
    }

    try {
      setBusy(true);
      await saveOnly();

      if (!isActive) {
        // Publish
        const token = await getIdToken();
        const res = await fetch(
          `${API_BASE}/api/host/cars/${encodeURIComponent(car.id)}/publish`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to publish");

        router.replace("/(hosttabs)/cars");
      } else {
        Alert.alert("Updated", "Car details updated.");
        router.replace("/(hosttabs)/cars");
      }
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
  }, [car, isDirty, saveOnly, isActive, router]);

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
      "Delete car?",
      "This will delete the car and remove all its photos.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const token = await getIdToken();

              const res = await fetch(
                `${API_BASE}/api/host/cars/${encodeURIComponent(car.id)}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              const text = await res.text();
              if (!res.ok) throw new Error(text || "Failed to delete car");

              router.replace({
                pathname: "/(hosttabs)/cars",
                params: { refresh: "1" },
              });
            } catch (e: any) {
              Alert.alert(
                "Delete failed",
                e?.message || "Could not delete this car."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [car, router]);

  // ---------- SMART BLOCK/UNBLOCK + messaging (deterministic) ----------
  const applyRangeToggleWithAlert = useCallback(
    (rangeKeys: string[], tappedStart: string, tappedEnd: string) => {
      if (!rangeKeys.length) return;

      const { start, end } = normalizeRange(tappedStart, tappedEnd);
      const current = new Set(blockedLocal);

      let blockedCount = 0;
      for (const k of rangeKeys) if (current.has(k)) blockedCount++;
      const availableCount = rangeKeys.length - blockedCount;

      // Decide action:
      // - all blocked -> unblock
      // - otherwise -> block (mixed counts as block for predictability)
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

              // Persist the pill text + message until Clear
              setDisplayRange({ start, end });
              setCalendarNote(note);

              // Clear selection highlight after confirming
              setRangeStart(null);
              setRangeEnd(null);
            },
          },
        ],
        { cancelable: true }
      );
    },
    [blockedLocal]
  );

  const onDayPress = useCallback(
    (dateString: string) => {
      if (!dateString) return;
      if (isBeforeDateKey(dateString, todayKey)) return;

      // First tap
      if (!rangeStart) {
        setRangeStart(dateString);
        setRangeEnd(null);

        // Preview message for single-day intent (persists until clear / confirm)
        const isBlocked = blockedLocal.includes(dateString);
        const note = isBlocked
          ? `This date will be unblocked: ${dateString}.`
          : `This date will be blocked: ${dateString}.`;
        setDisplayRange({ start: dateString, end: dateString });
        setCalendarNote(note);

        return;
      }

      // Second tap completes the range
      if (rangeStart && !rangeEnd) {
        setRangeEnd(dateString);

        const keys = dateRangeKeys(rangeStart, dateString).filter(
          (k) => !isBeforeDateKey(k, todayKey)
        );

        applyRangeToggleWithAlert(keys, rangeStart, dateString);
        return;
      }

      // Start a new selection
      setRangeStart(dateString);
      setRangeEnd(null);

      const isBlocked = blockedLocal.includes(dateString);
      const note = isBlocked
        ? `This date will be unblocked: ${dateString}.`
        : `This date will be blocked: ${dateString}.`;
      setDisplayRange({ start: dateString, end: dateString });
      setCalendarNote(note);
    },
    [rangeStart, rangeEnd, todayKey, blockedLocal, applyRangeToggleWithAlert]
  );

  // Quick single-day unblock (long press)
  const onDayLongPress = useCallback(
    (key: string) => {
      if (!key) return;
      if (isBeforeDateKey(key, todayKey)) return;

      const isBlocked = blockedLocal.includes(key);
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

            // clear selection highlight just in case
            setRangeStart(null);
            setRangeEnd(null);
          },
        },
      ]);
    },
    [blockedLocal, todayKey]
  );

  const toggleAmenityLocal = useCallback(
    (id: string) => {
      const set = new Set(amenitiesLocal);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      setAmenitiesLocal(Array.from(set).sort());
    },
    [amenitiesLocal]
  );

  // Calendar markings (kept)
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

    // Preview only if start selected and it's today+
    if (rangeStart && !rangeEnd && String(rangeStart) >= String(todayKey)) {
      out[rangeStart] = {
        ...(out[rangeStart] || {}),
        startingDay: true,
        endingDay: true,
        color: "rgba(17,24,39,0.18)",
        textColor: "#111827",
      };
    }

    return out;
  }, [blockedLocal, rangeStart, rangeEnd, todayKey]);

  if (!carId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.err}>Missing carId</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.deleteText}>Delete</Text>
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
          <View style={styles.heroCard}>
            <View style={styles.heroCoverWrap}>
              {cover ? (
                <Image
                  source={{ uri: cover }}
                  style={styles.heroCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverEmpty}>
                  <Feather name="image" size={18} color="rgba(17,24,39,0.35)" />
                  <Text style={styles.coverEmptyText}>No photo</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
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

              <Text style={styles.heroMeta}>
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

              <Text style={styles.heroLoc}>
                {[
                  car.area ? String(car.area) : "",
                  car.city ? String(car.city) : "",
                  car.country_code ? String(car.country_code) : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>

              {!!car.price_per_day && (
                <Text style={styles.heroPrice}>
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
                    onChangeText={(v) =>
                      setOdoText(v.replace(/[^\d]/g, "").slice(0, 7))
                    }
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
              dayComponent={({ date }) => {
                const key = String(date?.dateString || "");
                if (!key) return null;

                const isPast = !isSameOrAfter(key, todayKey);
                const isBlocked = blockedLocal.includes(key);

                // ✅ show range highlight ONLY while selecting
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

                // Rounded ends for selection highlight
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
                    {/* ✅ Selection highlight layer (ONLY while selecting) */}
                    {selecting ? (
                      <View style={[styles.selBg, rangeStyle]} />
                    ) : null}

                    {/* ✅ Blocked diagonal strike (ONLY when NOT selecting) */}
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
            <Text style={styles.sectionTitle}>Features</Text>

            <View style={styles.pillGrid}>
              {FEATURE_ITEMS.map((f) => {
                const on = amenitiesLocal.includes(f.id);
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
                      color={on ? "rgba(17,24,39,0.95)" : "rgba(17,24,39,0.55)"}
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
          </View>

          {/* PHOTOS */}
          {!!gallery.length && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
              >
                {gallery.map((u) => (
                  <View key={u} style={styles.thumbWrap}>
                    <Image
                      source={{ uri: u }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

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

  heroCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  heroCoverWrap: {
    width: 140,
    height: 140,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  heroCover: { width: "100%", height: "100%" },

  coverEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  coverEmptyText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  statusPill: {
    marginTop: 8,
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

  heroMeta: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  heroLoc: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  heroPrice: {
    marginTop: 12,
    fontSize: 14,
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

  photoRow: { paddingTop: 10, gap: 10 },

  thumbWrap: {
    width: 110,
    height: 110,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  thumb: { width: "100%", height: "100%" },

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

  // ----- selection highlight (ONLY while picking start/end) -----
  selBg: {
    position: "absolute",
    height: 34,
    left: 0,
    right: 0,
    borderRadius: 0,
    backgroundColor: "rgba(17,24,39,0.22)",
  },

  selMid: {
    borderRadius: 0,
  },

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
});
