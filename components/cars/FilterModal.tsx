import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/theme/ui";

export type FilterState = {
  minPrice: number;
  maxPrice: number;
  seats: number | null;
  transmission: "Any" | "Automatic" | "Manual";
};

export default function FilterModal({
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
  onChange: (v: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={18} />
            </Pressable>
          </View>

          <ScrollView>
            <Text style={styles.section}>Price / Day</Text>
            <View style={styles.row}>
              <Text>Min: ${value.minPrice}</Text>
              <Pressable
                onPress={() =>
                  onChange({ ...value, minPrice: value.minPrice + 10 })
                }
              >
                <Text>＋</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Text>Max: ${value.maxPrice}</Text>
              <Pressable
                onPress={() =>
                  onChange({ ...value, maxPrice: value.maxPrice + 10 })
                }
              >
                <Text>＋</Text>
              </Pressable>
            </View>

            <Text style={styles.section}>Seats</Text>
            <View style={styles.rowWrap}>
              {[null, 2, 4, 5, 7].map((s) => (
                <Pressable
                  key={String(s)}
                  style={[
                    styles.chip,
                    value.seats === s && styles.chipSelected,
                  ]}
                  onPress={() => onChange({ ...value, seats: s })}
                >
                  <Text>{s === null ? "Any" : s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Transmission</Text>
            <View style={styles.rowWrap}>
              {["Any", "Automatic", "Manual"].map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.chip,
                    value.transmission === t && styles.chipSelected,
                  ]}
                  onPress={() => onChange({ ...value, transmission: t as any })}
                >
                  <Text>{t}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onReset} style={styles.resetBtn}>
              <Text>Reset</Text>
            </Pressable>
            <Pressable onPress={onApply} style={styles.applyBtn}>
              <Text style={{ color: "#fff" }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "900" },
  section: { marginTop: 16, fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: { backgroundColor: COLORS.black },
  footer: { flexDirection: "row", gap: 12, marginTop: 16 },
  resetBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  applyBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: "center",
  },
});
