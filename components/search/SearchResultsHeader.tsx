import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { titleCaseCity } from "./helpers";

function fmtRange(pickupAt: Date, days: number) {
  const start = new Date(pickupAt);
  const end = new Date(pickupAt);
  end.setDate(end.getDate() + Math.max(1, days));

  // simple MM-DD
  const mmdd = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return `${mmdd(start)} - ${mmdd(end)}`;
}

export default function SearchResultsHeader({
  city,
  pickupAt,
  days,
  onPressBack,
}: {
  city: string;
  pickupAt: Date;
  days: number;
  onPressBack: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPressBack} style={[styles.backBtn, SHADOW_CARD]}>
        <Feather name="chevron-left" size={18} color={COLORS.text} />
      </Pressable>

      <View style={[styles.pill, SHADOW_CARD]}>
        <Text style={styles.city} numberOfLines={1}>
          {titleCaseCity(city) || "Search"}
        </Text>
        <Text style={styles.dates}>{fmtRange(pickupAt, days)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flex: 1,
    paddingLeft: 14,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  city: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  dates: { marginTop: 2, fontSize: 12, fontWeight: "800", color: COLORS.muted },
});
