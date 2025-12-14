import React from "react";
import { View, TextInput, Pressable, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/theme/ui";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
  filterBadgeCount?: number;
};

export default function SearchInput({
  value,
  onChangeText,
  onPressFilter,
  placeholder = "Search your dream car....",
  filterBadgeCount = 0,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={COLORS.text} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />
      </View>

      <Pressable onPress={onPressFilter} style={styles.filterBtn}>
        <Feather name="sliders" size={18} color={COLORS.text} />

        {filterBadgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {filterBadgeCount > 9 ? "9+" : filterBadgeCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
