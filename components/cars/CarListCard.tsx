import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Car } from "@/types/car";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { formatPricePerDay } from "@/lib/format";

type Props = {
  car: Car;
  onPress?: () => void;
  onPressFav?: () => void;
  isFav?: boolean;
};

export default function CarListCard({
  car,
  onPress,
  onPressFav,
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
            size={18}
            color={isFav ? "#EF4444" : COLORS.text}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>
            {car.title}
          </Text>

          <View style={styles.priceBox}>
            <Text style={styles.priceText}>
              {formatPricePerDay(car.pricePerDay)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.rating}>{car.rating.toFixed(1)}</Text>
          <Text style={styles.star}>★</Text>
          <Text style={styles.reviews}>({car.reviews})</Text>

          <View style={{ width: 10 }} />

          <Feather name="map-pin" size={13} color={COLORS.muted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {car.location}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="users" size={13} color={COLORS.muted} />
          <Text style={styles.metaText}>{car.seats ?? "—"} seats</Text>

          <View style={{ width: 10 }} />

          <Feather name="settings" size={13} color={COLORS.muted} />
          <Text style={styles.metaText}>{car.transmission ?? "—"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  imageWrap: { position: "relative", backgroundColor: "#E5E7EB" },
  image: { width: "100%", height: 210 },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  body: { padding: 14 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.text },
  priceBox: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  priceText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rating: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  star: { fontSize: 13, color: "#F59E0B" },
  reviews: { fontSize: 13, color: COLORS.muted, fontWeight: "700" },
  metaText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "700",
    flexShrink: 1,
  },
});
