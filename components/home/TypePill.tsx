import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export default function TypePill({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        SHADOW_CARD,
        selected ? styles.pillSelected : styles.pillDefault,
      ]}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
    >
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
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
  },
  pillDefault: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  pillSelected: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  text: { fontSize: 12, fontWeight: "800" },
  textDefault: { color: COLORS.text },
  textSelected: { color: COLORS.white },
});
