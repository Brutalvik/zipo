import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import type { Car } from "@/types/car";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { formatPricePerDay } from "@/lib/format";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa =
    s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * (s2 * s2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export default function SearchResultCard({
  car,
  onPress,
  onPressFav,
  isFav,
  originLat,
  originLng,
  originLabel = "address",
}: {
  car: Car;
  onPress?: () => void;
  onPressFav?: () => void;
  isFav?: boolean;
  originLat?: number;
  originLng?: number;
  originLabel?: string; 
}) {
  const distanceText = useMemo(() => {
    if (
      originLat == null ||
      originLng == null ||
      car.pickupLat == null ||
      car.pickupLng == null
    ) {
      return null;
    }

    const km = haversineKm(originLat, originLng, car.pickupLat, car.pickupLng);
    if (!Number.isFinite(km)) return null;

    return `${km.toFixed(1)} km from ${originLabel}`;
  }, [originLat, originLng, car.pickupLat, car.pickupLng, originLabel]);

  return (
    <Pressable onPress={onPress} style={[styles.card, SHADOW_CARD]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: car.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        <Pressable
          onPress={onPressFav}
          style={[styles.heart, SHADOW_CARD]}
          accessibilityRole="button"
        >
          <FontAwesome
            name={isFav ? "heart" : "heart-o"}
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
          <FontAwesome
            name="star"
            size={13}
            color="#F59E0B"
            style={{ marginLeft: 4 }}
          />
          <Text style={styles.dot}>•</Text>

          <FontAwesome name="map-marker" size={14} color={COLORS.muted} />
          <Text style={styles.muted} numberOfLines={1}>
            {car.location}
          </Text>
        </View>

        {/* ✅ distance line like Turo (only if coords available) */}
        {distanceText ? (
          <View style={[styles.row, { marginTop: 6 }]}>
            <FontAwesome name="location-arrow" size={12} color={COLORS.muted} />
            <Text style={styles.distance} numberOfLines={1}>
              {distanceText}
            </Text>
          </View>
        ) : null}

        <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
          <View style={styles.metaPill}>
            <FontAwesome name="users" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{car.seats ?? "—"} seats</Text>
          </View>

          <View style={styles.metaPill}>
            <FontAwesome name="cog" size={12} color={COLORS.muted} />
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
  dot: { marginHorizontal: 8, color: COLORS.muted, fontWeight: "900" },
  muted: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    flexShrink: 1,
  },

  distance: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "800",
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
