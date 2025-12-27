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
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
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
  has_image?: boolean | null;
  image_path?: string | null;
  image_gallery?: any[] | string[] | null;
  updated_at?: string | null;

  // Future: if you add availability info to list API, we’ll wire it.
  // requirements?: any;
};

type StatusFilter = "all" | "active" | "draft";
type SortKey = "updated" | "price" | "status" | "city";

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

function normStatus(s: any): "active" | "draft" | "other" {
  const v = String(s || "")
    .toLowerCase()
    .trim();
  if (v === "active") return "active";
  if (v === "draft") return "draft";
  return "other";
}

function parseDateMs(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return 0;
  const d = new Date(s);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function relativeTimeFromNow(ms: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const sec = Math.max(0, Math.floor(diff / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return "";
}

function computeCompletion(car: HostCar, photoCount: number) {
  // Keep it simple + deterministic.
  // We score based on fields that strongly affect “publish readiness”.
  const checks: Array<{ ok: boolean; missing: string }> = [
    { ok: !!String(car.title || "").trim(), missing: "title" },
    { ok: !!String(car.vehicle_type || "").trim(), missing: "vehicle type" },
    { ok: !!String(car.transmission || "").trim(), missing: "transmission" },
    { ok: Number(car.seats || 0) > 0, missing: "seats" },
    { ok: Number(car.price_per_day || 0) > 0, missing: "price" },
    { ok: !!String(car.city || "").trim(), missing: "city" },
    { ok: !!String(car.country_code || "").trim(), missing: "country" },
    { ok: photoCount > 0, missing: "photos" },
  ];

  const total = checks.length;
  const okCount = checks.reduce((acc, x) => acc + (x.ok ? 1 : 0), 0);
  const pct = Math.round((okCount / total) * 100);

  const missing = checks.filter((x) => !x.ok).map((x) => x.missing);
  return { pct, missing };
}

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "green" | "amber" | "muted";
}) {
  const toneStyle =
    tone === "green"
      ? styles.badgeGreen
      : tone === "amber"
      ? styles.badgeAmber
      : tone === "muted"
      ? styles.badgeMuted
      : styles.badgeNeutral;

  const textStyle =
    tone === "green"
      ? styles.badgeTextGreen
      : tone === "amber"
      ? styles.badgeTextAmber
      : styles.badgeText;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.badgeText, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function CarCover({ url, photoCount }: { url: string; photoCount: number }) {
  return (
    <View style={styles.coverWrap}>
      {url ? (
        <>
          <Image
            source={{ uri: url }}
            style={styles.cover}
            resizeMode="cover"
            onError={(ev) => {
              console.warn("CAR COVER IMAGE FAILED", {
                cover: url,
                nativeEvent: (ev as any)?.nativeEvent,
                nativeError: (ev as any)?.nativeEvent?.error,
              });
            }}
          />
          {/* subtle bottom overlay to feel less flat */}
          <View style={styles.coverOverlayBottom} />
        </>
      ) : (
        <View style={styles.coverEmpty}>
          <Feather name="image" size={18} color="rgba(17,24,39,0.35)" />
          <Text style={styles.coverEmptyText}>No photo</Text>
        </View>
      )}

      {/* photo count badge */}
      <View style={styles.photoCountBadge}>
        <Feather name="camera" size={12} color="rgba(17,24,39,0.85)" />
        <Text style={styles.photoCountText}>{photoCount}</Text>
      </View>
    </View>
  );
}

function SwipeActionPill({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "danger" | "neutral";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.swipePill,
        tone === "danger" ? styles.swipePillDanger : styles.swipePillNeutral,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={tone === "danger" ? "#991B1B" : "#111827"}
      />
      <Text
        style={[
          styles.swipePillText,
          tone === "danger" ? { color: "#991B1B" } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CarCard({
  car,
  derived,
  onPress,
  onEdit,
  onAvailability,
  onPreview,
  onDelete,
}: {
  car: HostCar;
  derived: {
    coverUrl: string;
    photoCount: number;
    statusNorm: "active" | "draft" | "other";
    updatedMs: number;
    updatedRel: string;
    completionPct: number;
    missing: string[];
    loc: string;
    price: string;
    metaBadges: string[];
  };
  onPress: (car: HostCar) => void;
  onEdit: (car: HostCar) => void;
  onAvailability: (car: HostCar) => void;
  onPreview: (car: HostCar) => void;
  onDelete: (car: HostCar) => void;
}) {
  const title = String(car?.title || "Untitled");
  const statusText = statusLabel(car?.status);

  const statusPillStyle =
    derived.statusNorm === "active"
      ? styles.statusPillActive
      : derived.statusNorm === "draft"
      ? styles.statusPillDraft
      : styles.statusPillNeutral;

  const statusTextStyle =
    derived.statusNorm === "active"
      ? styles.statusTextActive
      : derived.statusNorm === "draft"
      ? styles.statusTextDraft
      : styles.statusText;

  // Swipe actions
  const renderLeftActions = () => (
    <View style={styles.swipeLeftWrap}>
      <SwipeActionPill
        label="Edit"
        icon="edit-2"
        tone="neutral"
        onPress={() => onEdit(car)}
      />
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.swipeRightWrap}>
      <SwipeActionPill
        label="Delete"
        icon="trash-2"
        tone="danger"
        onPress={() => onDelete(car)}
      />
    </View>
  );

  const availabilityLabel = "Availability: Not set"; // placeholder until list API includes it

  const missingShort =
    derived.missing.length === 0
      ? ""
      : derived.missing.slice(0, 2).join(", ") +
        (derived.missing.length > 2 ? "…" : "");

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        onPress={() => onPress(car)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
      >
        <CarCover url={derived.coverUrl} photoCount={derived.photoCount} />

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            <View style={[styles.statusPill, statusPillStyle]}>
              <Text style={[styles.statusText, statusTextStyle]}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* badges row */}
          <View style={styles.badgesRow}>
            {derived.metaBadges.map((b) => (
              <Badge key={b} label={b} />
            ))}
          </View>

          {!!derived.loc && (
            <Text style={styles.loc} numberOfLines={1}>
              {derived.loc}
            </Text>
          )}

          {/* usefulness indicators */}
          <View style={styles.infoRow}>
            <Badge
              label={`Complete ${derived.completionPct}%`}
              tone={derived.completionPct >= 90 ? "green" : "muted"}
            />
            <Badge label={availabilityLabel} tone="muted" />
          </View>

          {missingShort ? (
            <Text style={styles.missingText} numberOfLines={1}>
              Missing: {missingShort}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text style={styles.price}>
              {derived.price ? `${derived.price} / day` : ""}
            </Text>

            <View style={styles.rightMeta}>
              {!!derived.updatedRel && (
                <Text style={styles.updatedText}>
                  Updated {derived.updatedRel}
                </Text>
              )}
              <Feather
                name="chevron-right"
                size={16}
                color="rgba(17,24,39,0.35)"
              />
            </View>
          </View>

          {/* quick actions */}
          <View style={styles.quickActionsRow}>
            <Pressable
              onPress={() => onEdit(car)}
              style={({ pressed }) => [
                styles.qActionBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="edit-2" size={14} color="rgba(17,24,39,0.85)" />
              <Text style={styles.qActionText}>Edit</Text>
            </Pressable>

            <Pressable
              onPress={() => onAvailability(car)}
              style={({ pressed }) => [
                styles.qActionBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="calendar" size={14} color="rgba(17,24,39,0.85)" />
              <Text style={styles.qActionText}>Availability</Text>
            </Pressable>

            <Pressable
              onPress={() => onPreview(car)}
              style={({ pressed }) => [
                styles.qActionBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="eye" size={14} color="rgba(17,24,39,0.85)" />
              <Text style={styles.qActionText}>Preview</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.coverWrap, styles.skelBlock]} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skelLine, { width: "70%" }]} />
        <View style={[styles.skelLine, { width: "50%", marginTop: 8 }]} />
        <View style={[styles.skelLine, { width: "85%", marginTop: 10 }]} />
        <View style={[styles.skelLine, { width: "40%", marginTop: 10 }]} />
      </View>
    </View>
  );
}

export default function HostCars() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const refresh = String(params?.refresh || "");

  const [items, setItems] = useState<HostCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const limit = 20;

  // pagination safety (efficient + avoids stale closures)
  const offsetRef = useRef(0);
  const totalRef = useRef<number | null>(null);
  const fetchingRef = useRef(false);

  // UI state
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");

  const hasMore = useMemo(() => {
    const total = totalRef.current;
    if (total == null) return true;
    return items.length < total;
  }, [items.length]);

  const mergeUniqueById = useCallback((prev: HostCar[], next: HostCar[]) => {
    const seen = new Set(prev.map((x) => String(x.id)));
    const merged = [...prev];

    for (const c of next) {
      const id = String(c?.id || "");
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(c);
      }
    }
    return merged;
  }, []);

  const fetchPage = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const reset = !!opts.reset;

      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (reset) setRefreshing(true);
      else if (offsetRef.current === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const token = await getIdToken();
        const nextOffset = reset ? 0 : offsetRef.current;

        const res = await fetch(
          `${API_BASE}/api/host/cars?limit=${encodeURIComponent(
            String(limit)
          )}&offset=${encodeURIComponent(String(nextOffset))}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to load cars");

        const json = JSON.parse(text);
        const listRaw = Array.isArray(json?.items) ? json.items : [];
        const list: HostCar[] = listRaw.filter(Boolean);

        const pageTotal =
          typeof json?.page?.total === "number"
            ? json.page.total
            : Number.isFinite(Number(json?.page?.total))
            ? Number(json.page.total)
            : null;

        totalRef.current = pageTotal;

        if (reset) {
          setItems(list);
          offsetRef.current = list.length;
        } else {
          setItems((prev) => mergeUniqueById(prev, list));
          offsetRef.current = offsetRef.current + list.length;
        }
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [limit, mergeUniqueById]
  );

  useEffect(() => {
    fetchPage({ reset: true }).catch((e) => {
      console.warn("load cars failed", e?.message || e);
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    });
  }, [fetchPage]);

  // auto refresh when coming back from delete
  useEffect(() => {
    if (refresh === "1") {
      fetchPage({ reset: true }).catch((e) =>
        console.warn("refresh-after-delete failed", e?.message || e)
      );
      router.setParams({ refresh: "" });
    }
  }, [refresh, fetchPage, router]);

  const onRefresh = useCallback(() => {
    fetchPage({ reset: true }).catch((e) => {
      console.warn("refresh failed", e?.message || e);
      fetchingRef.current = false;
      setRefreshing(false);
    });
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (!hasMore) return;
    fetchPage({ reset: false }).catch((e) =>
      console.warn("load more failed", e?.message || e)
    );
  }, [fetchPage, hasMore, loading, refreshing, loadingMore]);

  const onPressCar = useCallback(
    (car: HostCar) => {
      router.push({
        pathname: "/(app)/host-car-details",
        params: { carId: car.id },
      });
    },
    [router]
  );

  const onEditCar = useCallback(
    (car: HostCar) => {
      router.push({
        pathname: "/(app)/host-car-details",
        params: { carId: car.id },
      });
    },
    [router]
  );

  const onAvailabilityCar = useCallback(
    (car: HostCar) => {
      // same screen for now; you can read this param and scroll to Availability later
      router.push({
        pathname: "/(app)/host-car-details",
        params: { carId: car.id, focus: "availability" },
      });
    },
    [router]
  );

  const onPreviewCar = useCallback(
    (car: HostCar) => {
      // placeholder route; adjust to your guest listing preview route when you have it
      router.push({
        pathname: "/(app)/host-car-details",
        params: { carId: car.id, focus: "preview" },
      });
    },
    [router]
  );

  const deleteCar = useCallback(
    (car: HostCar) => {
      Alert.alert(
        "Delete car?",
        "This will delete the car and remove its photos.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
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

                // refresh list
                fetchPage({ reset: true }).catch((e) =>
                  console.warn("refresh-after-delete failed", e?.message || e)
                );
              } catch (e: any) {
                Alert.alert(
                  "Delete failed",
                  e?.message || "Could not delete this car."
                );
              }
            },
          },
        ]
      );
    },
    [fetchPage]
  );

  const openSortPicker = useCallback(() => {
    Alert.alert("Sort", "Choose a sort order:", [
      {
        text: "Recently updated",
        onPress: () => setSortKey("updated"),
      },
      {
        text: "Price",
        onPress: () => setSortKey("price"),
      },
      {
        text: "Status",
        onPress: () => setSortKey("status"),
      },
      {
        text: "City",
        onPress: () => setSortKey("city"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  // Precompute derived fields once per items update (efficient)
  const derivedById = useMemo(() => {
    const out = new Map<
      string,
      {
        coverUrl: string;
        photoCount: number;
        statusNorm: "active" | "draft" | "other";
        updatedMs: number;
        updatedRel: string;
        completionPct: number;
        missing: string[];
        loc: string;
        price: string;
        metaBadges: string[];
      }
    >();

    for (const car of items) {
      const urls = getGalleryUrls(car);
      const coverUrl = urls[0] || "";
      const photoCount = urls.length;

      const statusNorm = normStatus(car.status);

      const updatedMs = parseDateMs(car.updated_at);
      const updatedRel = relativeTimeFromNow(updatedMs);

      const loc = [car?.area, car?.city, car?.country_code]
        .map((x) => (x ? String(x) : ""))
        .filter(Boolean)
        .join(", ");

      const price = money(car?.price_per_day, car?.currency || "CAD");

      const metaBadges = [
        car?.vehicle_type ? String(car.vehicle_type).toUpperCase() : "",
        car?.transmission ? String(car.transmission).toUpperCase() : "",
        car?.seats ? `${car.seats} seats` : "",
      ].filter(Boolean);

      const completion = computeCompletion(car, photoCount);

      out.set(String(car.id), {
        coverUrl,
        photoCount,
        statusNorm,
        updatedMs,
        updatedRel,
        completionPct: completion.pct,
        missing: completion.missing,
        loc,
        price,
        metaBadges,
      });
    }

    return out;
  }, [items]);

  // Summary counts
  const summary = useMemo(() => {
    let active = 0;
    let draft = 0;
    for (const c of items) {
      const s = normStatus(c.status);
      if (s === "active") active++;
      else if (s === "draft") draft++;
    }
    return { total: items.length, active, draft };
  }, [items]);

  // Filter + sort (local, efficient)
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = items;

    if (statusFilter !== "all") {
      list = list.filter((c) => normStatus(c.status) === statusFilter);
    }

    if (query) {
      list = list.filter((c) => {
        const title = String(c.title || "").toLowerCase();
        const city = String(c.city || "").toLowerCase();
        const area = String(c.area || "").toLowerCase();
        const cc = String(c.country_code || "").toLowerCase();
        return (
          title.includes(query) ||
          city.includes(query) ||
          area.includes(query) ||
          cc.includes(query)
        );
      });
    }

    // stable sort with tie-breaker by id
    const sorted = [...list].sort((a, b) => {
      const da = derivedById.get(String(a.id));
      const db = derivedById.get(String(b.id));

      if (sortKey === "updated") {
        const ta = da?.updatedMs || 0;
        const tb = db?.updatedMs || 0;
        if (tb !== ta) return tb - ta;
      } else if (sortKey === "price") {
        const pa = Number(a.price_per_day || 0);
        const pb = Number(b.price_per_day || 0);
        if (pb !== pa) return pb - pa;
      } else if (sortKey === "status") {
        const sa = normStatus(a.status);
        const sb = normStatus(b.status);
        // active first, then draft, then other
        const rank = (s: string) =>
          s === "active" ? 0 : s === "draft" ? 1 : 2;
        const ra = rank(sa);
        const rb = rank(sb);
        if (ra !== rb) return ra - rb;
      } else if (sortKey === "city") {
        const ca = String(a.city || "");
        const cb = String(b.city || "");
        const cmp = ca.localeCompare(cb);
        if (cmp !== 0) return cmp;
      }

      return String(a.id).localeCompare(String(b.id));
    });

    return sorted;
  }, [items, q, statusFilter, sortKey, derivedById]);

  const ListEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Feather name="truck" size={22} color="rgba(17,24,39,0.35)" />
        <Text style={styles.emptyTitle}>No cars yet</Text>
        <Text style={styles.emptySub}>
          Create your first car in onboarding, then it will appear here.
        </Text>

        <View style={{ height: 14 }} />

        <Pressable
          onPress={() => router.push("/host-onboarding-car")}
          style={({ pressed }) => [
            styles.emptyPrimaryBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="plus" size={16} color="#111827" />
          <Text style={styles.emptyPrimaryText}>Create a car</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert(
              "Checklist",
              "To publish faster: add photos, set price, and set availability."
            )
          }
          style={({ pressed }) => [
            styles.emptySecondaryBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="check-square" size={16} color="rgba(17,24,39,0.75)" />
          <Text style={styles.emptySecondaryText}>Learn what you need</Text>
        </Pressable>
      </View>
    );
  }, [loading, router]);

  const StickyHeader = useMemo(() => {
    return (
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>My Cars</Text>

          <Pressable
            onPress={() => router.push("/host-onboarding-car")}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
          >
            <Feather name="plus" size={16} color="#111827" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        <Text style={styles.summaryText}>
          {summary.total} cars • {summary.active} Active • {summary.draft} Draft
        </Text>

        <View style={styles.controlsRow}>
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color="rgba(17,24,39,0.45)" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search title or city"
              placeholderTextColor="rgba(17,24,39,0.35)"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {!!q && (
              <Pressable
                onPress={() => setQ("")}
                style={({ pressed }) => [
                  styles.clearX,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Feather name="x" size={14} color="rgba(17,24,39,0.55)" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={openSortPicker}
            style={({ pressed }) => [
              styles.sortBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Feather name="sliders" size={16} color="rgba(17,24,39,0.85)" />
            <Text style={styles.sortText}>
              {sortKey === "updated"
                ? "Updated"
                : sortKey === "price"
                ? "Price"
                : sortKey === "status"
                ? "Status"
                : "City"}
            </Text>
          </Pressable>
        </View>

        {/* segmented filter */}
        <View style={styles.segmentRow}>
          {(["all", "active", "draft"] as StatusFilter[]).map((k) => {
            const on = statusFilter === k;
            const label =
              k === "all" ? "All" : k === "active" ? "Active" : "Draft";
            return (
              <Pressable
                key={k}
                onPress={() => setStatusFilter(k)}
                style={({ pressed }) => [
                  styles.segmentPill,
                  on ? styles.segmentPillOn : styles.segmentPillOff,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text
                  style={[styles.segmentText, on ? styles.segmentTextOn : null]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Your listings</Text>
      </View>
    );
  }, [router, summary, q, sortKey, statusFilter, openSortPicker]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {loading ? (
        <View style={styles.listWrap}>
          {StickyHeader}
          <View style={styles.listContent}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <FlatList
            data={filtered}
            keyExtractor={(x) => String(x.id)}
            renderItem={({ item }) => {
              const d = derivedById.get(String(item.id));
              if (!d) return null;

              return (
                <CarCard
                  car={item}
                  derived={d}
                  onPress={onPressCar}
                  onEdit={onEditCar}
                  onAvailability={onAvailabilityCar}
                  onPreview={onPreviewCar}
                  onDelete={deleteCar}
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={StickyHeader}
            stickyHeaderIndices={[0]}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 14 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={{ height: 70 }} />
              )
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={8}
            windowSize={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
          />

          {/* optional floating add button */}
          <Pressable
            onPress={() => router.push("/host-onboarding-car")}
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="Add car"
          >
            <Feather name="plus" size={18} color="#111827" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  listWrap: { flex: 1 },

  stickyHeader: {
    backgroundColor: "#F6F7FB",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  h1: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  addBtn: {
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

  addBtnText: { fontSize: 12, fontWeight: "900", color: "#111827" },

  summaryText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  sectionLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },

  controlsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },

  clearX: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  sortBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sortText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.85)",
  },

  segmentRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },

  segmentPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentPillOn: {
    backgroundColor: "rgba(17,24,39,0.10)",
    borderColor: "rgba(17,24,39,0.16)",
  },

  segmentPillOff: {
    backgroundColor: "rgba(17,24,39,0.05)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  segmentText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  segmentTextOn: {
    color: "#111827",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 120, // extra so cards never touch the tab bar
  },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },

  // cover larger + premium
  coverWrap: {
    width: 104,
    height: 104,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  cover: { width: "100%", height: "100%" },

  coverOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    backgroundColor: "rgba(17,24,39,0.06)",
  },

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

  photoCountBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  photoCountText: { fontSize: 12, fontWeight: "900", color: "#111827" },

  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },

  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusPillNeutral: {
    backgroundColor: "rgba(17,24,39,0.06)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  statusPillActive: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.30)",
  },

  statusPillDraft: {
    backgroundColor: "rgba(245,158,11,0.14)",
    borderColor: "rgba(245,158,11,0.30)",
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

  statusTextDraft: {
    color: "rgba(146,64,14,0.95)",
  },

  badgesRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeNeutral: {
    backgroundColor: "rgba(17,24,39,0.05)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  badgeMuted: {
    backgroundColor: "rgba(17,24,39,0.04)",
    borderColor: "rgba(17,24,39,0.08)",
  },

  badgeGreen: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.20)",
  },

  badgeAmber: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.22)",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  badgeTextGreen: {
    color: "rgba(6,95,70,0.95)",
  },

  badgeTextAmber: {
    color: "rgba(146,64,14,0.95)",
  },

  loc: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  infoRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  missingText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(185, 28, 28, 0.70)",
  },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  price: { fontSize: 13, fontWeight: "900", color: "rgba(17,24,39,0.90)" },

  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  updatedText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.35)",
  },

  quickActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },

  qActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  qActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.85)",
  },

  // swipe areas
  swipeLeftWrap: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 18,
    backgroundColor: "#F6F7FB",
  },

  swipeRightWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 18,
    backgroundColor: "#F6F7FB",
  },

  swipePill: {
    minWidth: 120,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  swipePillNeutral: {
    backgroundColor: "rgba(17,24,39,0.06)",
    borderColor: "rgba(17,24,39,0.12)",
  },

  swipePillDanger: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.22)",
  },

  swipePillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  // skeleton
  skelBlock: {
    backgroundColor: "rgba(17,24,39,0.06)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  skelLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
  },

  // empty state
  empty: {
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyTitle: { fontSize: 14, fontWeight: "900", color: "rgba(17,24,39,0.70)" },

  emptySub: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
    maxWidth: 280,
  },

  emptyPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
  },

  emptyPrimaryText: { fontSize: 13, fontWeight: "900", color: "#111827" },

  emptySecondaryBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  emptySecondaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  // floating add button (subtle)
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
});
