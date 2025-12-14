import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  FlatList,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import AppHeader from "@/components/common/AppHeader";
import SearchInput from "@/components/cars/SearchInput";
import SectionHeader from "@/components/cars/SectionHeader";
import BrandChip from "@/components/cars/BrandChip";
import CarGridCard from "@/components/cars/CarGridCard";
import PopularMiniCard from "@/components/cars/PopularMiniCard";

import AnimatedFilterModal, {
  FilterState,
} from "@/components/cars/AnimatedFilterModal";
import { loadJSON, saveJSON } from "@/lib/persist";

import carsRaw from "@/data/cars.json";
import vehicleTypesRaw from "@/data/vehicleTypes.json";
import type { Car, VehicleTypeItem, Transmission } from "@/types/cars";
import { COLORS } from "@/theme/ui";

const PREFS_KEY = "zipo.search.prefs.v1";

const DEFAULT_FILTERS: FilterState = {
  minPrice: 0,
  maxPrice: 250,
  seats: null,
  transmission: "Any",
};

type SearchPrefs = {
  query: string;
  selectedType: string; // "all" or type id
  filters: FilterState;

  // (optional) saved criteria from Home for later backend
  location?: string;
  pickupAtISO?: string;
  days?: number;
};

const DEFAULT_PREFS: SearchPrefs = {
  query: "",
  selectedType: "all",
  filters: DEFAULT_FILTERS,
};

function normalizeTransmission(t?: Transmission): Transmission {
  return t === "Manual" ? "Manual" : "Automatic";
}

export default function SearchTab() {
  const params = useLocalSearchParams<{
    location?: string;
    pickupAt?: string;
    days?: string;
    type?: string;
  }>();

  const cars = carsRaw as Car[];
  const types = vehicleTypesRaw as VehicleTypeItem[];

  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const [filterOpen, setFilterOpen] = useState(false);
  const [filtersDraft, setFiltersDraft] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] =
    useState<FilterState>(DEFAULT_FILTERS);

  // 1) Load persisted prefs once
  useEffect(() => {
    (async () => {
      const saved = await loadJSON<SearchPrefs>(PREFS_KEY, DEFAULT_PREFS);
      setQuery(saved.query);
      setSelectedType(saved.selectedType);
      setFiltersApplied(saved.filters);
      setFiltersDraft(saved.filters);
    })();
  }, []);

  // 2) If navigated from Home with params, apply them once they exist
  useEffect(() => {
    const incomingLocation = (params?.location ?? "").toString();
    const incomingType = (params?.type ?? "").toString();
    const incomingPickupAt = (params?.pickupAt ?? "").toString();
    const incomingDays = params?.days ? Number(params.days) : undefined;

    const hasAny =
      !!incomingLocation ||
      !!incomingType ||
      !!incomingPickupAt ||
      typeof incomingDays === "number";

    if (!hasAny) return;

    // Apply: location -> query (simple now), type -> selectedType
    if (incomingLocation) setQuery(incomingLocation);

    if (incomingType && incomingType !== "all") {
      const valid = types.some((t) => t.id === incomingType);
      if (valid) setSelectedType(incomingType);
    } else if (incomingType === "all") {
      setSelectedType("all");
    }

    // Persist the incoming criteria for later backend usage
    (async () => {
      const current = await loadJSON<SearchPrefs>(PREFS_KEY, DEFAULT_PREFS);
      const next: SearchPrefs = {
        ...current,
        query: incomingLocation ? incomingLocation : current.query,
        selectedType:
          incomingType && types.some((t) => t.id === incomingType)
            ? incomingType
            : incomingType === "all"
            ? "all"
            : current.selectedType,
        location: incomingLocation || current.location,
        pickupAtISO: incomingPickupAt || current.pickupAtISO,
        days:
          typeof incomingDays === "number" && !Number.isNaN(incomingDays)
            ? incomingDays
            : current.days,
      };
      await saveJSON(PREFS_KEY, next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.location, params?.type, params?.pickupAt, params?.days, types]);

  // 3) Persist query + selectedType + filtersApplied (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      const next: SearchPrefs = {
        query,
        selectedType,
        filters: filtersApplied,
      };
      saveJSON(PREFS_KEY, next);
    }, 250);

    return () => clearTimeout(id);
  }, [query, selectedType, filtersApplied]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filtersApplied.minPrice !== DEFAULT_FILTERS.minPrice) n++;
    if (filtersApplied.maxPrice !== DEFAULT_FILTERS.maxPrice) n++;
    if (filtersApplied.seats !== DEFAULT_FILTERS.seats) n++;
    if (filtersApplied.transmission !== DEFAULT_FILTERS.transmission) n++;
    if (selectedType !== "all") n++;
    return n;
  }, [filtersApplied, selectedType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cars.filter((c) => {
      const matchesQuery = !q
        ? true
        : `${c.brand} ${c.name} ${c.location}`.toLowerCase().includes(q);

      const matchesType =
        selectedType === "all"
          ? true
          : c.vehicleType
          ? c.vehicleType === selectedType
          : true;

      const matchesPrice =
        c.pricePerDay >= filtersApplied.minPrice &&
        c.pricePerDay <= filtersApplied.maxPrice;

      const matchesSeats =
        filtersApplied.seats === null ? true : c.seats === filtersApplied.seats;

      const carTransmission = normalizeTransmission(c.transmission);
      const matchesTransmission =
        filtersApplied.transmission === "Any"
          ? true
          : carTransmission === filtersApplied.transmission;

      return (
        matchesQuery &&
        matchesType &&
        matchesPrice &&
        matchesSeats &&
        matchesTransmission
      );
    });
  }, [cars, query, selectedType, filtersApplied]);

  const popular = useMemo(() => cars.filter((c) => c.isPopular), [cars]);

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Zipo" notificationCount={2} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pad}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            filterBadgeCount={activeFilterCount}
            onPressFilter={() => {
              setFiltersDraft(filtersApplied);
              setFilterOpen(true);
            }}
          />
        </View>

        {/* Vehicle type chips */}
        <View style={{ marginTop: 14 }}>
          <FlatList
            data={[{ id: "all", label: "All" } as any, ...types]}
            keyExtractor={(i: any) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
            renderItem={({ item }: any) => {
              const id = item.id as string;
              const selected = id === selectedType;

              const left =
                id === "all" ? (
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
                  label={item.label}
                  selected={selected}
                  left={left}
                  onPress={() => setSelectedType(id)}
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

      <AnimatedFilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filtersDraft}
        onChange={setFiltersDraft}
        onReset={() => setFiltersDraft(DEFAULT_FILTERS)}
        onApply={() => {
          setFiltersApplied(filtersDraft);
          setFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110 },
  pad: { paddingHorizontal: 20, paddingTop: 12 },

  typeRow: { paddingHorizontal: 20, gap: 10 },
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
