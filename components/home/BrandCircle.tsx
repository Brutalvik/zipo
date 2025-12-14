import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  label: string;
  iconName?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
};

export default function BrandCircle({
  label,
  iconName = "circle",
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="button">
      <View style={[styles.circle, SHADOW_CARD]}>
        <Feather name={iconName} size={20} color={COLORS.text} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 78, alignItems: "center" },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  label: { marginTop: 8, fontSize: 12, color: COLORS.muted, fontWeight: "600" },
});
