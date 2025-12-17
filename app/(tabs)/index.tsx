import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchCars,
  fetchFeaturedCars,
  fetchPopularCars,
  selectCars,
  selectFeaturedCars,
  selectPopularCars,
  selectCarsStatus,
  selectFeaturedStatus,
  selectPopularStatus,
} from "@/redux/slices/carSlice";

import AppHeader from "@/components/common/AppHeader";
import SectionHeader from "@/components/cars/SectionHeader";
import HomeSearchPanel, {
  HomeSearchState,
} from "@/components/home/HomeSearchPanel";
import TypePill from "@/components/home/TypePill";
import BestCarCard from "@/components/home/BestCarCard";
import NearbyHeroCard from "@/components/home/NearbyHeroCard";
import CarGridCard from "@/components/cars/CarGridCard";
import CarListCard from "@/components/cars/CarListCard";

import vehicleTypesRaw from "@/data/vehicleTypes.json";
import { COLORS, RADIUS } from "@/theme/ui";
import { addDays } from "@/lib/date";

function titleCaseCity(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatHeaderRange(start: Date, days: number) {
  const end = addDays(start, days);
  const fmt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const MMM = d.toLocaleString("en-US", { month: "short" });
    const yy = String(d.getFullYear()).slice(-2);

    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    return `${dd}-${MMM}-${yy} ${h}:${m}${ampm}`;
  };

  return `${fmt(start)} - ${fmt(end)}`;
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const tabBarHeight = useBottomTabBarHeight();

  const featured = useAppSelector(selectFeaturedCars);
  const popular = useAppSelector(selectPopularCars);
  const cars = useAppSelector(selectCars);

  const statusList = useAppSelector(selectCarsStatus);
  const statusFeatured = useAppSelector(selectFeaturedStatus);
  const statusPopular = useAppSelector(selectPopularStatus);

  const isLoading =
    statusList === "loading" ||
    statusFeatured === "loading" ||
    statusPopular === "loading";

  const [selectedType, setSelectedType] = useState<string>("All");

  const [search, setSearch] = useState<HomeSearchState>({
    location: "",
    pickupAt: new Date(),
    days: 3,
  });

  // Search mode toggles the whole view (HOME vs SEARCH RESULTS)
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Animate "Find your car" panel collapsing away
  const anim = useRef(new Animated.Value(0)).current; // 0 = home, 1 = search mode

  const vehicleTypes: string[] = useMemo(() => {
    const base = Array.isArray(vehicleTypesRaw) ? vehicleTypesRaw : [];
    const labels = base
      .map((x: any) => (typeof x === "string" ? x : x?.label))
      .filter(Boolean);
    return ["All", ...labels];
  }, []);

  const loadHome = useCallback(async () => {
    await Promise.all([
      dispatch(fetchFeaturedCars(10)),
      dispatch(fetchPopularCars(10)),
      dispatch(fetchCars({ limit: 20 })),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const nearbyCar = featured[0] ?? popular[0] ?? cars[0] ?? null;

  const bestCars = useMemo(() => {
    const list = cars.length ? cars : featured;
    if (selectedType === "All") return list;
    return list.filter(
      (c) => (c.vehicleType ?? "").toLowerCase() === selectedType.toLowerCase()
    );
  }, [cars, featured, selectedType]);

  const runEnterSearchAnim = useCallback(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false, // we animate height
    }).start();
  }, [anim]);

  const runExitSearchAnim = useCallback(
    (onDone?: () => void) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start(() => onDone?.());
    },
    [anim]
  );

  const onPressSearch = useCallback(() => {
    const city = search.location.trim();

    // Fetch city-specific (best practice) instead of stuffing into q
    dispatch(
      fetchCars({
        city: city || "",
        type: selectedType === "All" ? "" : selectedType,
        limit: 50,
      })
    );

    setIsSearchMode(true);
    runEnterSearchAnim();
  }, [dispatch, search.location, selectedType, runEnterSearchAnim]);

  const onPressBackFromSearch = useCallback(() => {
    runExitSearchAnim(() => {
      setIsSearchMode(false);
      // optional: reload home sections if you want
      // loadHome();
    });
  }, [runExitSearchAnim]);

  const headerRange = useMemo(
    () => formatHeaderRange(search.pickupAt, search.days),
    [search.pickupAt, search.days]
  );

  const headerCity = useMemo(
    () => titleCaseCity(search.location) || "Your area",
    [search.location]
  );

  // ---- Animated collapse of the big card ----
  const panelHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const panelOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const panelMarginTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  // ---- Search header (compact) ----
  const compactOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const compactTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  // ✅ SEARCH RESULTS VIEW (list cards)
  if (isSearchMode) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* keep AppHeader visible in search view + add subtle shadow under it */}
        <View style={styles.topHeaderShadow}>
          <AppHeader />
        </View>

        {/* compact “search header row” */}
        <Animated.View
          style={[
            styles.searchHeaderRow,
            {
              opacity: compactOpacity,
              transform: [{ translateY: compactTranslate }],
            },
          ]}
        >
          <Pressable
            onPress={onPressBackFromSearch}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="chevron-left" size={20} color={COLORS.text} />
          </Pressable>

          <View style={styles.searchPill}>
            <Text style={styles.searchCity} numberOfLines={1}>
              {headerCity}
            </Text>
            <Text style={styles.searchDates} numberOfLines={1}>
              {headerRange}
            </Text>

            {/* optional count */}
            <Text style={styles.searchCount} numberOfLines={1}>
              {bestCars.length} cars available
            </Text>
          </View>
        </Animated.View>

        <FlatList
          data={bestCars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CarListCard car={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => onPressSearch()}
            />
          }
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 24,
            paddingTop: 10,
          }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  //  NORMAL HOME VIEW
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={bestCars}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <CarGridCard car={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadHome} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topHeaderShadow}>
              <AppHeader />
            </View>

            {/* Big search panel (collapsible when you go to search mode) */}
            <Animated.View
              style={{
                opacity: panelOpacity,
                marginTop: panelMarginTop,
                transform: [{ scaleY: panelHeight }],
              }}
            >
              <HomeSearchPanel
                value={search}
                onChange={setSearch}
                resultCount={bestCars.length}
                onPressSearch={onPressSearch}
              />
            </Animated.View>

            <View style={styles.sectionPad}>
              <Text style={styles.h1}>Vehicle types</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={vehicleTypes}
                keyExtractor={(t) => t}
                renderItem={({ item }) => (
                  <TypePill
                    label={item}
                    selected={item === selectedType}
                    onPress={() => setSelectedType(item)}
                  />
                )}
              />
            </View>

            <View style={styles.sectionPad}>
              <SectionHeader
                title="Best Cars"
                actionText="View All"
                onPressAction={() => {}}
              />
              <Text style={styles.subtle}>
                {selectedType === "All"
                  ? "Available"
                  : `Filtered: ${selectedType}`}
              </Text>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={popular}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => <BestCarCard car={item} />}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 4 }}
              />
            </View>

            <View style={styles.sectionPad}>
              <SectionHeader
                title="Nearby"
                actionText="View All"
                onPressAction={() => {}}
              />
              {nearbyCar ? (
                <View style={{ marginTop: 10 }}>
                  <NearbyHeroCard car={nearbyCar} />
                </View>
              ) : null}
            </View>

            <View style={styles.sectionPad}>
              <SectionHeader
                title="Explore"
                actionText="View All"
                onPressAction={() => {}}
              />
              <Text style={styles.subtle}>Top picks for you</Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + 28 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" }, // keep your light theme

  header: { paddingBottom: 6 },
  sectionPad: { paddingHorizontal: 16, paddingTop: 16 },

  h1: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  subtle: { marginTop: 6, fontSize: 12, opacity: 0.6, fontWeight: "700" },

  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // ✅ subtle shadow under the header bar (AppHeader area)
  topHeaderShadow: {
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  // ✅ compact search header row
  searchHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // ✅ glassier back button
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  searchPill: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchCity: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  searchDates: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
  },
  searchCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    opacity: 0.8,
  },
});
