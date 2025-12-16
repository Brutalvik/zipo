import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Car } from "@/types/car";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { formatPricePerDay } from "@/lib/format";

export default function NearbyHeroCard({
  car,
  onPress,
}: {
  car: Car;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, SHADOW_CARD]}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: car.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* premium gradient-ish overlay */}
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.pill}>
            <Feather name="map-pin" size={12} color="#fff" />
            <Text style={styles.pillText}>Nearby</Text>
          </View>

          <View style={styles.pill}>
            <Feather name="dollar-sign" size={12} color="#fff" />
            <Text style={styles.pillText}>
              {formatPricePerDay(car.pricePerDay)}
            </Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {car.title}
        </Text>

        <Text style={styles.sub} numberOfLines={1}>
          {car.location} • {car.seats} seats • {car.rating.toFixed(1)}★
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  image: { width: "100%", height: 190, backgroundColor: "#E5E7EB" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  content: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  topRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  name: { color: "#fff", fontSize: 16, fontWeight: "900" },
  sub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
});
