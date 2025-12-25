// app/host-onboarding-publish.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { setHost } from "@/redux/slices/hostSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

async function getIdToken() {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error("Missing auth token");
  return token;
}

// NOTE: your backend currently does NOT have GET /api/host/cars/:id
// so we fetch list + find by id (works today). Later you can replace
// this with a proper GET /api/host/cars/:id route without changing UI.
async function fetchHostCarById(carId: string) {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}/api/host/cars?limit=50&offset=0`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to load cars");

  const json = JSON.parse(text);
  const items = Array.isArray(json?.items) ? json.items : [];
  const found = items.find((c: any) => String(c?.id) === String(carId));
  if (!found) throw new Error("Car not found");
  return found;
}

async function publishCar(carId: string) {
  const token = await getIdToken();
  const res = await fetch(
    `${API_BASE}/api/host/cars/${encodeURIComponent(carId)}/publish`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to publish car");

  return JSON.parse(text);
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

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function normalizeGalleryUrls(car: any): string[] {
  const g = Array.isArray(car?.image_gallery) ? car.image_gallery : [];
  const urls = g
    .map((x: any) => (typeof x === "string" ? x : x?.url))
    .filter(Boolean)
    .map((x: any) => String(x).trim())
    .filter(Boolean);

  // add fallback image_path only if it looks usable
  const p = String(car?.image_path || "").trim();
  if (p && !p.startsWith("draft/")) {
    if (isHttpUrl(p)) urls.push(p);
    else if (p.startsWith("cars/"))
      urls.push(`https://storage.googleapis.com/zipo-car-photos-ca/${p}`);
  }

  // de-dupe preserve order
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function DotPager({ total, index }: { total: number; index: number }) {
  if (total <= 1) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
        />
      ))}
    </View>
  );
}

