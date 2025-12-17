import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

import SearchResultsHeader from "@/components/search/SearchResultsHeader";
import SearchResultCard from "@/components/search/SearchResultCard";

import vehicleTypesRaw from "@/data/vehicleTypes.json";
import { COLORS } from "@/theme/ui";
import type { Car } from "@/types/car";

function titleCaseCity(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function defaultPickupAtPlus2Hours() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function matchesCity(car: Car, cityInput: string) {
  const q = (cityInput || "").trim().toLowerCase();
  if (!q) return true;

  const hay = [car.city, car.area, car.location, car.countryCode, car.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

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
    pickupAt: defaultPickupAtPlus2Hours(), // ✅ default now + 2 hours
    days: 3,
  });

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [favIds, setFavIds] = useState<Record<string, boolean>>({});

  // collapse home search panel when entering search mode
  const anim = useRef(new Animated.Value(0)).current;

  // overlay expansion (pill -> editor)
  const [editorOpen, setEditorOpen] = useState(false);
  const overlay = useRef(new Animated.Value(0)).current;

  // measure pill correctly
  const pillRef = useRef<View>(null);
  const [pillStart, setPillStart] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const { width: SCREEN_W } = Dimensions.get("window");

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

  // Home browse list (your existing behavior)
  const bestCars = useMemo(() => {
    const list = cars.length ? cars : featured;
    if (selectedType === "All") return list;
    return list.filter(
      (c) => (c.vehicleType ?? "").toLowerCase() === selectedType.toLowerCase()
    );
  }, [cars, featured, selectedType]);

  // Search results list (search mode list)
  const searchResults = useMemo(() => {
    if (!isSearchMode) return [];
    if (selectedType === "All") return cars;
    return cars.filter(
      (c) => (c.vehicleType ?? "").toLowerCase() === selectedType.toLowerCase()
    );
  }, [cars, selectedType, isSearchMode]);

  const runEnterSearchAnim = useCallback(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
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
    setEditorOpen(false);
    overlay.setValue(0);
    runExitSearchAnim(() => setIsSearchMode(false));
  }, [overlay, runExitSearchAnim]);

  const openEditor = useCallback(() => {
    pillRef.current?.measureInWindow((x, y, w, h) => {
      const HEADER_VISUAL_OFFSET = 30;
      const localY = y - insets.top + HEADER_VISUAL_OFFSET;
      setPillStart({ x, y: localY, w, h });
      setEditorOpen(true);
      Animated.timing(overlay, {
        toValue: 1,
        duration: 240,
        useNativeDriver: false,
      }).start();
    });
  }, [insets.top, overlay]);

  const closeEditor = useCallback(() => {
    Animated.timing(overlay, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setEditorOpen(false));
  }, [overlay]);

  // home panel collapse anim
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

  // ---------------------------
  // SEARCH MODE
  // ---------------------------
  if (isSearchMode) {
    const start = pillStart ?? {
      x: 70,
      y: 60,
      w: SCREEN_W - 120,
      h: 56,
    };

    const top = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [start.y, start.y],
    });
    const left = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [start.x, 16],
    });
    const w = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [start.w, SCREEN_W - 32],
    });
    const h = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [start.h, 430],
    });
    const radius = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 24],
    });
    const backdropOpacity = overlay.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.25],
    });

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topHeaderShadow}>
          <AppHeader />
        </View>

        <SearchResultsHeader
          ref={pillRef}
          city={search.location}
          pickupAt={search.pickupAt}
          days={search.days}
          onPressBack={onPressBackFromSearch}
          onPressPill={openEditor}
          pillHidden={editorOpen}
        />

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchResultCard
              car={item}
              isFav={!!favIds[item.id]}
              onPressFav={() =>
                setFavIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
            />
          )}
          ListHeaderComponent={
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsCount}>
                {searchResults.length === 0
                  ? "No cars available"
                  : `${searchResults.length} cars available`}
              </Text>

              {searchResults.length !== 0 && (
                <Text style={styles.resultsSub}>
                  Showing cars in {titleCaseCity(search.location)}
                </Text>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onPressSearch} />
          }
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 24,
            paddingTop: 6,
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* expanding overlay */}
        {editorOpen ? (
          <>
            <Animated.View
              pointerEvents="auto"
              style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeEditor}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.editorOverlay,
                {
                  top,
                  left,
                  width: w,
                  height: h,
                  borderRadius: radius as any,
                },
              ]}
            >
              <HomeSearchPanel
                value={search}
                onChange={setSearch}
                onPressSearch={() => {
                  closeEditor();
                  onPressSearch();
                }}
                containerStyle={{
                  marginHorizontal: 0,
                  marginTop: 0,
                }}
              />
            </Animated.View>
          </>
        ) : null}
      </SafeAreaView>
    );
  }

  // ---------------------------
  // HOME MODE
  // ---------------------------
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
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: { paddingBottom: 6 },
  sectionPad: { paddingHorizontal: 16, paddingTop: 16 },

  h1: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  subtle: { marginTop: 6, fontSize: 12, opacity: 0.6, fontWeight: "700" },

  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  topHeaderShadow: {
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  resultsSummary: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  resultsCount: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  resultsSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.muted,
  },

  editorOverlay: {
    position: "absolute",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
});
