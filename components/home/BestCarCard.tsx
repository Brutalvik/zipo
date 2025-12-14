import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Car } from "@/types/cars";
import { formatPricePerDay } from "@/lib/format";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  car: Car;
  isFav?: boolean;
  onPress?: () => void;
  onPressFav?: () => void;
};

export default function BestCarCard({
  car,
  isFav,
  onPress,
  onPressFav,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, SHADOW_CARD]}
      accessibilityRole="button"
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: car.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <Pressable
          onPress={onPressFav}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityLabel="Favorite"
        >
          <Feather
            name="heart"
            size={16}
            color={isFav ? "#EF4444" : COLORS.text}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {car.name}
        </Text>

        <View style={styles.ratingRow}>
          <Text style={styles.rating}>{car.rating.toFixed(1)}</Text>
          <Text style={styles.star}>★</Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={COLORS.muted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {car.location}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="users" size={12} color={COLORS.muted} />
          <Text style={styles.metaText}>{car.seats} Seats</Text>

          <View style={{ flex: 1 }} />
          <Text style={styles.price}>{formatPricePerDay(car.pricePerDay)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 190,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginRight: 14,
  },
  imageWrap: { position: "relative", backgroundColor: "#EFEFEF" },
  image: { width: "100%", height: 115 },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 12 },
  name: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  ratingRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rating: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  star: { fontSize: 12, color: "#F59E0B" },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
    flexShrink: 1,
  },
  price: { fontSize: 12, fontWeight: "900", color: COLORS.text },
});
