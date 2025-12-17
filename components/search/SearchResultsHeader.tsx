import React, { forwardRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import { addDays } from "@/lib/date";

function titleCaseCity(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fmtPrettyRange(pickupAt: Date, days: number) {
  const end = addDays(pickupAt, Math.max(1, days));

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const month = (d: Date) => d.toLocaleString("en-US", { month: "short" });

  const fmt = (d: Date) => {
    const dd = pad2(d.getDate());
    const MMM = month(d);
    const yyyy = d.getFullYear();

    let h = d.getHours();
    const m = pad2(d.getMinutes());
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    return `${dd}-${MMM}-${yyyy} ${pad2(h)}:${m}${ampm}`;
  };

  return `${fmt(pickupAt)} - ${fmt(end)}`;
}

type Props = {
  city: string;
  pickupAt: Date;
  days: number;
  onPressBack: () => void;
  onPressPill?: () => void;
  pillHidden?: boolean;
};

// ✅ forwardRef gives parent direct access to measureInWindow
const SearchResultsHeader = forwardRef<View, Props>(
  function SearchResultsHeader(
    { city, pickupAt, days, onPressBack, onPressPill, pillHidden },
    pillRef
  ) {
    return (
      <View style={styles.row}>
        <Pressable
          onPress={onPressBack}
          style={[styles.backBtn, SHADOW_CARD]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={18} color={COLORS.text} />
        </Pressable>

        <Pressable
          ref={pillRef as any}
          onPress={onPressPill}
          style={[styles.pill, SHADOW_CARD, pillHidden ? { opacity: 0 } : null]}
          accessibilityRole="button"
        >
          <Text style={styles.city} numberOfLines={1}>
            {titleCaseCity(city) || "Search"}
          </Text>

          {/* ✅ allow wrap, no truncation */}
          <Text style={styles.dates} numberOfLines={2}>
            {fmtPrettyRange(pickupAt, days)}
          </Text>
        </Pressable>
      </View>
    );
  }
);

export default SearchResultsHeader;

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
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  city: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  dates: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    lineHeight: 16,
  },
});
