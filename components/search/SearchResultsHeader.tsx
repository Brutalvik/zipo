import React, { forwardRef, useMemo } from "react";
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

/**
 * Address-aware:
 * - If user typed a full address, show it as-is.
 * - If it's empty, fallback to "Search".
 * - If it looks like a city, title-case it.
 */
function displayLocationLine(location: string) {
  const raw = (location || "").trim();
  if (!raw) return "Search";

  // Heuristic: treat as address if it contains a number OR a comma (common in addresses)
  const looksLikeAddress = /\d/.test(raw) || raw.includes(",");

  if (looksLikeAddress) return raw;

  return titleCaseCity(raw) || raw;
}

// 17-Dec 3:50 PM (no year)
function fmtCompact(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const MMM = d.toLocaleString("en-US", { month: "short" });

  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${dd}-${MMM} ${h}:${m} ${ampm}`;
}

type Props = {
  city: string; 
  pickupAt: Date;
  days: number;
  onPressBack: () => void;
  onPressPill?: () => void;
  pillHidden?: boolean;
};

const SearchResultsHeader = forwardRef<View, Props>(
  function SearchResultsHeader(
    { city, pickupAt, days, onPressBack, onPressPill, pillHidden },
    pillRef
  ) {
    const rangeText = useMemo(() => {
      const end = addDays(pickupAt, Math.max(1, days));
      return `${fmtCompact(pickupAt)} - ${fmtCompact(end)}`;
    }, [pickupAt, days]);

    const topLine = useMemo(() => displayLocationLine(city), [city]);

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
          ref={pillRef}
          onPress={onPressPill}
          style={[
            styles.pill,
            SHADOW_CARD,
            pillHidden ? styles.pillHidden : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit search"
        >
          <Text style={styles.location} numberOfLines={1}>
            {topLine}
          </Text>

          {/* one line, no font shrink; year removed to fit */}
          <Text style={styles.range}>{rangeText}</Text>
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
  pillHidden: { opacity: 0 },

  location: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  range: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    letterSpacing: 0.2,
  },
});
