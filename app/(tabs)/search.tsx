import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, View, StyleSheet } from "react-native";

import AppHeader from "@/components/common/AppHeader";
import SearchInput from "@/components/cars/SearchInput";
import FilterModal, { FilterState } from "@/components/cars/FilterModal";
import CarGridCard from "@/components/cars/CarGridCard";

import carsRaw from "@/data/cars.json";
import type { Car } from "@/types/cars";
import { loadJSON, saveJSON } from "@/lib/persist";
import { COLORS } from "@/theme/ui";

const FILTER_KEY = "zipo.search.filters";

const DEFAULT_FILTERS: FilterState = {
  minPrice: 0,
  maxPrice: 250,
  seats: null,
  transmission: "Any",
};

export default function SearchTab() {
  const cars = carsRaw as Car[];

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersDraft, setFiltersDraft] = useState(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = useState(DEFAULT_FILTERS);

  // 🔹 Load persisted filters
  useEffect(() => {
    loadJSON(FILTER_KEY, DEFAULT_FILTERS).then((saved) => {
      setFiltersApplied(saved);
      setFiltersDraft(saved);
    });
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filtersApplied.minPrice !== DEFAULT_FILTERS.minPrice) n++;
    if (filtersApplied.maxPrice !== DEFAULT_FILTERS.maxPrice) n++;
    if (filtersApplied.seats !== DEFAULT_FILTERS.seats) n++;
    if (filtersApplied.transmission !== DEFAULT_FILTERS.transmission) n++;
    return n;
  }, [filtersApplied]);

  const filteredCars = useMemo(() => {
    const q = query.toLowerCase();
    return cars.filter((c) => {
      const matchQuery = !q || c.name.toLowerCase().includes(q);
      const matchPrice =
        c.pricePerDay >= filtersApplied.minPrice &&
        c.pricePerDay <= filtersApplied.maxPrice;
      const matchSeats =
        filtersApplied.seats === null || c.seats === filtersApplied.seats;
      return matchQuery && matchPrice && matchSeats;
    });
  }, [cars, query, filtersApplied]);

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Zipo" notificationCount={2} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pad}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            filterBadgeCount={activeFilterCount}
            onPressFilter={() => {
              setFiltersDraft(filtersApplied);
              setFiltersOpen(true);
            }}
          />
        </View>

        <View style={styles.grid}>
          {filteredCars.map((car) => (
            <CarGridCard key={car.id} car={car} />
          ))}
        </View>
      </ScrollView>

      <FilterModal
        visible={filtersOpen}
        value={filtersDraft}
        onChange={setFiltersDraft}
        onClose={() => setFiltersOpen(false)}
        onReset={() => setFiltersDraft(DEFAULT_FILTERS)}
        onApply={async () => {
          setFiltersApplied(filtersDraft);
          await saveJSON(FILTER_KEY, filtersDraft);
          setFiltersOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 120 },
  pad: { paddingHorizontal: 20, paddingTop: 12 },
  grid: {
    paddingHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
});
