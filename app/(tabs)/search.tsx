import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchCars,
  selectCars,
  selectCarsStatus,
  selectCarsPage,
} from "@/redux/slices/carSlice";

import SearchInput from "@/components/cars/SearchInput";
import CarListCard from "@/components/cars/CarListCard";

function useDebounced<T>(value: T, delayMs: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

export default function SearchScreen() {
  const dispatch = useAppDispatch();
  const tabBarHeight = useBottomTabBarHeight();

  const items = useAppSelector(selectCars);
  const status = useAppSelector(selectCarsStatus);
  const page = useAppSelector(selectCarsPage);

  const isLoading = status === "loading";

  const [city, setCity] = useState("");
  const [q, setQ] = useState("");

  // optional chips (we’ll wire real filter modal later)
  const [sort, setSort] = useState<"popular" | "newest">("popular");

  const debouncedCity = useDebounced(city.trim(), 350);
  const debouncedQ = useDebounced(q.trim(), 350);

  const lastQueryKey = useRef<string>("");

  const runSearch = useCallback(
    async (opts?: { reset?: boolean }) => {
      const reset = opts?.reset ?? true;

      const queryKey = JSON.stringify({
        city: debouncedCity,
        q: debouncedQ,
        sort,
      });

      // avoid spam when debounced values are same
      if (queryKey === lastQueryKey.current && !reset) return;
      lastQueryKey.current = queryKey;

      await dispatch(
        fetchCars({
          city: debouncedCity || "",
          q: debouncedQ || "",
          sort,
          status: "active",
          hasImage: "true",
          limit: 30,
          offset: reset ? 0 : page.offset + page.limit,
        })
      );
    },
    [dispatch, debouncedCity, debouncedQ, sort, page.offset, page.limit]
  );

  // initial load
  useEffect(() => {
    dispatch(
      fetchCars({
        status: "active",
        hasImage: "true",
        sort: "popular",
        limit: 30,
        offset: 0,
      })
    );
  }, [dispatch]);

  // auto-search when inputs change
  useEffect(() => {
    runSearch({ reset: true });
  }, [debouncedCity, debouncedQ, sort, runSearch]);

  const header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        {/* Top bar (kept simple here) */}
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

        {/* City field */}
        <View style={styles.cityRow}>
          <Feather name="map-pin" size={16} color={COLORS.muted} />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="City (e.g., Calgary)"
            placeholderTextColor="#9CA3AF"
            style={styles.cityInput}
            returnKeyType="search"
          />
          {city.length ? (
            <Pressable onPress={() => setCity("")} style={styles.clearBtn}>
              <Feather name="x" size={16} color={COLORS.text} />
            </Pressable>
          ) : null}
        </View>

        {/* Keyword search */}
        <View style={{ marginTop: 12 }}>
          <SearchInput
            value={q}
            onChangeText={setQ}
            placeholder="Search make, model, or car name…"
            onPressFilter={() => {
              // we’ll connect AnimatedFilterModal later
              // for now just toggle popular/newest quickly
              setSort((s) => (s === "popular" ? "newest" : "popular"));
            }}
            filterBadgeCount={0}
          />
        </View>

        {/* quick filter chips row (visual only for now) */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Price</Text>
            <Feather name="chevron-down" size={16} color={COLORS.muted} />
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Vehicle type</Text>
            <Feather name="chevron-down" size={16} color={COLORS.muted} />
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Make & model</Text>
            <Feather name="chevron-down" size={16} color={COLORS.muted} />
          </View>
        </View>

        <Text style={styles.resultsTitle}>
          {items.length ? `${items.length}+ cars available` : "No cars found"}
        </Text>
        <Text style={styles.resultsSub}>
          {debouncedCity
            ? `Showing cars in ${debouncedCity}`
            : "Showing all available cars"}
          {debouncedQ ? ` • matching “${debouncedQ}”` : ""}
        </Text>
      </View>
    );
  }, [city, q, items.length, debouncedCity, debouncedQ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CarListCard car={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: tabBarHeight + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => runSearch({ reset: true })}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          // optional pagination later; your backend supports offset/limit
          // runSearch({ reset: false });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  headerWrap: { paddingTop: 8, paddingBottom: 10 },

  // Top header
  topRow: {
    paddingTop: 8, // adds margin below notch/time
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

  // City input row
  cityRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Chips
  chipsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: COLORS.text },

  resultsTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  resultsSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
});
