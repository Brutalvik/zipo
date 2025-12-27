// app/(hosttabs)/hub.tsx
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
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchHostMe } from "@/redux/thunks/hostThunk";
import { auth } from "@/services/firebase";
import { normStatus } from "@/app/(hosttabs)/helpers";

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
};

type CarsPageResponse = {
  items?: HostCar[];
  page?: { total?: number };
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
    else if (imagePath.startsWith("cars/"))
      urls.push(
        `https://storage.googleapis.com/zipo-car-photos-ca/${imagePath}`
      );
  }

  return Array.from(new Set(urls));
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

// Completion score for “Needs attention” + per-car snapshot
function computeCompletion(car: HostCar, photoCount: number) {
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

function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "green" | "amber" | "red" | "muted";
  icon?: keyof typeof Feather.glyphMap;
}) {
  const toneStyle =
    tone === "green"
      ? styles.pillGreen
      : tone === "amber"
      ? styles.pillAmber
      : tone === "red"
      ? styles.pillRed
      : tone === "muted"
      ? styles.pillMuted
      : styles.pillNeutral;

  const textStyle =
    tone === "green"
      ? styles.pillTextGreen
      : tone === "amber"
      ? styles.pillTextAmber
      : tone === "red"
      ? styles.pillTextRed
      : styles.pillText;

  return (
    <View style={[styles.pill, toneStyle]}>
      {icon ? (
        <Feather
          name={icon}
          size={13}
          color={tone === "red" ? "#991B1B" : "rgba(17,24,39,0.75)"}
        />
      ) : null}
      <Text style={[styles.pillText, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? right : null}
    </View>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
}) {
  const Comp: any = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.statCard,
        onPress ? styles.statCardPressable : null,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={styles.statIcon}>
        <Feather name={icon} size={16} color="rgba(17,24,39,0.75)" />
      </View>

      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Comp>
  );
}

function ActionTile({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.actionIcon}>
        <Feather name={icon} size={16} color="rgba(17,24,39,0.85)" />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function AttentionRow({
  title,
  subtitle,
  icon,
  tone = "amber",
  cta,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  tone?: "amber" | "red" | "muted" | "green";
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.attnRow,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={styles.attnLeft}>
        <View style={styles.attnIcon}>
          <Feather name={icon} size={16} color="rgba(17,24,39,0.75)" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.attnTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.attnSub} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.attnRight}>
        <Pill
          label={cta}
          tone={tone === "red" ? "red" : tone === "green" ? "green" : "amber"}
        />
        <Feather name="chevron-right" size={18} color="rgba(17,24,39,0.35)" />
      </View>
    </Pressable>
  );
}

function CarMiniRow({
  car,
  derived,
  onPress,
}: {
  car: HostCar;
  derived: {
    status: "active" | "inactive" | "draft" | "other";
    updatedRel: string;
    completionPct: number;
    photoCount: number;
    missing: string[];
  };
  onPress: () => void;
}) {
  const title = String(car?.title || "Untitled");
  const s = derived.status;

  const statusTone =
    s === "active"
      ? "green"
      : s === "draft"
      ? "amber"
      : s === "inactive"
      ? "red"
      : "muted";
  const statusLabel =
    s === "active"
      ? "Active"
      : s === "draft"
      ? "Draft"
      : s === "inactive"
      ? "Inactive"
      : "Other";

  const missingShort =
    derived.missing.length === 0
      ? ""
      : derived.missing.slice(0, 2).join(", ") +
        (derived.missing.length > 2 ? "…" : "");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.carMiniRow,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.carMiniTop}>
          <Text style={styles.carMiniTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pill label={statusLabel} tone={statusTone as any} />
        </View>

        <View style={styles.carMiniMetaRow}>
          <Pill label={`Complete ${derived.completionPct}%`} tone="muted" />
          <Pill
            label={`Photos ${derived.photoCount}`}
            tone="muted"
            icon="camera"
          />
          {derived.updatedRel ? (
            <Pill
              label={`Updated ${derived.updatedRel}`}
              tone="muted"
              icon="clock"
            />
          ) : null}
        </View>

        {missingShort ? (
          <Text style={styles.carMiniMissing} numberOfLines={1}>
            Missing: {missingShort}
          </Text>
        ) : null}
      </View>

      <Feather name="chevron-right" size={18} color="rgba(17,24,39,0.35)" />
    </Pressable>
  );
}