function Pill({
  icon,
  text,
  tone = "neutral",
}: {
  icon?: keyof typeof Feather.glyphMap;
  text: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const box =
    tone === "good"
      ? styles.pillGood
      : tone === "warn"
      ? styles.pillWarn
      : styles.pillNeutral;

  const txt =
    tone === "good"
      ? styles.pillTextGood
      : tone === "warn"
      ? styles.pillTextWarn
      : styles.pillTextNeutral;

  return (
    <View style={[styles.pill, box]}>
      {icon ? (
        <Feather
          name={icon}
          size={13}
          color={(txt as any)?.color ?? "#111827"}
        />
      ) : null}
      <Text style={[styles.pillText, txt]}>{text}</Text>
    </View>
  );
}

export default function HostOnboardingPublishScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ carId?: string }>();
  const carId = useMemo(() => String(params?.carId || "").trim(), [params]);

  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // swipe gallery
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryRef = useRef<RNScrollView>(null);

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
  const GUTTER = 18;
  const HERO_W = SCREEN_W - GUTTER * 2;
  const HERO_H = Math.min(460, Math.round(SCREEN_H * 0.48)); // big modern hero

  const gallery: string[] = useMemo(() => normalizeGalleryUrls(car), [car]);
  const coverUrl = gallery[0] || "";

  const readyIssues = useMemo(() => {
    const issues: string[] = [];
    if (!car) return issues;

    if (!car.title) issues.push("Missing title");
    if (!car.vehicle_type) issues.push("Missing vehicle type");
    if (!car.transmission) issues.push("Missing transmission");
    if (!Number.isFinite(Number(car.seats))) issues.push("Missing seats");
    if (!Number.isFinite(Number(car.price_per_day)))
      issues.push("Missing price");
    if (!car.country_code) issues.push("Missing country");
    if (!car.city) issues.push("Missing city");
    if (!car.area) issues.push("Missing area");
    if (!gallery.length) issues.push("Add at least one photo");

    return issues;
  }, [car, gallery.length]);

  const canPublish = !!car && readyIssues.length === 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!carId) return;
        setLoading(true);
        const c = await fetchHostCarById(carId);
        if (!mounted) return;
        setCar(c);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to load car");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [carId]);

  const handlePublish = async () => {
    try {
      if (!canPublish) {
        Alert.alert("Not ready", readyIssues.join("\n"));
        return;
      }

      setPublishing(true);
      const { host } = await publishCar(carId);
      if (host) dispatch(setHost(host));

      router.replace("/(hosttabs)/hub");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleEdit = () => {
    // future-proof: we can add edit sections later
    Alert.alert("Coming soon", "Edit flow will be added here.");
  };

  const statusTone: "good" | "warn" = canPublish ? "good" : "warn";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Nav */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#0F172A" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>Review & publish</Text>
              <Text style={styles.topSub}>
                Make sure everything looks right before going live.
              </Text>
            </View>

            <Pressable
              onPress={handleEdit}
              style={({ pressed }) => [
                styles.editBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit"
            >
              <Feather name="edit-3" size={16} color="#0F172A" />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>

          {/* Big hero card (image swipe) */}
          <View style={[styles.heroCard, { width: HERO_W }]}>
            <View style={[styles.heroMedia, { height: HERO_H }]}>
              {loading ? (
                <View style={styles.heroLoading}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.heroLoadingText}>Loading draft…</Text>
                </View>
              ) : gallery.length ? (
                <>
                  <ScrollView
                    ref={galleryRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(x / HERO_W);
                      if (idx !== activeIndex) setActiveIndex(idx);
                    }}
                    scrollEventThrottle={16}
                  >
                    {gallery.map((u, idx) => (
                      <View
                        key={`${u}-${idx}`}
                        style={{ width: HERO_W, height: HERO_H }}
                      >
                        <Image
                          source={{ uri: u }}
                          style={styles.heroImg}
                          resizeMode="cover"
                        />
                        {/* subtle bottom fade overlay */}
                        <View style={styles.heroFade} />
                      </View>
                    ))}
                  </ScrollView>

                  <DotPager total={gallery.length} index={activeIndex} />

                  {/* floating pill */}
                  <View style={styles.heroPillsRow}>
                    <Pill
                      icon={statusTone === "good" ? "check" : "alert-circle"}
                      text={canPublish ? "Ready to publish" : "Needs updates"}
                      tone={statusTone}
                    />
                    {gallery.length > 1 ? (
                      <Pill
                        icon="image"
                        text={`${activeIndex + 1}/${gallery.length}`}
                      />
                    ) : (
                      <Pill icon="image" text="1 photo" />
                    )}
                  </View>
                </>
              ) : coverUrl ? (
                <>
                  <Image
                    source={{ uri: coverUrl }}
                    style={styles.heroImg}
                    resizeMode="cover"
                  />
                  <View style={styles.heroFade} />
                  <View style={styles.heroPillsRow}>
                    <Pill icon="alert-circle" text="Add photos" tone="warn" />
                  </View>
                </>
              ) : (
                <View style={styles.heroEmpty}>
                  <Feather name="image" size={22} color="rgba(15,23,42,0.35)" />
                  <Text style={styles.heroEmptyTitle}>No photos yet</Text>
                  <Text style={styles.heroEmptySub}>
                    Upload at least one photo to publish.
                  </Text>
                </View>
              )}
            </View>

            {/* Hero details overlay card */}
            <View style={styles.heroInfo}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.carTitle} numberOfLines={2}>
                  {car?.title || (loading ? " " : "Untitled")}
                </Text>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={styles.chip}>
                    <Feather
                      name="shield"
                      size={12}
                      color="rgba(15,23,42,0.65)"
                    />
                    <Text style={styles.chipText}>
                      {String(car?.status || "draft").replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.carMeta} numberOfLines={2}>
                {[
                  car?.vehicle_type ? String(car.vehicle_type) : "",
                  car?.transmission ? String(car.transmission) : "",
                  Number.isFinite(Number(car?.seats))
                    ? `${car.seats} seats`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>

              <Text style={styles.carLoc} numberOfLines={2}>
                {[
                  car?.area ? String(car.area) : "",
                  car?.city ? String(car.city) : "",
                  car?.country_code ? String(car.country_code) : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>

              <View style={styles.heroBottomRow}>
                <View>
                  <Text style={styles.priceLabel}>Daily price</Text>
                  <Text style={styles.priceText}>
                    {money(car?.price_per_day, car?.currency || "CAD")}{" "}
                    <Text style={styles.priceUnit}>/ day</Text>
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    if (!readyIssues.length) {
                      Alert.alert("All good", "Your draft looks ready.");
                      return;
                    }
                    Alert.alert("To publish, fix:", readyIssues.join("\n"));
                  }}
                  style={({ pressed }) => [
                    styles.issueBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                >
                  <Feather
                    name={
                      readyIssues.length ? "alert-triangle" : "check-circle"
                    }
                    size={16}
                    color={readyIssues.length ? "#92400E" : "#0F172A"}
                  />
                  <Text
                    style={[
                      styles.issueBtnText,
                      readyIssues.length ? { color: "#92400E" } : {},
                    ]}
                  >
                    {readyIssues.length
                      ? `${readyIssues.length} issue(s)`
                      : "No issues"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Future-proof sections placeholder */}
          <View style={{ height: 14 }} />

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Next</Text>
              <Text style={styles.sectionSub}>
                We’ll add more review modules here (pricing rules, features,
                pickup details, requirements).
              </Text>
            </View>

            <View style={styles.todoRow}>
              <Feather name="check" size={14} color="rgba(15,23,42,0.55)" />
              <Text style={styles.todoText}>Basic info</Text>
              <Text style={styles.todoRight}>
                {car?.title ? "Done" : "Missing"}
              </Text>
            </View>

            <View style={styles.todoRow}>
              <Feather name="check" size={14} color="rgba(15,23,42,0.55)" />
              <Text style={styles.todoText}>Photos</Text>
              <Text style={styles.todoRight}>
                {gallery.length ? `${gallery.length} added` : "Missing"}
              </Text>
            </View>

            <View style={styles.todoRow}>
              <Feather name="clock" size={14} color="rgba(15,23,42,0.55)" />
              <Text style={styles.todoText}>Pickup details</Text>
              <Text style={styles.todoRight}>Coming soon</Text>
            </View>
          </View>

          <View style={{ height: 14 }} />

          {/* Publish CTA */}
          <Button
            title="Publish car"
            onPress={handlePublish}
            variant="primary"
            size="lg"
            disabled={!canPublish || publishing}
            isLoading={publishing}
          />

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backLink,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BG = "#F6F7FB";
const INK = "#0F172A";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },

  topTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.1,
  },

  topSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.55)",
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  editBtnText: { fontSize: 12, fontWeight: "900", color: INK },

  // Hero
  heroCard: {
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },

  heroMedia: {
    width: "100%",
    backgroundColor: "rgba(15,23,42,0.04)",
    position: "relative",
  },

  heroImg: { width: "100%", height: "100%" },

  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: "rgba(0,0,0,0.0)",
    // cheap “fade”: overlay with semi-transparent black at bottom
    // (no gradients without extra deps)
    opacity: 1,
  },

  heroPillsRow: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heroLoadingText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(15,23,42,0.55)",
  },

  heroEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  heroEmptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(15,23,42,0.70)",
  },
  heroEmptySub: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.45)",
    lineHeight: 16,
    maxWidth: 280,
  },

  // Dots
  dots: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  dotActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  dotIdle: { backgroundColor: "rgba(255,255,255,0.45)" },

  // Hero info
  heroInfo: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)",
  },

  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  carTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.2,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(15,23,42,0.70)",
    textTransform: "capitalize",
  },

  carMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.60)",
  },

  carLoc: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.45)",
  },

  heroBottomRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  priceLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(15,23,42,0.45)",
  },

  priceText: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.2,
  },

  priceUnit: { fontSize: 12, fontWeight: "900", color: "rgba(15,23,42,0.55)" },

  issueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.18)",
  },
  issueBtnText: { fontSize: 12, fontWeight: "900", color: "#92400E" },

  // Pills
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "900" },

  pillNeutral: {
    backgroundColor: "rgba(255,255,255,0.90)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  pillTextNeutral: { color: "rgba(15,23,42,0.85)" },

  pillGood: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.20)",
  },
  pillTextGood: { color: "rgba(15,23,42,0.90)" },

  pillWarn: {
    backgroundColor: "rgba(245,158,11,0.14)",
    borderColor: "rgba(245,158,11,0.22)",
  },
  pillTextWarn: { color: "rgba(15,23,42,0.88)" },

  // Future-proof section card
  sectionCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
  },

  sectionHeader: { gap: 6, marginBottom: 6 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.1,
  },

  sectionSub: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.45)",
    lineHeight: 16,
  },

  todoRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  todoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(15,23,42,0.70)",
  },

  todoRight: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(15,23,42,0.45)",
  },

  // Back
  backLink: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(15,23,42,0.55)",
  },
});
