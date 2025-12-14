import React from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/theme/ui";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
};

export default function SearchInput({
  value,
  onChangeText,
  onPressFilter,
  placeholder = "Search your dream car....",
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
          returnKeyType="search"
        />
      </View>

      <Pressable
        onPress={onPressFilter}
        style={styles.filterBtn}
        accessibilityRole="button"
        accessibilityLabel="Filters"
      >
        <Feather name="sliders" size={18} color={COLORS.text} />
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
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
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
});
