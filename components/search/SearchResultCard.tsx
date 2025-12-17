import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Car } from "@/types/car";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { formatPricePerDay } from "@/lib/format";

export default function SearchResultCard({
  car,
  onPress,
  onPressFav,
  isFav,
}: {
  car: Car;
  onPress?: () => void;
  onPressFav?: () => void;
  isFav?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card, SHADOW_CARD]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: car.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* heart like screenshot: white circle */}
        <Pressable
          onPress={onPressFav}
          style={[styles.heart, SHADOW_CARD]}
          accessibilityRole="button"
        >
          <Feather
            name="heart"
            size={16}
            color={isFav ? "#EF4444" : "#111827"}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {car.title}
          </Text>

          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              {formatPricePerDay(car.pricePerDay)}
            </Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={styles.rating}>{car.rating.toFixed(1)}</Text>
          <Text style={styles.star}>★</Text>
          <Text style={styles.dot}>•</Text>

          <Feather name="map-pin" size={14} color={COLORS.muted} />
          <Text style={styles.muted} numberOfLines={1}>
            {car.location}
          </Text>
        </View>

        <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
          <View style={styles.metaPill}>
            <Feather name="users" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{car.seats ?? "—"} seats</Text>
          </View>

          <View style={styles.metaPill}>
            <Feather name="settings" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{car.transmission ?? "—"}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  imageWrap: { position: "relative", backgroundColor: "#E5E7EB" },
  image: { width: "100%", height: 210 },

  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: 14 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.text },

  pricePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  priceText: { fontSize: 13, fontWeight: "900", color: COLORS.text },

  row: { flexDirection: "row", alignItems: "center" },
  rating: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  star: { marginLeft: 4, fontSize: 13, fontWeight: "900", color: "#F59E0B" },
  dot: { marginHorizontal: 8, color: COLORS.muted, fontWeight: "900" },
  muted: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    flexShrink: 1,
  },

  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
  },
  metaText: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
});
