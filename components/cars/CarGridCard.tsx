import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import type { Car } from "@/types/car";
import { COLORS, RADIUS } from "@/theme/ui";
import { formatPricePerDay } from "@/lib/format";

type Props = {
  car: Car;
  onPress: () => void;
};

export default function CarGridCard({ car, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Image source={{ uri: car.imageUrl }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {car.title}
        </Text>

        <Text style={styles.location} numberOfLines={1}>
          {car.location}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatPricePerDay(car.pricePerDay)}</Text>
          <View style={styles.rating}>
            <Text style={styles.ratingText}>{car.rating.toFixed(1)} ⭐</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.border,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  location: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
  },
});
