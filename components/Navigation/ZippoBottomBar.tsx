// app/components/navigation/ZipoBottomBar.tsx
import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

const ZIPO_COLORS = {
  pillBg: "#111827",
  iconActive: "#E5E7FF",
  iconInactive: "#E5E7EB",
  labelActive: "#C4B5FD", // your pink / purple accent
  labelInactive: "#E5E7EB",
};

const TAB_CONFIG: Record<
  string,
  { icon: keyof typeof Feather.glyphMap; label: string }
> = {
  index: { icon: "home", label: "Home" },
  search: { icon: "search", label: "Search" },
  inbox: { icon: "mail", label: "Inbox" },
  notifications: { icon: "bell", label: "Alerts" },
  profile: { icon: "user", label: "Profile" },
};

type TabLayout = { x: number; width: number };

export function ZipoBottomBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [tabLayouts, setTabLayouts] = React.useState<TabLayout[]>([]);
  const [indicatorWidth, setIndicatorWidth] = React.useState(0);

  // Only translateX is animated
  const translateX = React.useRef(new Animated.Value(0)).current;

  const handleTabLayout =
    (index: number) =>
    (e: LayoutChangeEvent): void => {
      const { x, width } = e.nativeEvent.layout;

      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = { x, width };
        return next;
      });
    };

  React.useEffect(() => {
    const layout = tabLayouts[state.index];
    if (!layout) return;

    const inset = 0;
    const targetX = layout.x + inset;
    const targetWidth = layout.width - inset * 2;

    setIndicatorWidth(targetWidth);

    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: false, // <-- important: JS-driven only
      friction: 8,
      tension: 80,
    }).start();
  }, [state.index, tabLayouts, translateX]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {/* Glass bubble behind active tab */}
        {tabLayouts[state.index] && indicatorWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glassIndicator,
              {
                width: indicatorWidth,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

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

          const config =
            TAB_CONFIG[route.name] ??
            ({
              icon: "circle",
              label: route.name,
            } as const);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.9}
              onLayout={handleTabLayout(index)}
            >
              <View style={styles.tabInner}>
                <Feather
                  name={config.icon}
                  size={24}
                  color={
                    isFocused
                      ? ZIPO_COLORS.iconActive
                      : ZIPO_COLORS.iconInactive
                  }
                />
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                >
                  {config.label}
                </Text>
              </View>
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
    bottom: Platform.OS === "ios" ? 30 : 20,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ZIPO_COLORS.pillBg,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 300,
    maxWidth: 380,
    width: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  glassIndicator: {
    position: "absolute",
    top: 1,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 253, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 253, 0.45)",
    shadowColor: "rgba(148, 163, 253, 0.55)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
    zIndex: 1,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: ZIPO_COLORS.labelInactive,
  },
  tabLabelActive: {
    color: ZIPO_COLORS.labelActive,
  },
});
