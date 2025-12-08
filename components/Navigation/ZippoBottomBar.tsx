// app/components/navigation/ZipoBottomBar.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

const ZIPO_COLORS = {
  pillBg: "#111827",
  iconActive: "#F9FAFB",
  iconInactive: "#9CA3AF",
};

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  search: "search",
  inbox: "mail",
  notifications: "bell",
  profile: "user",
};

export function ZipoBottomBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const iconName = ICONS[route.name] ?? "circle";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Feather
                name={iconName}
                size={26} // ⬆️ bigger icons
                color={
                  isFocused ? ZIPO_COLORS.iconActive : ZIPO_COLORS.iconInactive
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "ios" ? 30 : 20, // ⬆️ more spacing from bottom
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: ZIPO_COLORS.pillBg,
    borderRadius: 999,
    paddingHorizontal: 32, // ⬆️ more horizontal padding
    paddingVertical: 16, // ⬆️ taller pill
    minWidth: 300, // ⬆️ wider
    maxWidth: 380,
    width: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4, // ⬆️ gives icons breathing room
  },
});
