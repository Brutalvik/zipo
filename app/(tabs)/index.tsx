import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  FlatList,
  Text,
} from "react-native";
import { useRouter } from "expo-router";

import AppHeader from "@/components/common/AppHeader";
import SectionHeader from "@/components/cars/SectionHeader";
import BestCarCard from "@/components/home/BestCarCard";
import NearbyHeroCard from "@/components/home/NearbyHeroCard";
import TypePill from "@/components/home/TypePill";
import HomeSearchPanel, {
  HomeSearchState,
} from "@/components/home/HomeSearchPanel";

import vehicleTypesRaw from "@/data/vehicleTypes.json";
import carsRaw from "@/data/cars.json";
import type { Car } from "@/types/cars";
import { COLORS } from "@/theme/ui";

import { loadJSON, saveJSON } from "@/lib/persist";

type VehicleTypeItem = { id: string; label: string };

const HOME_PREFS_KEY = "zipo.home.prefs.v1";

type HomePrefs = {
  criteria: { location: string; pickupAtISO: string; days: number };
  selectedType: string; // "all" or type id
};

const DEFAULT_PREFS: HomePrefs = {
  criteria: { location: "", pickupAtISO: new Date().toISOString(), days: 3 },
  selectedType: "all",
};

export default function HomeTab() {
  const router = useRouter();
  const cars = carsRaw as Car[];
  const types = vehicleTypesRaw as VehicleTypeItem[];

  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState<string>("all");

  const [criteria, setCriteria] = useState<HomeSearchState>({
    location: "",
    pickupAt: new Date(),
    days: 3,
  });

  // Load persisted home state once
  useEffect(() => {
    (async () => {
      const saved = await loadJSON<HomePrefs>(HOME_PREFS_KEY, DEFAULT_PREFS);
      setSelectedType(saved.selectedType ?? "all");
      setCriteria({
        location: saved.criteria?.location ?? "",
        pickupAt: saved.criteria?.pickupAtISO
          ? new Date(saved.criteria.pickupAtISO)
          : new Date(),
        days: Math.min(30, Math.max(1, saved.criteria?.days ?? 3)),
      });
    })();
  }, []);

  // Persist home state (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      const next: HomePrefs = {
        selectedType,
        criteria: {
          location: criteria.location,
          pickupAtISO: criteria.pickupAt.toISOString(),
          days: criteria.days,
        },
      };
      saveJSON(HOME_PREFS_KEY, next);
    }, 250);

    return () => clearTimeout(id);
  }, [criteria.location, criteria.pickupAt, criteria.days, selectedType]);

  // ✅ First apply ONLY type filter (never "0 everything" unless truly none)
  const typeFilteredCars = useMemo(() => {
    return cars.filter((c) => {
      if (selectedType === "all") return true;
      return c.vehicleType ? c.vehicleType === selectedType : true;
    });
  }, [cars, selectedType]);

  // ✅ Then apply location filter, but allow fallback to typeFilteredCars if no matches
  const locationQuery = criteria.location.trim().toLowerCase();

  const exactLocationMatches = useMemo(() => {
    if (!locationQuery) return typeFilteredCars;

    return typeFilteredCars.filter((c) => {
      const loc = (c.location || "").toLowerCase();
      return loc.includes(locationQuery);
    });
  }, [typeFilteredCars, locationQuery]);

  const usingLocationFallback =
    locationQuery.length > 0 && exactLocationMatches.length === 0;

  const homeFilteredCars = usingLocationFallback
    ? typeFilteredCars
    : exactLocationMatches;

  // ✅ Live count should represent what we’re showing
  const resultCount = homeFilteredCars.length;

  const bestCars = useMemo(() => {
    return homeFilteredCars
      .slice()
      .sort(
        (a, b) =>
          b.rating +
          (b.isPopular ? 0.2 : 0) -
          (a.rating + (a.isPopular ? 0.2 : 0))
      )
      .slice(0, 6);
  }, [homeFilteredCars]);

  const nearbyCar = useMemo<Car>(() => {
    const pool = homeFilteredCars.length > 0 ? homeFilteredCars : cars;
    return pool.find((c) => c.isPopular) ?? pool[0];
  }, [homeFilteredCars, cars]);

  const onPressSearch = () => {
    router.push({
      pathname: "/(tabs)/search",
      params: {
        location: criteria.location,
        pickupAt: criteria.pickupAt.toISOString(),
        days: String(criteria.days),
        type: selectedType,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Zipo" notificationCount={2} />

        <HomeSearchPanel
          value={criteria}
          onChange={setCriteria}
          resultCount={resultCount}
          onPressSearch={onPressSearch}
        />

        {/* ✅ small hint if we’re falling back */}
        {usingLocationFallback ? (
          <View style={[styles.pad, { paddingTop: 8 }]}>
            <Text style={styles.fallbackText}>
              No exact matches for “{criteria.location}” — showing all available
              cars.
            </Text>
          </View>
        ) : null}

        {/* Vehicle Types */}
        <View style={[styles.pad, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>Vehicle types</Text>
        </View>

        <FlatList
          data={[{ id: "all", label: "All" } as VehicleTypeItem, ...types]}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
          renderItem={({ item }) => (
            <TypePill
              label={item.label}
              selected={selectedType === item.id}
              onPress={() =>
                setSelectedType((prev) => (prev === item.id ? "all" : item.id))
              }
            />
          )}
        />

        {/* Best Cars */}
        <View style={[styles.pad, { marginTop: 18 }]}>
          <SectionHeader
            title="Best Cars"
            actionText="View All"
            onPressAction={() => router.push("/(tabs)/search")}
          />
          <Text style={styles.subtle}>
            {selectedType === "all" ? "Available" : `Filtered: ${selectedType}`}
          </Text>
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
              onPress={() => {}}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: COLORS.muted, fontWeight: "700" }}>
                No cars match your current filters.
              </Text>
            </View>
          }
        />

        {/* Nearby */}
        <View style={[styles.pad, { marginTop: 18 }]}>
          <SectionHeader
            title="Nearby"
            actionText="View All"
            onPressAction={() => router.push("/(tabs)/search")}
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

  typeRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  bestRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },

  fallbackText: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
});
