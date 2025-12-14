import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export default function DaysPickerModal({
  visible,
  value,
  maxDays = 30,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: number;
  maxDays?: number;
  onClose: () => void;
  onSelect: (days: number) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => i + 1),
    [maxDays]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, SHADOW_CARD]}>
          <Text style={styles.title}>Select days</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 14 }}
          >
            {days.map((d) => {
              const selected = d === value;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    onSelect(d);
                    onClose();
                  }}
                  style={[styles.row, selected && styles.rowSelected]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.rowText, selected && styles.rowTextSelected]}
                  >
                    {d} {d === 1 ? "day" : "days"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    maxHeight: "75%",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    marginBottom: 10,
  },
  rowSelected: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  rowText: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  rowTextSelected: { color: COLORS.white },
  closeBtn: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  closeText: { fontSize: 13, fontWeight: "900", color: COLORS.text },
});
