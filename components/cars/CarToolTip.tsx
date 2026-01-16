import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type ApiCarLike = {
  imageUrl: string;
  pricePerDay: number;
  vehicleType?: string | null;
  rating: number;
};

type CarToolTipProps = {
  car: ApiCarLike;
  isSelected: boolean; // ✅ required
};

export function CarToolTip({ car, isSelected }: CarToolTipProps) {
  return (
    <View style={styles.container}>
      <View style={styles.arrow} />

      <View style={styles.card}>
        <Image
          key={car.imageUrl}
          source={{ uri: car.imageUrl }}
          style={styles.image}
        />

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
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
  },
  image: { width: "100%", height: 110, backgroundColor: "#eee" },
  info: { padding: 10 },
  price: { fontSize: 14, fontWeight: "700" },
  type: { fontSize: 12, color: "#666", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  star: { color: "#F5A623", marginRight: 4 },
  ratingText: { fontSize: 12, fontWeight: "500" },
});
