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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { TabConfig } from "./tablcons";

const ZIPO_COLORS = {
  pillBg: "rgba(17, 24, 39, 0.78)",
  pillBorder: "rgba(255,255,255,0.16)",
  pillHighlight: "rgba(255,255,255,0.10)",

  iconActive: "#EEF2FF",
  iconInactive: "rgba(229,231,235,0.85)",
  labelActive: "#EEF2FF",
  labelInactive: "rgba(229,231,235,0.85)",

  bubbleBorder: "rgba(255,255,255,0.26)",
  bubbleInnerRing: "rgba(255,255,255,0.14)",
  bubbleFill: "rgba(255,255,255,0.12)",
  bubbleFill2: "rgba(255,255,255,0.06)",
  bubbleTopGlare: "rgba(255,255,255,0.18)",
  bubbleBottomTint: "rgba(0,0,0,0.10)",
  bubbleEdgeGlow: "rgba(255,255,255,0.20)",
};

type TabLayout = { x: number; width: number };

const renderTabIcon = (
  icon: { family: "feather" | "material"; name: string },
  isFocused: boolean
) => {
  const color = isFocused ? ZIPO_COLORS.iconActive : ZIPO_COLORS.iconInactive;

  if (icon.family === "material") {
    return (
      <MaterialCommunityIcons name={icon.name as any} size={22} color={color} />
    );
  }

  return <Feather name={icon.name as any} size={22} color={color} />;
};

export function ZipoBottomBar({
  state,
  descriptors,
  navigation,
  tabConfig,
}: BottomTabBarProps & { tabConfig: TabConfig }) {
  const [tabLayouts, setTabLayouts] = React.useState<TabLayout[]>([]);
  const [indicatorWidth, setIndicatorWidth] = React.useState(0);

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

    const inset = -4;
    const targetX = layout.x + inset;
    const targetWidth = Math.max(0, layout.width - inset * 2);

    setIndicatorWidth(targetWidth);

    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [state.index, tabLayouts, translateX]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        <View pointerEvents="none" style={styles.frostOverlay} />
        <View pointerEvents="none" style={styles.topSheen} />

        {tabLayouts[state.index] && indicatorWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.acrylicBubble,
              { width: indicatorWidth, transform: [{ translateX }] },
            ]}
          >
            <View pointerEvents="none" style={styles.bubbleFill} />
            <View pointerEvents="none" style={styles.bubbleGlareTop} />
            <View pointerEvents="none" style={styles.bubbleTintBottom} />
            <View pointerEvents="none" style={styles.bubbleInnerRing} />
            <View pointerEvents="none" style={styles.bubbleEdgeHighlight} />
          </Animated.View>
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
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          const config =
            tabConfig[route.name] ??
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
                {renderTabIcon(config.icon, isFocused)}
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
    bottom: Platform.OS === "ios" ? 30 : 18,
    alignItems: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
    width: "90%",
    maxWidth: 440,
    overflow: "hidden",

    backgroundColor: ZIPO_COLORS.pillBg,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.pillBorder,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
  },

  frostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ZIPO_COLORS.pillHighlight,
  },

  topSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "58%",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  acrylicBubble: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ZIPO_COLORS.bubbleBorder,
    zIndex: 0,
    shadowColor: ZIPO_COLORS.bubbleEdgeGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },

  bubbleFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ZIPO_COLORS.bubbleFill,
  },
  bubbleGlareTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "52%",
    backgroundColor: ZIPO_COLORS.bubbleTopGlare,
    opacity: 0.55,
  },
  bubbleTintBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    backgroundColor: ZIPO_COLORS.bubbleBottomTint,
    opacity: 0.65,
  },
  bubbleInnerRing: {
    position: "absolute",
    left: 3,
    right: 3,
    top: 3,
    bottom: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.bubbleInnerRing,
  },
  bubbleEdgeHighlight: {
    position: "absolute",
    left: 1,
    right: 1,
    top: 1,
    height: "46%",
    borderRadius: 999,
    backgroundColor: ZIPO_COLORS.bubbleFill2,
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    zIndex: 1,
  },
  tabInner: { alignItems: "center", justifyContent: "center", gap: 2 },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: ZIPO_COLORS.labelInactive,
  },
  tabLabelActive: { color: ZIPO_COLORS.labelActive },
});
