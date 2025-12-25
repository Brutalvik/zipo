import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
  has_image?: boolean | null;
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
    else if (imagePath.startsWith("cars/"))
      urls.push(
        `https://storage.googleapis.com/zipo-car-photos-ca/${imagePath}`
      );
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

function CarCover({
  url,
  size = 92,
  borderRadius = 18,
  emptyLabel = "No photo",
}: {
  url: string;
  size?: number;
  borderRadius?: number;
  emptyLabel?: string;
}) {
  return (
    <View
      style={[
        styles.coverWrap,
        { width: size, height: size, borderRadius: borderRadius },
      ]}
    >
      {url ? (
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
      ) : (
        <View style={styles.coverEmpty}>
          <Feather name="image" size={18} color="rgba(17,24,39,0.35)" />
          <Text style={styles.coverEmptyText}>{emptyLabel}</Text>
        </View>
      )}
    </View>
  );
}

function CarCard({
  car,
  onPress,
}: {
  car: HostCar;
  onPress: (car: HostCar) => void;
}) {
  const cover = getCoverUrl(car);

  const title = String(car?.title || "Untitled");
  const loc = [car?.area, car?.city, car?.country_code]
    .map((x) => (x ? String(x) : ""))
    .filter(Boolean)
    .join(", ");

  const meta = [
    car?.vehicle_type ? String(car.vehicle_type).toUpperCase() : "",
    car?.transmission ? String(car.transmission).toUpperCase() : "",
    car?.seats ? `${car.seats} seats` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const price = money(car?.price_per_day, car?.currency || "CAD");
  const status = statusLabel(car?.status);

  return (
    <Pressable
      onPress={() => onPress(car)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
    >
      <CarCover url={cover} />

      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {!!meta && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}

        {!!loc && (
          <Text style={styles.loc} numberOfLines={1}>
            {loc}
          </Text>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{price ? `${price} / day` : ""}</Text>
          <Text style={styles.tapHint}>Tap for details</Text>
        </View>
      </View>
    </Pressable>
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

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const hasMore = useMemo(() => {
    if (total == null) return true;
    return items.length < total;
  }, [items.length, total]);

  const fetchPage = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const reset = !!opts.reset;

      if (reset) {
        setRefreshing(true);
      } else if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const token = await getIdToken();
        const nextOffset = reset ? 0 : offset;

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

        setTotal(pageTotal);

        if (reset) {
          setItems(list);
          setOffset(list.length);
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((x) => String(x.id)));
            const merged = [...prev];
            for (const c of list) {
              const id = String(c?.id || "");
              if (id && !seen.has(id)) merged.push(c);
            }
            return merged;
          });
          setOffset((prev) => prev + list.length);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [limit, offset]
  );

  useEffect(() => {
    fetchPage({ reset: true }).catch((e) => {
      console.warn("load cars failed", e?.message || e);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    });
  }, [fetchPage]);

  // ✅ Auto refresh when coming back from delete
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

  const ListEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Feather name="truck" size={22} color="rgba(17,24,39,0.35)" />
        <Text style={styles.emptyTitle}>No cars yet</Text>
        <Text style={styles.emptySub}>
          Create your first car in onboarding, then it will appear here.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.h1}>My Cars</Text>

        <Pressable
          onPress={() => router.push("/host-onboarding-car")}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
        >
          <Feather name="plus" size={16} color="#111827" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => String(x.id)}
          renderItem={({ item }) => <CarCard car={item} onPress={onPressCar} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 14 }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
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

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  listContent: { paddingHorizontal: 18, paddingBottom: 24 },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },

  coverWrap: {
    width: 92,
    height: 92,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  cover: { width: "100%", height: "100%" },

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

  meta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  loc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  price: { fontSize: 13, fontWeight: "900", color: "rgba(17,24,39,0.90)" },

  tapHint: { fontSize: 11, fontWeight: "900", color: "rgba(17,24,39,0.35)" },

  empty: {
    paddingTop: 60,
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
});
