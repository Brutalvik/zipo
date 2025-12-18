import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export type NearbyFilters = {
  vehicleType: string | null; // null = Any
  transmission: "Automatic" | "Manual" | null; // null = Any
  fuelType: "Gas" | "Diesel" | "Hybrid" | "Electric" | null; // null = Any
  minSeats: number | null; // null = Any, 5 means 5+
  minRating: number; // 5.0 means "Any"
  maxPricePerDay: number; // 300 means "300+ (no cap)"
};

const VEHICLE_TYPES = [
  "Any",
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Truck",
  "Coupe",
  "Convertible",
];

const TRANSMISSIONS = ["Any", "Automatic", "Manual"] as const;
const FUEL_TYPES = ["Any", "Gas", "Diesel", "Hybrid", "Electric"] as const;

const MAX_SEATS_FILTER = 5;

const PRICE_MIN = 20;
const PRICE_MAX = 300; // 300 => "300+ (no cap)"

const BARS = 34;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function chipSelected(val: string, selected: string) {
  return val.toLowerCase() === selected.toLowerCase();
}

function isFiltersEmpty(f: NearbyFilters) {
  return (
    f.vehicleType == null &&
    f.transmission == null &&
    f.fuelType == null &&
    f.minSeats == null &&
    f.minRating >= 5 &&
    f.maxPricePerDay >= PRICE_MAX
  );
}

export const DEFAULT_FILTERS: NearbyFilters = {
  vehicleType: null,
  transmission: null,
  fuelType: null,
  minSeats: null,
  minRating: 5.0, // 5.0★ means Any
  maxPricePerDay: PRICE_MAX, // 300+ means show all cars (no cap)
};

