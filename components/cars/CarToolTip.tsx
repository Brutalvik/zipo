import React, { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

type ApiCarLike = {
  id?: string;
  title?: string;
  imageUrl: string;
  pricePerDay: number;
  currency?: string;

  vehicleType?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  seats?: number | null;
  year?: number | null;

  rating: number;
  reviews?: number;

  address?: {
    city?: string | null;
    area?: string | null;
    countryCode?: string | null;
  };

  isPopular?: boolean;
  isFeatured?: boolean;
};

type CarToolTipProps = {
  car: ApiCarLike;
  isSelected: boolean;
};

export function CarToolTip({ car }: CarToolTipProps) {
  const [liked, setLiked] = useState(false);

  const showRating = useMemo(() => {
    const r = Number(car.rating);
    return Number.isFinite(r) && r > 0;
  }, [car.rating]);

  const title = (car.title ?? "").trim();

  const locationLine = [
    car.address?.area ?? null,
    car.address?.city ?? null,
    car.address?.countryCode ?? null,
  ]
    .filter(Boolean)
    .join(", ");

  const chips = [
    car.year ? { icon: "calendar", text: String(car.year) } : null,
    car.transmission
      ? { icon: "repeat", text: titleCase(car.transmission) }
      : null,
    typeof car.seats === "number" && car.seats > 0
      ? { icon: "users", text: `${car.seats} seats` }
      : null,
    car.fuelType ? { icon: "droplet", text: titleCase(car.fuelType) } : null,
  ].filter(Boolean) as { icon: any; text: string }[];

  const badge = car.isFeatured ? "Featured" : car.isPopular ? "Popular" : null;

  return (
    <View style={styles.container}>
      <View style={styles.arrow} />

      <View style={styles.card}>
        <View style={styles.hero}>
          <Image source={{ uri: car.imageUrl }} style={styles.image} />
          <View style={styles.overlay} />

          {badge ? (
            <BlurView intensity={38} tint="light" style={styles.badgePill}>
              <Text style={styles.badgePillText}>{badge}</Text>
            </BlurView>
          ) : null}

          <Pressable
            onPress={() => {
              setLiked((v) => {
                const next = !v;
                console.log("[favorite] toggled", {
                  carId: car.id,
                  liked: next,
                });
                return next;
              });
            }}
            style={styles.heartBtn}
            hitSlop={12}
          >
            <BlurView intensity={55} tint="light" style={styles.heartBlur}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={20}
                color={liked ? "#E11D48" : "#0B1220"}
              />
            </BlurView>
          </Pressable>

          <View style={styles.heroText}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}

            <View style={styles.heroBottomRow}>
              <Text style={styles.price}>
                ${car.pricePerDay}
                <Text style={styles.perDay}> / day</Text>
              </Text>

              {showRating ? (
                <BlurView intensity={38} tint="light" style={styles.ratingPill}>
                  <Text style={styles.star}>★</Text>
                  <Text style={styles.ratingText}>
                    {Number(car.rating).toFixed(1)}
                    {typeof car.reviews === "number" && car.reviews > 0
                      ? ` (${car.reviews})`
                      : ""}
                  </Text>
                </BlurView>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {chips.length ? (
            <View style={styles.chipRow}>
              {chips.map((c) => (
                <View key={c.text} style={styles.chip}>
                  <Feather name={c.icon} size={12} color="#111827" />
                  <Text style={styles.chipText}>{c.text}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {locationLine ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLine}
              </Text>
            </View>
          ) : null}

          {car.vehicleType ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {titleCase(car.vehicleType)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tap to view details →</Text>
          <Feather name="arrow-right" size={14} color="#111827" />
        </View>
      </View>
    </View>
  );
}

function titleCase(s: string) {
  return String(s)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },

  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginBottom: -1,
  },

  card: {
    width: 250,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
  },

  hero: { position: "relative" },
  image: { width: "100%", height: 135, backgroundColor: "#eee" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },

  badgePill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },

  badgePillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0B1220",
  },

  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: "hidden",
  },

  heartBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  heroText: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.38)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  heroBottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  price: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.38)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  perDay: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.9)" },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },

  star: { color: "#F59E0B", fontSize: 12, marginTop: -1 },

  ratingText: { fontSize: 12, fontWeight: "900", color: "#0B1220" },

  body: { padding: 12 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },

  chipText: { fontSize: 11, fontWeight: "900", color: "#111827" },

  locationRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  locationText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#6B7280" },

  typeBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  typeBadgeText: { fontSize: 11, fontWeight: "900", color: "#111827" },

  footer: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  footerText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },
});
