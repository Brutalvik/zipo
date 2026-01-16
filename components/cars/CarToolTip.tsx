import React, { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

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
};

type CarToolTipProps = {
  car: ApiCarLike;
  isSelected: boolean; // required (even if not used)
};

export function CarToolTip({ car }: CarToolTipProps) {
  const [liked, setLiked] = useState(false);

  const showRating = useMemo(() => {
    const r = Number(car.rating);
    // hide if 0, NaN, or negative
    return Number.isFinite(r) && r > 0;
  }, [car.rating]);

  const title = (car.title ?? "").trim();
  const subtitleParts = [
    car.year ? String(car.year) : null,
    car.vehicleType ? titleCase(car.vehicleType) : null,
  ].filter(Boolean);

  const specParts = [
    car.transmission ? titleCase(car.transmission) : null,
    typeof car.seats === "number" && car.seats > 0
      ? `${car.seats} seats`
      : null,
    car.fuelType ? titleCase(car.fuelType) : null,
  ].filter(Boolean);

  const locationLine = [
    car.address?.area ?? null,
    car.address?.city ?? null,
    car.address?.countryCode ?? null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.container}>
      <View style={styles.arrow} />

      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            key={car.imageUrl}
            source={{ uri: car.imageUrl }}
            style={styles.image}
          />

          {/* Heart */}
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
            hitSlop={10}
          >
            <Feather
              name={liked ? "heart" : "heart"}
              size={16}
              color={liked ? "#E11D48" : "#111827"}
              // Feather doesn't have filled heart; we fake "filled" with bg + color
            />
          </Pressable>
        </View>

        <View style={styles.info}>
          {/* Title */}
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}

          {/* Subtitle: year + type */}
          {subtitleParts.length ? (
            <Text style={styles.subTitle} numberOfLines={1}>
              {subtitleParts.join(" • ")}
            </Text>
          ) : null}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${car.pricePerDay}
              <Text style={styles.perDay}> / day</Text>
            </Text>

            {/* Rating (only if > 0) */}
            {showRating ? (
              <View style={styles.ratingPill}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.ratingText}>
                  {Number(car.rating).toFixed(1)}
                  {typeof car.reviews === "number" && car.reviews > 0
                    ? ` (${car.reviews})`
                    : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Specs */}
          {specParts.length ? (
            <View style={styles.specRow}>
              {specParts.map((t) => (
                <View key={t} style={styles.specChip}>
                  <Text style={styles.specText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Location */}
          {locationLine ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLine}
              </Text>
            </View>
          ) : null}
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
    width: 240,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 6,
  },

  imageWrap: {
    position: "relative",
  },

  image: {
    width: "100%",
    height: 120,
    backgroundColor: "#eee",
  },

  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  info: {
    padding: 12,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  subTitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  price: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  perDay: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  star: {
    color: "#F59E0B",
    fontSize: 12,
    marginTop: -1,
  },

  ratingText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },

  specRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  specChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },

  specText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#111827",
  },

  locationRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  locationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
});
