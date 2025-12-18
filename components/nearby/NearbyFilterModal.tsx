import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Switch,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export type NearbyFilters = {
  vehicleType: string | null;
  transmission: "Automatic" | "Manual" | null;
  fuelType: "Gas" | "Diesel" | "Hybrid" | "Electric" | null;
  minSeats: number | null;
  minRating: number | null;
  maxPriceEnabled: boolean;
  maxPricePerDay: number;
  onlyWithPhotos: boolean;
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

function chipSelected(val: string, selected: string) {
  return val.toLowerCase() === selected.toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFiltersEmpty(f: NearbyFilters) {
  return (
    f.vehicleType == null &&
    f.transmission == null &&
    f.fuelType == null &&
    f.minSeats == null &&
    f.minRating == null &&
    f.maxPriceEnabled === false &&
    f.onlyWithPhotos === false
  );
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

  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const priceMax = 300;
  const priceLabel = useMemo(() => {
    if (!draft.maxPriceEnabled) return "Any";
    if (draft.maxPricePerDay >= priceMax) return "Max";
    return `$${draft.maxPricePerDay}`;
  }, [draft.maxPriceEnabled, draft.maxPricePerDay]);

  const canClear = useMemo(() => !isFiltersEmpty(draft), [draft]);

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
                        if (cur == null) return p; // already Any
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

                  {/* <Pressable
                    onPress={() => setDraft((p) => ({ ...p, minSeats: null }))}
                    style={[styles.resetMini, SHADOW_CARD]}
                  >
                    <Text style={styles.resetMiniText}>Any</Text>
                  </Pressable> */}
                </View>
              </View>

              <View style={{ width: 14 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Min Rating</Text>
                <Text style={styles.inlineValue}>
                  {draft.minRating == null
                    ? "Any"
                    : `${draft.minRating.toFixed(1)}★`}
                </Text>

                <Slider
                  value={draft.minRating ?? 0}
                  minimumValue={0}
                  maximumValue={5}
                  step={0.5}
                  minimumTrackTintColor={COLORS.black}
                  maximumTrackTintColor={"rgba(0,0,0,0.14)"}
                  thumbTintColor={COLORS.black}
                  onValueChange={(v) =>
                    setDraft((p) => ({
                      ...p,
                      minRating: v <= 0 ? null : v,
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* Max price/day */}
          <View style={[styles.card, SHADOW_CARD]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>Max price / day</Text>
                <Text style={styles.bigValue}>{priceLabel}</Text>
              </View>

              <View style={styles.toggleWrap}>
                <Text style={styles.togglePill}>
                  {draft.maxPriceEnabled ? "On" : "Off"}
                </Text>
                <Switch
                  value={draft.maxPriceEnabled}
                  onValueChange={(v) =>
                    setDraft((p) => ({
                      ...p,
                      maxPriceEnabled: v,
                    }))
                  }
                  trackColor={{
                    false: "rgba(0,0,0,0.18)",
                    true: COLORS.black,
                  }}
                  thumbColor="#fff"
                  ios_backgroundColor="rgba(0,0,0,0.18)"
                />
              </View>
            </View>

            <Slider
              value={draft.maxPricePerDay}
              minimumValue={20}
              maximumValue={priceMax}
              step={10}
              disabled={!draft.maxPriceEnabled}
              minimumTrackTintColor={COLORS.black}
              maximumTrackTintColor={"rgba(0,0,0,0.14)"}
              thumbTintColor={COLORS.black}
              onValueChange={(v) =>
                setDraft((p) => ({ ...p, maxPricePerDay: v }))
              }
            />

            <Text style={styles.helperText}>
              Turn on to cap the daily price.
            </Text>
          </View>

          {/* Photos */}
          <View style={[styles.card, SHADOW_CARD]}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Only cars with photos</Text>
              <Switch
                value={draft.onlyWithPhotos}
                onValueChange={(v) =>
                  setDraft((p) => ({ ...p, onlyWithPhotos: v }))
                }
                trackColor={{
                  false: "rgba(0,0,0,0.18)",
                  true: COLORS.black,
                }}
                thumbColor="#fff"
                ios_backgroundColor="rgba(0,0,0,0.18)"
              />
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

export const DEFAULT_FILTERS: NearbyFilters = {
  vehicleType: null,
  transmission: null,
  fuelType: null,
  minSeats: null,
  minRating: null,
  maxPriceEnabled: false,
  maxPricePerDay: 150,
  onlyWithPhotos: false,
};

const APPLY_BAR_HEIGHT = 18 + 10 + 14 + 14; // padding + button height-ish (safe cushion)

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
    paddingBottom: APPLY_BAR_HEIGHT, // important: avoid last card hiding behind Apply bar
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
  resetMini: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  resetMiniText: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleWrap: { alignItems: "flex-end", gap: 8 },
  togglePill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
  },
  bigValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
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
