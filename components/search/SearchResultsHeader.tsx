import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

export default function SearchResultsHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} style={[styles.backBtn, SHADOW_CARD]}>
        <Feather name="chevron-left" size={20} color={COLORS.text} />
      </Pressable>

      <View style={[styles.pill, SHADOW_CARD]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.white, // keep white theme
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pill: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  sub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: COLORS.muted },
});
