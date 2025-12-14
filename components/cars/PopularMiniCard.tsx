import React from "react";
import { Image, Pressable, Text, View, StyleSheet } from "react-native";
import type { Car } from "@/types/cars";
import { formatPricePerDay } from "@/lib/format";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export default function PopularMiniCard({
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
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {car.name}
        </Text>
        <Text style={styles.price}>{formatPricePerDay(car.pricePerDay)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
    width: 210,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  image: {
    width: 80,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: "#E5E7EB",
  },
  meta: { flex: 1 },
  name: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  price: { marginTop: 4, fontSize: 12, color: COLORS.muted, fontWeight: "600" },
});
