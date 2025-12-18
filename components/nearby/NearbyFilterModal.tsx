import React, { useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export type NearbyFilters = {
  vehicleType: string | null;
  transmission: "Automatic" | "Manual" | null;
  fuelType: "Gas" | "Diesel" | "Hybrid" | "Electric" | null;
  minSeats: number | null;

  // NOTE: "Any" is represented as 5.0 (max) in UI + logic
  minRating: number; // 0..5, step 0.5 (default 5.0)

  // Price cap: 300 means "300+ (no cap)"
  maxPricePerDay: number;

  // kept for compatibility with any existing imports; not used in UI
  maxPriceEnabled?: boolean;

  // removed from UI; kept for compatibility
  onlyWithPhotos?: boolean;
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

// Price range UI constants
const PRICE_MIN = 20;
const PRICE_MAX = 300;

function chipSelected(val: string, selected: string) {
  return val.toLowerCase() === selected.toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFiltersEmpty(f: NearbyFilters) {
  const priceNoCap = (f.maxPricePerDay ?? PRICE_MAX) >= PRICE_MAX;
  const seatsAny = f.minSeats == null;
  const typeAny = f.vehicleType == null;
  const transAny = f.transmission == null;
  const fuelAny = f.fuelType == null;
  const ratingAny = (f.minRating ?? 5) >= 5;

  return typeAny && transAny && fuelAny && seatsAny && ratingAny && priceNoCap;
}

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
  const priceValue = clamp(
    draft.maxPricePerDay ?? PRICE_MAX,
    PRICE_MIN,
    PRICE_MAX
  );

  const [priceTrackW, setPriceTrackW] = useState(0);
  const thumbSize = 28; // approximate thumb width (good enough)
  const padX = 8; // horizontal padding inside slider wrap

  const priceAnim = useRef(new Animated.Value(priceValue)).current;

  const maxPillText = useMemo(() => {
    if (priceValue >= PRICE_MAX) return `$${PRICE_MAX}+`;
    return `$${priceValue}`;
  }, [priceValue]);

  const maxPillTranslateX = useMemo(() => {
    const usable = Math.max(0, priceTrackW - thumbSize - padX * 2);
    // clamp ratio 0..1
    const ratio = (priceValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN);
    return padX + usable * Math.max(0, Math.min(1, ratio));
  }, [priceValue, priceTrackW]);

  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const canClear = useMemo(() => !isFiltersEmpty(draft), [draft]);

  // histogram bars (static distribution; “filled” portion animates via value)
  const histBars = useMemo(() => {
    const base = [
      2, 3, 4, 6, 5, 7, 9, 12, 10, 14, 18, 12, 20, 26, 18, 16, 22, 19, 17, 21,
      15, 13, 11, 9, 8, 7, 6, 5, 4, 4,
    ];
    const max = Math.max(...base);
    return base.map((v) => v / max);
  }, []);

  // map priceValue into a "filled bar count"
  const filledCount = useMemo(() => {
    const n = histBars.length;
    const t = (priceValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN); // 0..1
    return Math.max(0, Math.min(n, Math.round(t * n)));
  }, [priceValue, histBars.length]);

  const ratingLabel = useMemo(() => {
    // default 5.0 means "Any" (show star icon + 5.0 as per instruction)
    const r = clamp(draft.minRating ?? 5, 0, 5);
    return r.toFixed(1);
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

        {/* Scrollable content */}
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
                  (t === "Any" && draft?.vehicleType == null) ||
                  (draft?.vehicleType != null &&
                    chipSelected(t, draft?.vehicleType));

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
                <Text style={styles.cardTitle}>Seats</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() =>
                      setDraft((p) => {
                        const cur = p.minSeats;
                        if (cur == null) return p;
                        if (cur === 1) return { ...p, minSeats: null };
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

                  <Text style={styles.inlineValue}>
                    {draft.minSeats == null
                      ? "Any"
                      : draft.minSeats >= MAX_SEATS_FILTER
                      ? "5+"
                      : draft.minSeats}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setDraft((p) => {
                        const cur = p.minSeats ?? 0;
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
                <Text style={styles.cardTitle}>Min Rating</Text>

                {/* default is 5.0 with star icon (represents Any) */}
                <View style={styles.ratingValueRow}>
                  <Text style={styles.ratingValueText}>{ratingLabel}</Text>
                  <FontAwesome name="star" size={14} color={COLORS.amber} />
                </View>

                <Slider
                  value={draft.minRating ?? 5}
                  minimumValue={0}
                  maximumValue={5}
                  step={0.5}
                  minimumTrackTintColor={COLORS.black}
                  maximumTrackTintColor={"rgba(0,0,0,0.14)"}
                  thumbTintColor={COLORS.black}
                  onValueChange={(v) =>
                    setDraft((p) => ({
                      ...p,
                      minRating: v, // keep 5.0 as "Any"
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* ✅ Price range: bars + slider tight, no circles, animated filled bars */}
          <View style={[styles.card, SHADOW_CARD]}>
            <Text style={styles.cardTitle}>Price range</Text>
            <Text style={styles.helperText}>Set a maximum daily price.</Text>

            {/* Bars */}
            <View style={styles.priceBarsWrap}>
              <View style={styles.histRow}>
                {histBars.map((h, i) => {
                  const isFilled = i <= filledCount;
                  return (
                    <View
                      key={`${i}`}
                      style={[
                        styles.histBar,
                        {
                          height: 10 + Math.round(h * 28),
                          backgroundColor: isFilled
                            ? "rgba(17,24,39,0.92)"
                            : "rgba(17,24,39,0.10)",
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Slider directly under bars (no gap) */}
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
                value={priceValue}
                minimumValue={PRICE_MIN}
                maximumValue={PRICE_MAX}
                step={10}
                minimumTrackTintColor={COLORS.black}
                maximumTrackTintColor={"rgba(0,0,0,0.14)"}
                thumbTintColor={COLORS.black}
                onValueChange={(v) => {
                  const vv = clamp(v, PRICE_MIN, PRICE_MAX);
                  setDraft((p) => ({ ...p, maxPricePerDay: vv }));
                  priceAnim.setValue(vv);
                }}
              />
            </View>

            {/* Min/Max pills (fixed width, not stretched) */}
            <View style={styles.minMaxRow}>
              <View style={styles.minMaxCol}>
                <Text style={styles.minMaxLabel}>Minimum</Text>
                <View style={styles.minMaxPill}>
                  <Text style={styles.minMaxPillText}>${PRICE_MIN}</Text>
                </View>
              </View>

              <View style={styles.minMaxColRight}>
                <Text style={styles.minMaxLabelRight}>Maximum</Text>
                <View style={styles.minMaxPill}>
                  <Text style={styles.minMaxPillText}>${PRICE_MAX}+</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ✅ removed: Only cars with photos */}
        </ScrollView>

        {/* Apply bar pinned */}
        <View style={styles.applyBar}>
          <Pressable
            onPress={() => onApply(normalizeForApply(draft))}
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

/**
 * Ensures "300+" behavior:
 * - If slider is at 300, treat as NO CAP (so Nearby screen should not apply <= filter)
 */
function normalizeForApply(d: NearbyFilters): NearbyFilters {
  const v = clamp(d.maxPricePerDay ?? PRICE_MAX, PRICE_MIN, PRICE_MAX);
  return {
    ...d,
    maxPricePerDay: v,
    maxPriceEnabled: false, // kept for backward compatibility only
    onlyWithPhotos: false,
  };
}

export const DEFAULT_FILTERS: NearbyFilters = {
  vehicleType: null,
  transmission: null,
  fuelType: null,
  minSeats: null,

  // Default is 5.0 with star icon meaning "Any"
  minRating: 5.0,

  // Default is 300 => "300+ (no cap)"
  maxPricePerDay: PRICE_MAX,

  maxPriceEnabled: false,
  onlyWithPhotos: false,
};

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
  inlineValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  ratingValueRow: {
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
  stepBtnDisabled: {
    opacity: 0.45,
  },

  // ---- Price range (tight bars + slider) ----
  priceBarsWrap: {
    marginTop: 12,
    height: 46,
    justifyContent: "flex-end",
  },
  histRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  histBar: {
    width: 6,
    borderRadius: 4,
  },
  priceSliderWrap: {
    marginTop: -2, // tight to bars (no gap)
    paddingHorizontal: 2,
    position: "relative",
  },

  movingMaxPill: {
    position: "absolute",
    top: -34, // sits just above slider
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

  minMaxRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  minMaxCol: {
    flexShrink: 1,
    alignItems: "flex-start",
  },
  minMaxColRight: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  minMaxLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 8,
  },
  minMaxLabelRight: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 8,
    textAlign: "right",
  },
  minMaxPill: {
    alignSelf: "flex-start", // prevents stretching
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#fff",
  },
  minMaxPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  // Apply bar pinned
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