export default function NearbyFiltersModal({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: NearbyFilters;
  onClose: () => void;
  onApply: (next: NearbyFilters) => void;
}) {
  const [draft, setDraft] = useState<NearbyFilters>(initial);

  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const canClear = useMemo(() => !isFiltersEmpty(draft), [draft]);

  // ---- Price range (bars + slider + moving max pill) ----
  const [priceTrackW, setPriceTrackW] = useState(0);
  const thumbSize = 28; // good-enough thumb width for iOS+Android
  const padX = 10;

  const priceRatio = useMemo(() => {
    return (draft.maxPricePerDay - PRICE_MIN) / (PRICE_MAX - PRICE_MIN);
  }, [draft.maxPricePerDay]);

  const activeBars = useMemo(() => {
    return Math.round(clamp(priceRatio, 0, 1) * (BARS - 1));
  }, [priceRatio]);

  const maxPillText = useMemo(() => {
    if (draft.maxPricePerDay >= PRICE_MAX) return `$${PRICE_MAX}+`;
    return `$${draft.maxPricePerDay}`;
  }, [draft.maxPricePerDay]);

  const maxPillTranslateX = useMemo(() => {
    const usable = Math.max(0, priceTrackW - thumbSize - padX * 2);
    const ratio = clamp(priceRatio, 0, 1);
    return padX + usable * ratio;
  }, [priceRatio, priceTrackW]);

  const barHeights = useMemo(() => {
    // simple pleasing distribution (peaks near middle)
    const h: number[] = [];
    for (let i = 0; i < BARS; i++) {
      const t = i / (BARS - 1);
      const bell = Math.exp(-Math.pow((t - 0.5) / 0.22, 2)); // 0..1
      const px = 8 + bell * 28; // 8..36
      h.push(px);
    }
    return h;
  }, []);

  const ratingLabel = useMemo(() => {
    // 5.0 means Any, but UI should show "5.0★" (your requirement)
    return draft.minRating.toFixed(1);
  }, [draft.minRating]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Close</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Filters</Text>

          <Pressable
            onPress={() => setDraft(DEFAULT_FILTERS)}
            style={[styles.headerBtn, !canClear && styles.headerBtnDisabled]}
            disabled={!canClear}
          >
            <Text
              style={[
                styles.headerBtnText,
                !canClear && styles.headerBtnTextDisabled,
              ]}
            >
              Clear
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle type */}
          <View style={[styles.card, SHADOW_CARD]}>
            <Text style={styles.cardTitle}>Vehicle type</Text>
            <View style={styles.chipsWrap}>
              {VEHICLE_TYPES.map((t) => {
                const selected =
                  (t === "Any" && draft.vehicleType == null) ||
                  (draft.vehicleType != null &&
                    chipSelected(t, draft.vehicleType));

                return (
                  <Pressable
                    key={t}
                    onPress={() =>
                      setDraft((p) => ({
                        ...p,
                        vehicleType: t === "Any" ? null : t,
                      }))
                    }
                    style={[
                      styles.chip,
                      selected ? styles.chipOn : styles.chipOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected ? styles.chipTextOn : styles.chipTextOff,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Transmission */}
          <View style={[styles.card, SHADOW_CARD]}>
            <Text style={styles.cardTitle}>Transmission</Text>
            <View style={styles.chipsWrap}>
              {TRANSMISSIONS.map((t) => {
                const selected =
                  (t === "Any" && draft.transmission == null) ||
                  (draft.transmission != null && t === draft.transmission);

                return (
                  <Pressable
                    key={t}
                    onPress={() =>
                      setDraft((p) => ({
                        ...p,
                        transmission: t === "Any" ? null : (t as any),
                      }))
                    }
                    style={[
                      styles.chip,
                      selected ? styles.chipOn : styles.chipOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected ? styles.chipTextOn : styles.chipTextOff,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Fuel */}
          <View style={[styles.card, SHADOW_CARD]}>
            <Text style={styles.cardTitle}>Fuel type</Text>
            <View style={styles.chipsWrap}>
              {FUEL_TYPES.map((t) => {
                const selected =
                  (t === "Any" && draft.fuelType == null) ||
                  (draft.fuelType != null && t === draft.fuelType);

                return (
                  <Pressable
                    key={t}
                    onPress={() =>
                      setDraft((p) => ({
                        ...p,
                        fuelType: t === "Any" ? null : (t as any),
                      }))
                    }
                    style={[
                      styles.chip,
                      selected ? styles.chipOn : styles.chipOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected ? styles.chipTextOn : styles.chipTextOff,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Seats + rating */}
          <View style={[styles.card, SHADOW_CARD]}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Minimum seats</Text>
                <Text style={styles.bigInline}>
                  {draft.minSeats == null
                    ? "Any"
                    : draft.minSeats >= MAX_SEATS_FILTER
                    ? "5+"
                    : String(draft.minSeats)}
                </Text>

                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() =>
                      setDraft((p) => {
                        const cur = p.minSeats;
                        if (cur == null) return p;
                        if (cur === 1) return { ...p, minSeats: null }; // 1 -> Any
                        return { ...p, minSeats: Math.max(1, cur - 1) };
                      })
                    }
                    style={[
                      styles.stepBtn,
                      SHADOW_CARD,
                      draft.minSeats == null ? styles.stepBtnDisabled : null,
                    ]}
                    disabled={draft.minSeats == null}
                  >
                    <Feather name="minus" size={18} color={COLORS.text} />
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setDraft((p) => {
                        const cur = p.minSeats ?? 0; // Any -> 0
                        const next = Math.min(MAX_SEATS_FILTER, cur + 1);
                        return { ...p, minSeats: next < 1 ? 1 : next };
                      })
                    }
                    style={[
                      styles.stepBtn,
                      SHADOW_CARD,
                      draft.minSeats === MAX_SEATS_FILTER
                        ? styles.stepBtnDisabled
                        : null,
                    ]}
                    disabled={draft.minSeats === MAX_SEATS_FILTER}
                  >
                    <Feather name="plus" size={18} color={COLORS.text} />
                  </Pressable>
                </View>
              </View>

              <View style={{ width: 14 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Min rating</Text>

                <View style={styles.ratingValueRow}>
                  <Text style={styles.ratingValueText}>{ratingLabel}</Text>
                  <FontAwesome
                    name="star"
                    size={14}
                    color={COLORS.amber}
                    style={{ marginTop: 1 }}
                  />
                </View>

                <Slider
                  value={draft.minRating}
                  minimumValue={0}
                  maximumValue={5}
                  step={0.5}
                  minimumTrackTintColor={COLORS.black}
                  maximumTrackTintColor={"rgba(0,0,0,0.14)"}
                  thumbTintColor={COLORS.black}
                  onValueChange={(v) =>
                    setDraft((p) => ({
                      ...p,
                      // force 5.0 as "Any" default UX if they slide to end
                      minRating: clamp(v, 0, 5),
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* Price range */}
          <View style={[styles.card, SHADOW_CARD]}>
            <Text style={styles.cardTitle}>Price range</Text>
            <Text style={styles.helperText}>Set a maximum daily price.</Text>

            {/* Bars */}
            <View style={styles.barsWrap}>
              {barHeights.map((h, i) => {
                const isActive = i <= activeBars;
                return (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: isActive
                          ? COLORS.black
                          : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Slider (tight under bars) */}
            <View
              style={styles.priceSliderWrap}
              onLayout={(e) => setPriceTrackW(e.nativeEvent.layout.width)}
            >
              {/* Moving max pill */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.movingMaxPill,
                  { transform: [{ translateX: maxPillTranslateX }] },
                ]}
              >
                <Text style={styles.movingMaxPillText}>{maxPillText}</Text>
              </Animated.View>

              <Slider
                value={draft.maxPricePerDay}
                minimumValue={PRICE_MIN}
                maximumValue={PRICE_MAX}
                step={10}
                minimumTrackTintColor={COLORS.black}
                maximumTrackTintColor={"rgba(0,0,0,0.14)"}
                thumbTintColor={COLORS.black}
                onValueChange={(v) =>
                  setDraft((p) => ({
                    ...p,
                    maxPricePerDay: clamp(v, PRICE_MIN, PRICE_MAX),
                  }))
                }
              />
            </View>

            {/* Min / Max pills */}
            <View style={styles.minMaxRow}>
              <View style={styles.minMaxCol}>
                <Text style={styles.minMaxLabel}>Minimum</Text>
                <View style={[styles.pricePill, SHADOW_CARD]}>
                  <Text style={styles.pricePillText}>${PRICE_MIN}</Text>
                </View>
              </View>

              <View style={[styles.minMaxCol, styles.minMaxColRight]}>
                <Text style={styles.minMaxLabel}>Maximum</Text>
                <View style={[styles.pricePill, SHADOW_CARD]}>
                  <Text style={styles.pricePillText}>
                    {draft.maxPricePerDay >= PRICE_MAX
                      ? `$${PRICE_MAX}+`
                      : `$${draft.maxPricePerDay}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Apply bar pinned */}
        <View style={styles.applyBar}>
          <Pressable
            onPress={() => onApply(draft)}
            style={[styles.applyBtn, SHADOW_CARD]}
            accessibilityRole="button"
          >
            <Text style={styles.applyText}>Apply filters</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const APPLY_BAR_HEIGHT = 18 + 10 + 14 + 14;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },

  header: {
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  headerBtnDisabled: { opacity: 0.5 },
  headerBtnText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  headerBtnTextDisabled: { color: COLORS.muted },

  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: APPLY_BAR_HEIGHT,
    gap: 14,
  },

  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: "900", color: COLORS.muted },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipOff: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  chipText: { fontSize: 13, fontWeight: "900" },
  chipTextOn: { color: COLORS.white },
  chipTextOff: { color: COLORS.text },

  twoColRow: { flexDirection: "row", alignItems: "flex-start" },
  bigInline: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.45 },

  ratingValueRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingValueText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 22,
  },

  // Bars
  barsWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  bar: {
    width: 6,
    borderRadius: 999,
  },

  // Slider tight under bars
  priceSliderWrap: {
    marginTop: 2, // very close to bars
    paddingHorizontal: 2,
    position: "relative",
  },

  movingMaxPill: {
    position: "absolute",
    top: -40,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  movingMaxPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },

  // Min/Max row - responsive (no fixed gap)
  minMaxRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  minMaxCol: {
    alignItems: "flex-start",
    flexShrink: 1,
  },
  minMaxColRight: {
    alignItems: "flex-end",
  },
  minMaxLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
  },
  pricePill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start", // prevents wide pill on Android
  },
  pricePillText: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },

  applyBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: "#F6F7FB",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  applyBtn: {
    backgroundColor: COLORS.black,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
});
