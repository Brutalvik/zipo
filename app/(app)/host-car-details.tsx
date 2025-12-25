import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function HostCarDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const carId = String(params?.carId || "").trim();

  const [car, setCar] = useState<HostCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const cover = useMemo(() => (car ? getCoverUrl(car) : ""), [car]);
  const gallery = useMemo(() => (car ? getGalleryUrls(car) : []), [car]);

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
      setCar(json?.car ?? null);
    } finally {
      setLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    loadCar().catch((e) => {
      console.warn("load car failed", e?.message || e);
      setLoading(false);
    });
  }, [loadCar]);

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
              console.warn("delete failed", e?.message || e);
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
          onPress={() => router.back()}
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
          disabled={deleting || loading}
          style={({ pressed }) => [
            styles.deleteBtn,
            (deleting || loading) && { opacity: 0.6 },
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

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{statusLabel(car.status)}</Text>
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

  statusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
    textTransform: "capitalize",
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
});
