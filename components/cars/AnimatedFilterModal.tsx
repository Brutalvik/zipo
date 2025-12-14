import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export type FilterState = {
  minPrice: number;
  maxPrice: number;
  seats: number | null;
  transmission: "Any" | "Automatic" | "Manual";
};

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
    accessibilityRole="button"
    accessibilityState={selected ? { selected: true } : {}}
  >
    <Text
      style={[
        styles.chipText,
        selected ? styles.chipTextSelected : styles.chipTextDefault,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const Stepper = ({
  label,
  value,
  onDec,
  onInc,
  suffix,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  suffix?: string;
}) => (
  <View style={styles.stepperRow}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperRight}>
      <Pressable style={styles.stepBtn} onPress={onDec}>
        <Feather name="minus" size={16} color={COLORS.text} />
      </Pressable>
      <Text style={styles.stepValue}>
        {value}
        {suffix ?? ""}
      </Text>
      <Pressable style={styles.stepBtn} onPress={onInc}>
        <Feather name="plus" size={16} color={COLORS.text} />
      </Pressable>
    </View>
  </View>
);

export default function AnimatedFilterModal({
  visible,
  onClose,
  value,
  onChange,
  onApply,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  value: FilterState;
  onChange: (next: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [mounted, setMounted] = useState(visible);

  const translateY = useRef(new Animated.Value(520)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(520);
      backdrop.setValue(0);

      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 520,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, translateY, backdrop]);

  const priceHint = useMemo(
    () => `Between ${value.minPrice}$ and ${value.maxPrice}$ per day`,
    [value.minPrice, value.maxPrice]
  );

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, SHADOW_CARD, { transform: [{ translateY }] }]}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={18} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 18 }}
        >
          <Text style={styles.sectionTitle}>Price / day</Text>
          <View style={styles.card}>
            <Stepper
              label="Min"
              value={value.minPrice}
              suffix="$"
              onDec={() =>
                onChange({
                  ...value,
                  minPrice: Math.max(0, value.minPrice - 10),
                })
              }
              onInc={() =>
                onChange({
                  ...value,
                  minPrice: Math.min(value.maxPrice, value.minPrice + 10),
                })
              }
            />
            <View style={styles.divider} />
            <Stepper
              label="Max"
              value={value.maxPrice}
              suffix="$"
              onDec={() =>
                onChange({
                  ...value,
                  maxPrice: Math.max(value.minPrice, value.maxPrice - 10),
                })
              }
              onInc={() =>
                onChange({ ...value, maxPrice: value.maxPrice + 10 })
              }
            />

            <Text style={styles.hint}>{priceHint}</Text>
          </View>

          <Text style={styles.sectionTitle}>Seats</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="Any"
              selected={value.seats === null}
              onPress={() => onChange({ ...value, seats: null })}
            />
            {[2, 4, 5, 7].map((n) => (
              <Chip
                key={n}
                label={`${n}`}
                selected={value.seats === n}
                onPress={() => onChange({ ...value, seats: n })}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Transmission</Text>
          <View style={styles.rowWrap}>
            {(["Any", "Automatic", "Manual"] as const).map((t) => (
              <Chip
                key={t}
                label={t}
                selected={value.transmission === t}
                onPress={() => onChange({ ...value, transmission: t })}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onReset}
            style={[styles.footerBtn, styles.resetBtn]}
            accessibilityRole="button"
          >
            <Text style={[styles.footerBtnText, styles.resetText]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={onApply}
            style={[styles.footerBtn, styles.applyBtn]}
            accessibilityRole="button"
          >
            <Text style={[styles.footerBtnText, styles.applyText]}>Apply</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    padding: 14,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperLabel: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  stepperRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    minWidth: 70,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  hint: { marginTop: 10, fontSize: 12, color: COLORS.muted, fontWeight: "600" },

  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDefault: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  chipSelected: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipText: { fontSize: 12, fontWeight: "800" },
  chipTextDefault: { color: COLORS.text },
  chipTextSelected: { color: COLORS.white },

  footer: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  footerBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: { backgroundColor: "rgba(0,0,0,0.06)" },
  applyBtn: { backgroundColor: COLORS.black },
  footerBtnText: { fontSize: 13, fontWeight: "900" },
  resetText: { color: COLORS.text },
  applyText: { color: COLORS.white },
});
