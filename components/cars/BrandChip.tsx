import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { COLORS } from "@/theme/ui";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  left?: React.ReactNode;
};

export default function BrandChip({ label, selected, onPress, left }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
    >
      {left ? <View style={styles.left}>{left}</View> : null}
      <Text
        style={[
          styles.text,
          selected ? styles.textSelected : styles.textDefault,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  left: { opacity: 0.95 },
  text: { fontSize: 12, fontWeight: "700" },
  textDefault: { color: COLORS.text },
  textSelected: { color: COLORS.white },
});
