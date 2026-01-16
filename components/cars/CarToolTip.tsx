import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

// IMPORTANT: accept the shape you're actually passing from NearbyScreen
type ApiCarLike = {
  imageUrl: string;
  pricePerDay: number;
  vehicleType?: string | null;
  rating: number;
};

type CarToolTipProps = {
  car: ApiCarLike;
};

export function CarToolTip({ car }: CarToolTipProps) {
  return (
    <View style={styles.container}>
      {/* arrow */}
      <View style={styles.arrow} />

      <View style={styles.card}>
        <Image source={{ uri: car.imageUrl }} style={styles.image} />

        <View style={styles.info}>
          <Text style={styles.price}>${car.pricePerDay} / day</Text>
          <Text style={styles.type}>{car.vehicleType ?? ""}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingText}>
              {Number.isFinite(car.rating) ? car.rating.toFixed(1) : "0.0"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ NO absolute positioning in Callout content
  container: {
    alignItems: "center",
  },

  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    // small overlap so arrow touches card
    marginBottom: -1,
  },

  card: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
  },

  image: {
    width: "100%",
    height: 110,
    backgroundColor: "#eee",
  },

  info: {
    padding: 10,
  },

  price: {
    fontSize: 14,
    fontWeight: "700",
  },

  type: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  star: {
    color: "#F5A623",
    marginRight: 4,
  },

  ratingText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
