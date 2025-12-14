import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  FlatList,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import SearchInput from "@/components/cars/SearchInput";
import BrandChip from "@/components/cars/BrandChip";
import SectionHeader from "@/components/cars/SectionHeader";
import CarGridCard from "@/components/cars/CarGridCard";
import PopularMiniCard from "@/components/cars/PopularMiniCard";

import brandsRaw from "@/data/brands.json";
import carsRaw from "@/data/cars.json";
import type { Brand, Car } from "@/types/cars";
import { COLORS } from "@/theme/ui";

export default function SearchTab() {
  const brands = brandsRaw as Brand[];
  const cars = carsRaw as Car[];

  const [query, setQuery] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const brandName =
      selectedBrandId === "all"
        ? null
        : brands.find((b) => b.id === selectedBrandId)?.name ?? null;

    const q = query.trim().toLowerCase();

    return cars.filter((c) => {
      const matchesBrand = !brandName
        ? true
        : c.brand.toLowerCase() === brandName.toLowerCase();

      const matchesQuery = !q
        ? true
        : `${c.brand} ${c.name} ${c.location}`.toLowerCase().includes(q);

      return matchesBrand && matchesQuery;
    });
  }, [cars, brands, query, selectedBrandId]);

  const popular = useMemo(() => cars.filter((c) => c.isPopular), [cars]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pad}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onPressFilter={() => {}}
          />
        </View>

        {/* Brand Chips */}
        <View style={{ marginTop: 14 }}>
          <FlatList
            data={brands}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandRow}
            renderItem={({ item }) => {
              const selected = item.id === selectedBrandId;

              const left =
                item.id === "all" ? (
                  <Feather
                    name="grid"
                    size={14}
                    color={selected ? "#fff" : COLORS.text}
                  />
                ) : (
                  <View
                    style={[
                      styles.iconDot,
                      selected ? styles.iconDotSelected : styles.iconDotDefault,
                    ]}
                  >
                    <Feather
                      name="circle"
                      size={10}
                      color={selected ? "#fff" : COLORS.text}
                    />
                  </View>
                );

              return (
                <BrandChip
                  label={item.name}
                  selected={selected}
                  left={left}
                  onPress={() => setSelectedBrandId(item.id)}
                />
              );
            }}
          />
        </View>

        {/* Recommended */}
        <View style={[styles.pad, { marginTop: 16 }]}>
          <SectionHeader
            title="Recommend For You"
            actionText="View All"
            onPressAction={() => {}}
          />
          <View style={styles.grid}>
            {filtered.slice(0, 4).map((car) => (
              <CarGridCard
                key={car.id}
                car={car}
                isFav={!!favs[car.id]}
                onPressFav={() =>
                  setFavs((p) => ({ ...p, [car.id]: !p[car.id] }))
                }
                onPressBook={() => {}}
              />
            ))}
          </View>
        </View>

        {/* Popular */}
        <View style={[styles.pad, { marginTop: 18 }]}>
          <SectionHeader
            title="Our Popular Cars"
            actionText="View All"
            onPressAction={() => {}}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <FlatList
            data={popular}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularRow}
            renderItem={({ item }) => (
              <PopularMiniCard car={item} onPress={() => {}} />
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110 },
  pad: { paddingHorizontal: 20, paddingTop: 16 },
  brandRow: { paddingHorizontal: 20, gap: 10 },
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  popularRow: { paddingHorizontal: 20 },
  iconDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDotDefault: { backgroundColor: "rgba(0,0,0,0.05)" },
  iconDotSelected: { backgroundColor: "rgba(255,255,255,0.15)" },
});
