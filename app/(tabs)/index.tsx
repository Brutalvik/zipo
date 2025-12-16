import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
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
import CarListCard from "@/components/cars/CarListCard";

import vehicleTypesRaw from "@/data/vehicleTypes.json";

type Mode = "home" | "search";

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
  const [lastQuery, setLastQuery] = useState<string>("");

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

  const loadHome = useCallback(async () => {
    await Promise.all([
      dispatch(fetchFeaturedCars(10)),
      dispatch(fetchPopularCars(10)),
      dispatch(fetchCars({ limit: 20, sort: "popular", status: "active" })),
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

  // -----------------------
  // SEARCH ACTION (switch to search mode)
  // -----------------------
  const onPressSearch = useCallback(() => {
    const text = search.location.trim();
    setLastQuery(text);

    // Switch UI to search results mode
    setMode("search");

    // City-first + q fallback (matches your backend filters)
    dispatch(
      fetchCars({
        city: text || "",
        q: text || "",
        type: selectedType === "All" ? "" : selectedType,
        status: "active",
        hasImage: "true",
        sort: "popular",
        limit: 30,
        offset: 0,
      })
    );
  }, [dispatch, search.location, selectedType]);

  // -----------------------
  // CLEAR SEARCH (back to home)
  // -----------------------
  const clearSearch = useCallback(() => {
    setMode("home");
    setLastQuery("");
    // keep the user inputs in the panel (nice UX), just reload the home content
    loadHome();
  }, [loadHome]);

  // -----------------------
  // PULL TO REFRESH BEHAVIOR
  // -----------------------
  const onRefresh = useCallback(() => {
    if (mode === "search") {
      // re-run last search
      const text = search.location.trim();
      dispatch(
        fetchCars({
          city: text || "",
          q: text || "",
          type: selectedType === "All" ? "" : selectedType,
          status: "active",
          hasImage: "true",
          sort: "popular",
          limit: 30,
          offset: 0,
        })
      );
      return;
    }
    loadHome();
  }, [dispatch, loadHome, mode, search.location, selectedType]);

  // -----------------------
  // RENDER: SEARCH MODE (LIST)
  // -----------------------
  if (mode === "search") {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <FlatList
          key="search-list"
          data={cars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CarListCard car={item} />}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <AppHeader />

              <HomeSearchPanel
                value={search}
                onChange={setSearch}
                resultCount={cars.length}
                onPressSearch={onPressSearch}
              />

              <View style={styles.searchHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchTitle}>
                    {cars.length
                      ? `${cars.length}+ cars available`
                      : "No cars found"}
                  </Text>
                  <Text style={styles.searchSub}>
                    {lastQuery
                      ? `Showing results for “${lastQuery}”.`
                      : "Showing all available cars."}
                  </Text>
                </View>

                <Pressable onPress={clearSearch} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              </View>
            </View>
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabBarHeight + 24,
          }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  // -----------------------
  // RENDER: HOME MODE (ORIGINAL)
  // -----------------------
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <FlatList
        key="home-grid"
        data={bestCars}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <CarGridCard car={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppHeader />

            <HomeSearchPanel
              value={search}
              onChange={setSearch}
              resultCount={bestCars.length}
              onPressSearch={onPressSearch}
            />

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
  header: { paddingBottom: 6 },

  sectionPad: { paddingHorizontal: 16, paddingTop: 16 },
  h1: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  subtle: { marginTop: 6, fontSize: 12, opacity: 0.6, fontWeight: "700" },

  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Search header bits
  searchHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  searchSub: { marginTop: 6, fontSize: 12, fontWeight: "700", opacity: 0.6 },

  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: "#111827" },
});
