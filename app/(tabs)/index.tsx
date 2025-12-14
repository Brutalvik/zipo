import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  FlatList,
  Text,
} from "react-native";

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

type VehicleTypeItem = { id: string; label: string };

export default function HomeTab() {
  const cars = carsRaw as Car[];
  const types = vehicleTypesRaw as VehicleTypeItem[];

  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState<string>("all");

  // ✅ Home search criteria state (simple for now)
  const [criteria, setCriteria] = useState<HomeSearchState>({
    location: "",
    pickupAt: new Date(),
    days: 3,
  });

  // ✅ simple local filter for home (type + optional location keyword)
  const homeFilteredCars = useMemo(() => {
    const q = criteria.location.trim().toLowerCase();

    return cars.filter((c) => {
      const matchesLocation = !q ? true : c.location.toLowerCase().includes(q);

      const matchesType =
        selectedType === "all"
          ? true
          : c.vehicleType
          ? c.vehicleType === selectedType
          : true;

      return matchesLocation && matchesType;
    });
  }, [cars, criteria.location, selectedType]);

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Zipo" notificationCount={2} />

        {/* ✅ Location + Pickup date/time + Days (max 30) */}
        <HomeSearchPanel value={criteria} onChange={setCriteria} />

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
            onPressAction={() => {}}
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

  typeRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  bestRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },
});
