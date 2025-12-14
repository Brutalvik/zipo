import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  FlatList,
  Text,
} from "react-native";

import SearchInput from "@/components/cars/SearchInput";
import SectionHeader from "@/components/cars/SectionHeader";

import HomeHeader from "@/components/home/HomeHeader";
import BrandCircle from "@/components/home/BrandCircle";
import BestCarCard from "@/components/home/BestCarCard";
import NearbyHeroCard from "@/components/home/NearbyHeroCard";

import brandsRaw from "@/data/brands.json";
import carsRaw from "@/data/cars.json";
import type { Brand, Car } from "@/types/cars";
import { COLORS } from "@/theme/ui";

export default function HomeTab() {
  const brands = brandsRaw as Brand[];
  const cars = carsRaw as Car[];

  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const bestCars = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = cars
      .slice()
      .sort(
        (a, b) =>
          b.rating +
          (b.isPopular ? 0.2 : 0) -
          (a.rating + (a.isPopular ? 0.2 : 0))
      );

    if (!q) return base.slice(0, 6);
    return base
      .filter((c) =>
        `${c.brand} ${c.name} ${c.location}`.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [cars, query]);

  const nearbyCar = useMemo<Car>(() => {
    // pick something that looks good as a hero card
    return cars.find((c) => c.isPopular) ?? cars[0];
  }, [cars]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader appName="Zipo" notificationCount={2} />

        <View style={styles.pad}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onPressFilter={() => {}}
          />
        </View>

        {/* Brands */}
        <View style={[styles.pad, { marginTop: 6 }]}>
          <Text style={styles.sectionTitle}>Brands</Text>
        </View>

        <FlatList
          data={brands.filter((b) => b.id !== "all")}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandsRow}
          renderItem={({ item }) => (
            <BrandCircle
              label={item.name}
              iconName="circle"
              onPress={() => {
                // later: route to search with brand filter
              }}
            />
          )}
        />

        {/* Best Cars */}
        <View style={[styles.pad, { marginTop: 18 }]}>
          <SectionHeader
            title="Best Cars"
            actionText="View All"
            onPressAction={() => {}}
          />
          <Text style={styles.subtle}>Available</Text>
        </View>

        <FlatList
          data={bestCars}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bestRow}
          renderItem={({ item }) => (
            <BestCarCard
              car={item}
              isFav={!!favs[item.id]}
              onPressFav={() =>
                setFavs((p) => ({ ...p, [item.id]: !p[item.id] }))
              }
              onPress={() => {
                // later: navigate to details
              }}
            />
          )}
        />

        {/* Nearby */}
        <View style={[styles.pad, { marginTop: 18 }]}>
          <SectionHeader
            title="Nearby"
            actionText="View All"
            onPressAction={() => {}}
          />
        </View>

        <View style={[styles.pad, { paddingTop: 10 }]}>
          <NearbyHeroCard car={nearbyCar} onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110 },
  pad: { paddingHorizontal: 20, paddingTop: 12 },

  sectionTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  subtle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },

  brandsRow: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  bestRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },
});
