import React from "react";
import { Image, Pressable, Text, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Car } from "@/types/cars";
import { formatPricePerDay } from "@/lib/format";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  car: Car;
  onPress?: () => void;
  onPressFav?: () => void;
  onPressBook?: () => void;
  isFav?: boolean;
};

export default function CarGridCard({
  car,
  onPress,
  onPressFav,
  onPressBook,
  isFav,
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
            color={isFav ? COLORS.red : COLORS.text}
          />
        </Pressable>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {car.name}
      </Text>

      <View style={styles.ratingRow}>
        <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
        <Text style={styles.star}>★</Text>
        <Text style={styles.reviews}>({car.reviews})</Text>
      </View>

      <View style={styles.locRow}>
        <Feather name="map-pin" size={12} color={COLORS.muted} />
        <Text style={styles.location} numberOfLines={1}>
          {car.location}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.price}>{formatPricePerDay(car.pricePerDay)}</Text>

        <Pressable
          onPress={onPressBook}
          style={styles.bookBtn}
          accessibilityRole="button"
        >
          <Text style={styles.bookText}>Book now</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  imageWrap: { position: "relative" },
  image: {
    width: "100%",
    height: 92,
    borderRadius: RADIUS.md,
    backgroundColor: "#E5E7EB",
  },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { marginTop: 8, fontSize: 13, fontWeight: "800", color: COLORS.text },
  ratingRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  star: { fontSize: 12, color: COLORS.amber },
  reviews: { fontSize: 12, color: COLORS.muted },
  locRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  location: { fontSize: 12, color: COLORS.muted, flex: 1 },
  bottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  bookBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  bookText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
});
