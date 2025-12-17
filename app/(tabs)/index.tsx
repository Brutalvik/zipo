import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { format } from "date-fns";

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

  const [mode, setMode] = useState<"home" | "results">("home");
  const [selectedType, setSelectedType] = useState<string>("All");

  const [search, setSearch] = useState<HomeSearchState>({
    location: "",
    pickupAt: new Date(),
    days: 3,
  });

  // animated collapse of the big search card
  const collapse = useRef(new Animated.Value(0)).current; // 0 = expanded, 1 = collapsed

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

  const subtitle = useMemo(() => {
    const start = search.pickupAt;
    const end = new Date(start);
    end.setDate(end.getDate() + search.days);
    // matches your screenshot style (12-16 - 12-19)
    return `${format(start, "MM-dd")}  -  ${format(end, "MM-dd")}`;
  }, [search.pickupAt, search.days]);

  const onPressSearch = useCallback(() => {
    const location = search.location.trim();

    // prefer city search: backend supports `city`
    dispatch(
      fetchCars({
        city: location || "",
        type: selectedType === "All" ? "" : selectedType,
        limit: 50,
        status: "active",
      })
    );

    setMode("results");
    Animated.timing(collapse, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [dispatch, search.location, selectedType, collapse]);

  const onBackToHome = useCallback(() => {
    setMode("home");
    Animated.timing(collapse, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [collapse]);

  // big search card animation (fade + slide down a bit + scale)
  const searchCardStyle = {
    opacity: collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateY: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -14],
        }),
      },
      {
        scale: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.96],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      {mode === "home" ? (
        <FlatList
          key="home-grid"
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

              <Animated.View style={searchCardStyle}>
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
      ) : (
        <FlatList
          key="results-grid"
          data={cars} // results list from fetchCars
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SearchResultCard car={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => onPressSearch()}
            />
          }
          ListHeaderComponent={
            <View>
              <SearchResultsHeader
                title={search.location.trim() || "Search"}
                subtitle={subtitle}
                onBack={onBackToHome}
              />

              {/* keep HomeSearchPanel off-screen / collapsed (optional) */}
              {/* If you want “tap header to expand filters”, we can add later */}
            </View>
          }
          contentContainerStyle={{ paddingBottom: tabBarHeight + 22 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 6 },
  sectionPad: { paddingHorizontal: 16, paddingTop: 16 },
  h1: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  subtle: { marginTop: 6, fontSize: 12, opacity: 0.6, fontWeight: "700" },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
