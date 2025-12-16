import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
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

import vehicleTypesRaw from "@/data/vehicleTypes.json"; // adjust if needed

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

  const vehicleTypes: string[] = useMemo(() => {
    const base = Array.isArray(vehicleTypesRaw) ? vehicleTypesRaw : [];
    // expecting array of strings or objects; handle both
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

  // “Nearby” card: just pick the first featured as demo
  const nearbyCar = featured[0] ?? popular[0] ?? cars[0] ?? null;

  // Filtered “best cars” grid (demo)
  const bestCars = useMemo(() => {
    const list = cars.length ? cars : featured;
    if (selectedType === "All") return list;
    return list.filter(
      (c) => (c.vehicleType ?? "").toLowerCase() === selectedType.toLowerCase()
    );
  }, [cars, featured, selectedType]);

  const onPressSearch = useCallback(() => {
    // For now: treat location as q. Later you can map to city/country.
    dispatch(
      fetchCars({
        q: search.location?.trim() || "",
        type: selectedType === "All" ? "" : selectedType,
        limit: 20,
      })
    );
  }, [dispatch, search.location, selectedType]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <FlatList
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
});
