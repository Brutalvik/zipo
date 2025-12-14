import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { COLORS } from "@/theme/ui";

type Props = {
  title: string;
  actionText?: string;
  onPressAction?: () => void;
};

export default function SectionHeader({
  title,
  actionText,
  onPressAction,
}: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>

      {actionText ? (
        <Pressable onPress={onPressAction} accessibilityRole="button">
          <Text style={styles.action}>{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  action: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
});
