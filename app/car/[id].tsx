import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchCarById,
  selectCarById,
  selectCarStatusById,
} from "@/redux/slices/carSlice";
import { COLORS, RADIUS } from "@/theme/ui";

export default function CarDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const car = useAppSelector(id ? selectCarById(id) : () => null);
  const status = useAppSelector(id ? selectCarStatusById(id) : () => "idle");

  useEffect(() => {
    if (id && !car) {
      dispatch(fetchCarById(id));
    }
  }, [id, car, dispatch]);

  if (!car || status === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loading}>Loading car details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* TITLE */}
        <Text style={styles.title}>{car.title}</Text>

        {/* LOCATION */}
        <Text style={styles.subtitle}>
          {car.location || car.city || "Location not specified"}
        </Text>

        {/* RATING */}
        <View style={styles.row}>
          {car.reviews > 0 ? (
            <Text style={styles.rating}>
              ⭐ {car.rating.toFixed(1)} · {car.reviews} reviews
            </Text>
          ) : (
            <Text style={styles.noReviews}>No reviews yet</Text>
          )}
        </View>

        {/* PRICE */}
        <View style={styles.card}>
          <Text style={styles.label}>Price per day</Text>
          <Text style={styles.value}>
            {car.currency} {car.pricePerDay}
          </Text>
        </View>

        {/* VEHICLE INFO */}
        <View style={styles.card}>
          <Text style={styles.label}>Vehicle details</Text>

          <Spec label="Make" value={car.make} />
          <Spec label="Model" value={car.model} />
          <Spec label="Year" value={car.year} />
          <Spec label="Body type" value={car.bodyType} />
          <Spec label="Fuel" value={car.fuelType} />
          <Spec label="Transmission" value={car.transmission} />
          <Spec label="Seats" value={car.seats} />
          <Spec label="Doors" value={car.doors} />
          <Spec label="EV range (km)" value={car.evRangeKm} />
        </View>

        {/* FLAGS */}
        {(car.isFeatured || car.isPopular) && (
          <View style={styles.card}>
            <Text style={styles.label}>Highlights</Text>
            {car.isFeatured && <Text style={styles.badge}>🌟 Featured</Text>}
            {car.isPopular && <Text style={styles.badge}>🔥 Popular</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- */
/* Small helper component        */
/* ----------------------------- */
function Spec({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{String(value)}</Text>
    </View>
  );
}

/* ----------------------------- */
/* Styles                        */
/* ----------------------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  row: {
    marginTop: 10,
  },
  rating: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  noReviews: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  card: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: RADIUS.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  specLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  specValue: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  badge: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
  },
});
