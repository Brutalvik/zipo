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
  RefreshControl,
  StyleSheet,
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

// TODO: your results card (list style)
import SearchResultCard from "@/components/search/SearchResultCard";

import vehicleTypesRaw from "@/data/vehicleTypes.json";

type Mode = "home" | "results";

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

  const [mode, setMode] = useState<Mode>("home");
  const [selectedType, setSelectedType] = useState<string>("All");

  const [search, setSearch] = useState<HomeSearchState>({
    location: "",
    pickupAt: new Date(),
    days: 3,
  });

  const vehicleTypes: string[] = useMemo(() => {
    const base = Array.isArray(vehicleTypesRaw) ? vehicleTypesRaw : [];
    const labels = base
      .map((x: any) => (typeof x === "string" ? x : x?.label))
      .filter(Boolean);
    return ["All", ...labels];
  }, []);

  const load = useCallback(async () => {
    await Promise.all([
      dispatch(fetchFeaturedCars(10)),
      dispatch(fetchPopularCars(10)),
      dispatch(fetchCars({ limit: 20 })),
    ]);
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const nearbyCar = featured[0] ?? popular[0] ?? cars[0] ?? null;

  const bestCars = useMemo(() => {
    const list = cars.length ? cars : featured;
    if (selectedType === "All") return list;
    return list.filter(
      (c) => (c.vehicleType ?? "").toLowerCase() === selectedType.toLowerCase()
    );
  }, [cars, featured, selectedType]);

  // -----------------------------
  // Animation
  // -----------------------------
  const anim = useRef(new Animated.Value(0)).current; // 0 = home, 1 = results

  const goResults = useCallback(() => {
    setMode("results");
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const goHome = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMode("home");
    });
  }, [anim]);

  // Find card collapses upwards + fades
  const findCardStyle = {
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -70],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.92],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  // Results header appears from top
  const resultsHeaderStyle = {
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
    ],
    opacity: anim,
  };

  const onPressSearch = useCallback(() => {
    dispatch(
      fetchCars({
        // ✅ better city search: use city param
        city: search.location?.trim() || "",
        type: selectedType === "All" ? "" : selectedType,
        limit: 20,
      })
    );
    goResults();
  }, [dispatch, goResults, search.location, selectedType]);

  // -----------------------------
  // ✅ Render
  // -----------------------------
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      {/* ✅ Results header (animated, white theme) */}
      <Animated.View style={[styles.resultsHeaderWrap, resultsHeaderStyle]}>
        <SearchResultsHeader
          city={search.location.trim() || "Search"}
          pickupAt={search.pickupAt}
          days={search.days}
          onPressBack={goHome}
        />
      </Animated.View>

      {mode === "results" ? (
        <FlatList
          key="results-list" // ✅ avoid numColumns invariant
          data={cars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SearchResultCard car={item} />}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} />
          }
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: tabBarHeight + 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="home-grid" // ✅ avoid numColumns invariant
          data={bestCars}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <CarGridCard car={item} />}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <AppHeader />

              {/* ✅ this is what “disappears” into header */}
              <Animated.View style={findCardStyle}>
                <HomeSearchPanel
                  value={search}
                  onChange={setSearch}
                  resultCount={bestCars.length}
                  onPressSearch={onPressSearch}
                />
              </Animated.View>

              <View style={styles.sectionPad}>
                <SectionHeader title="Vehicle types" />
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
                <SectionHeader title="Best Cars" actionText="View All" />
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
                <SectionHeader title="Nearby" actionText="View All" />
                {nearbyCar ? (
                  <View style={{ marginTop: 10 }}>
                    <NearbyHeroCard car={nearbyCar} />
                  </View>
                ) : null}
              </View>

              <View style={styles.sectionPad}>
                <SectionHeader title="Explore" actionText="View All" />
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: tabBarHeight + 28 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 6 },
  sectionPad: { paddingHorizontal: 16, paddingTop: 16 },

  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  resultsHeaderWrap: {
    // keeps layout stable; white theme
  },
});