export default function HostHubScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const user = useAppSelector((s) => s.auth.user);
  const hostState = useAppSelector((s: any) => s.host); // keep flexible
  const host = hostState?.host ?? null;
  const hostLoading = hostState?.loading ?? false;

  const [cars, setCars] = useState<HostCar[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Keep request safe (avoid double fetch / stale)
  const fetchingCarsRef = useRef(false);

  useEffect(() => {
    // If user is not in host mode, don't allow host tabs
    if (user?.mode !== "host") {
      router.replace("/(app)");
      return;
    }
    dispatch(fetchHostMe() as any);
  }, [dispatch, router, user?.mode]);

  useEffect(() => {
    if (hostLoading) return;

    // No host row yet -> send to host-program
    if (!host) {
      router.replace("/(app)/host-program");
      return;
    }

    // Host exists but draft -> send to onboarding
    if (host?.status === "draft") {
      router.replace("/(app)/host-onboarding");
      return;
    }

    // Otherwise stay on hub
  }, [host, hostLoading, router]);

  const fetchCars = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (fetchingCarsRef.current) return;
    fetchingCarsRef.current = true;

    const silent = !!opts.silent;
    if (!silent) setCarsLoading(true);

    try {
      const token = await getIdToken();

      // We only need enough to build dashboard signals.
      // If you can add a /api/host/cars/summary endpoint later, we’ll switch to that.
      const limit = 100;
      const res = await fetch(
        `${API_BASE}/api/host/cars?limit=${encodeURIComponent(
          String(limit)
        )}&offset=0`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to load cars");

      const json = JSON.parse(text) as CarsPageResponse;
      const listRaw = Array.isArray(json?.items) ? json.items : [];
      const list: HostCar[] = listRaw.filter(Boolean);

      setCars(list);
    } finally {
      fetchingCarsRef.current = false;
      setCarsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch cars once host is confirmed active/approved
    if (hostLoading) return;
    if (!host) return;
    if (host?.status === "draft") return;

    fetchCars({ silent: true }).catch((e) =>
      console.warn("hub cars fetch failed", e?.message || e)
    );
  }, [fetchCars, host, hostLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCars().catch((e) => {
      console.warn("hub refresh failed", e?.message || e);
      setRefreshing(false);
    });
  }, [fetchCars]);

  // Derived stats + “needs attention”
  const derived = useMemo(() => {
    let active = 0;
    let draft = 0;

    // Attention signals
    let missingPhotos = 0;
    let missingPrice = 0;
    let incompleteListings = 0;

    // Car snapshot (top by updated)

    const enriched = cars.map((c) => {
      const urls = getGalleryUrls(c);
      const photoCount = urls.length;
      const completion = computeCompletion(c, photoCount);
      const st = normStatus(c.status);
      const updatedMs = parseDateMs(c.updated_at);
      const updatedRel = relativeTimeFromNow(updatedMs);

      if (st === "active") active++;
      else if (st === "draft") draft++;

      if (photoCount === 0) missingPhotos++;
      if (Number(c.price_per_day || 0) <= 0) missingPrice++;
      if (completion.pct < 90) incompleteListings++;
      return {
        car: c,
        status: st,
        updatedMs,
        updatedRel,
        completionPct: completion.pct,
        missing: completion.missing,
        photoCount,
      };
    });

    enriched.sort((a, b) => b.updatedMs - a.updatedMs);

    const top = enriched.slice(0, 3);

    return {
      counts: { total: cars.length, active, draft },
      attention: { missingPhotos, missingPrice, incompleteListings },
      topCars: top,
    };
  }, [cars]);

  const attentionItems = useMemo(() => {
    const out: Array<{
      key: string;
      title: string;
      subtitle: string;
      icon: keyof typeof Feather.glyphMap;
      tone: "amber" | "red" | "muted" | "green";
      cta: string;
      action: () => void;
    }> = [];

    if (derived.attention.missingPhotos > 0) {
      out.push({
        key: "photos",
        title: "Add photos to your listings",
        subtitle: `${derived.attention.missingPhotos} car(s) have no photos. Listings with photos convert better.`,
        icon: "camera",
        tone: "amber",
        cta: "Fix",
        action: () => router.push("/(hosttabs)/cars"),
      });
    }

    if (derived.attention.missingPrice > 0) {
      out.push({
        key: "price",
        title: "Set your daily price",
        subtitle: `${derived.attention.missingPrice} car(s) are missing a price.`,
        icon: "dollar-sign",
        tone: "amber",
        cta: "Fix",
        action: () => router.push("/(hosttabs)/cars"),
      });
    }

    if (derived.counts.draft > 0) {
      out.push({
        key: "drafts",
        title: "Publish your drafts",
        subtitle: `${derived.counts.draft} draft listing(s) are not visible to guests yet.`,
        icon: "upload",
        tone: "amber",
        cta: "Review",
        action: () => router.push("/(hosttabs)/cars"),
      });
    }

    // Availability is not in cars list response currently, so we keep it helpful but honest.
    out.push({
      key: "availability",
      title: "Set availability",
      subtitle:
        "Block out unavailable dates to avoid cancellations. (Availability data will show here once enabled.)",
      icon: "calendar",
      tone: "muted",
      cta: "Open",
      action: () => router.push("/(hosttabs)/cars"),
    });

    return out;
  }, [derived, router]);

  const tips = useMemo(() => {
    const pool = [
      "Hosts with 8+ photos usually get more bookings.",
      "Keep weekends open to increase your booking chances.",
      "Update availability often to avoid last-minute conflicts.",
      "A clear title and location helps guests trust your listing.",
    ];

    // deterministic pick based on day
    const idx = new Date().getDate() % pool.length;
    return pool[idx];
  }, []);

  const goCars = useCallback(() => router.push("/(hosttabs)/cars"), [router]);
  const goAddCar = useCallback(
    () => router.push("/host-onboarding-car"),
    [router]
  );

  const goAvailability = useCallback(() => {
    // For now, route to cars list (later to a dedicated availability manager)
    router.push("/(hosttabs)/cars");
  }, [router]);

  const goPricing = useCallback(() => {
    Alert.alert(
      "Pricing",
      "Pricing tools will live here soon. For now, edit a car to update its price."
    );
    router.push("/(hosttabs)/cars");
  }, [router]);

  const goPhotos = useCallback(() => {
    Alert.alert(
      "Photos",
      "For now, open a car and upload photos in its details screen."
    );
    router.push("/(hosttabs)/cars");
  }, [router]);

  const goEarnings = useCallback(() => {
    Alert.alert(
      "Earnings",
      "Earnings and payouts will show here once payouts are enabled."
    );
  }, []);

  const goSupport = useCallback(() => {
    Alert.alert("Support", "Support center coming soon.");
  }, []);

  if (hostLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // If host is null or draft, router will replace — but render something safe anyway
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Hub</Text>
            <Text style={styles.hSub}>Host Command Center</Text>
          </View>

          <Pressable
            onPress={goAddCar}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Feather name="plus" size={16} color="#111827" />
            <Text style={styles.addBtnText}>Add car</Text>
          </Pressable>
        </View>

        {/* Month summary */}
        <SectionHeader
          title="This month"
          right={
            <Pressable
              onPress={goEarnings}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.linkText}>Details</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="rgba(17,24,39,0.35)"
              />
            </Pressable>
          }
        />

        <View style={styles.statsGrid}>
          <StatCard
            label="Earnings"
            value="—"
            sub="Payouts coming soon"
            icon="credit-card"
            onPress={goEarnings}
          />
          <StatCard
            label="Trips"
            value="—"
            sub="Bookings coming soon"
            icon="map"
            onPress={() =>
              Alert.alert(
                "Trips",
                "Trips will show here when bookings are enabled."
              )
            }
          />
          <StatCard
            label="Cars"
            value={String(derived.counts.total)}
            sub={`${derived.counts.active} Active • ${derived.counts.draft} Draft`}
            icon="truck"
            onPress={goCars}
          />
          <StatCard
            label="Utilization"
            value="—"
            sub="Needs bookings data"
            icon="bar-chart-2"
            onPress={() =>
              Alert.alert(
                "Utilization",
                "Utilization will calculate once bookings are enabled."
              )
            }
          />
        </View>

        {/* Needs attention */}
        <SectionHeader title="Needs attention" />
        <View style={styles.sectionCard}>
          {carsLoading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : attentionItems.length ? (
            attentionItems.map((it, idx) => (
              <View key={it.key}>
                <AttentionRow
                  title={it.title}
                  subtitle={it.subtitle}
                  icon={it.icon}
                  tone={it.tone}
                  cta={it.cta}
                  onPress={it.action}
                />
                {idx !== attentionItems.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))
          ) : (
            <View style={{ paddingTop: 10 }}>
              <Pill label="All good" tone="green" icon="check-circle" />
              <Text style={styles.note}>
                You have no critical items right now.
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming activity */}
        <SectionHeader title="Upcoming activity" />
        <View style={styles.sectionCard}>
          <View style={styles.emptyTrips}>
            <Feather name="calendar" size={18} color="rgba(17,24,39,0.35)" />
            <Text style={styles.emptyTitle}>No upcoming trips</Text>
            <Text style={styles.emptySub}>
              Bookings will appear here once the booking system is enabled.
            </Text>
          </View>
        </View>

        {/* Your cars snapshot */}
        <SectionHeader
          title="Your cars"
          right={
            <Pressable
              onPress={goCars}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.linkText}>View all</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="rgba(17,24,39,0.35)"
              />
            </Pressable>
          }
        />

        <View style={styles.sectionCard}>
          {carsLoading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : derived.topCars.length ? (
            derived.topCars.map((x, idx) => (
              <View key={String(x.car.id)}>
                <CarMiniRow
                  car={x.car}
                  derived={{
                    status: x.status,
                    updatedRel: x.updatedRel,
                    completionPct: x.completionPct,
                    photoCount: x.photoCount,
                    missing: x.missing,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/host-car-details",
                      params: { carId: x.car.id },
                    })
                  }
                />
                {idx !== derived.topCars.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCars}>
              <Feather name="truck" size={18} color="rgba(17,24,39,0.35)" />
              <Text style={styles.emptyTitle}>No cars yet</Text>
              <Text style={styles.emptySub}>
                Create your first car, then it will show up here.
              </Text>

              <Pressable
                onPress={goAddCar}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Feather name="plus" size={16} color="#111827" />
                <Text style={styles.primaryText}>Create a car</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Quick actions (1 to 6 requirement) */}
        <SectionHeader title="Quick actions" />
        <View style={styles.actionsGrid}>
          <ActionTile label="Add car" icon="plus" onPress={goAddCar} />
          <ActionTile
            label="Set availability"
            icon="calendar"
            onPress={goAvailability}
          />
          <ActionTile
            label="Update pricing"
            icon="dollar-sign"
            onPress={goPricing}
          />
          <ActionTile label="Upload photos" icon="camera" onPress={goPhotos} />
          <ActionTile
            label="View earnings"
            icon="credit-card"
            onPress={goEarnings}
          />
          <ActionTile label="Support" icon="help-circle" onPress={goSupport} />
        </View>

        {/* Tips (simple + dismissible later) */}
        <SectionHeader title="Tip" />
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Feather name="zap" size={16} color="rgba(17,24,39,0.75)" />
          </View>
          <Text style={styles.tipText}>{tips}</Text>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  h1: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  hSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
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

  sectionHeaderRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6 },

  linkText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  // Stats grid
  statsGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statCard: {
    width: "48.7%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  statCardPressable: {},

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  statLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
  },

  statSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
  },

  // Cards
  sectionCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.06)",
    marginVertical: 10,
  },

  // Pills
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },

  pillNeutral: {
    backgroundColor: "rgba(17,24,39,0.05)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  pillMuted: {
    backgroundColor: "rgba(17,24,39,0.04)",
    borderColor: "rgba(17,24,39,0.08)",
  },

  pillGreen: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.20)",
  },

  pillAmber: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.22)",
  },

  pillRed: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.22)",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  pillTextGreen: { color: "rgba(6,95,70,0.95)" },
  pillTextAmber: { color: "rgba(146,64,14,0.95)" },
  pillTextRed: { color: "#991B1B" },

  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 16,
  },

  // Attention rows
  attnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  attnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  attnIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  attnTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  attnSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 16,
  },

  attnRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Upcoming activity empty
  emptyTrips: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  // Cars snapshot
  carMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  carMiniTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  carMiniTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  carMiniMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  carMiniMissing: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(185, 28, 28, 0.70)",
  },

  // Empty cars
  emptyCars: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },

  emptySub: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
    maxWidth: 300,
  },

  primaryBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
  },

  primaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  // Actions grid
  actionsGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionTile: {
    width: "48.7%",
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  // Tip
  tipCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  tipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
    lineHeight: 16,
  },
});
