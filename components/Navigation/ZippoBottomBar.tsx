import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Animated,
  LayoutChangeEvent,
  ActivityIndicator,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useRefreshMe } from "@/hooks/useRefreshMe";
import {
  GUEST_TAB_CONFIG,
  HOST_TAB_CONFIG,
} from "@/components/navigation/tabConfig";

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

const HOST = "host";

const renderTabIcon = (
  icon: { family: string; name: string },
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
}: BottomTabBarProps) {
  const { user, initializing } = useAuth() as any; // if your hook doesn't expose initializing, remove it + see note below
  const { refreshMe, refreshing: refreshingMe } = useRefreshMe() as any;

  // Refresh /me once to ensure user.mode is correct
  const didRefreshRef = React.useRef(false);
  const [refreshingLocal, setRefreshingLocal] = React.useState(false);

  React.useEffect(() => {
    if (didRefreshRef.current) return;
    if (initializing) return;
    if (!user) return;

    didRefreshRef.current = true;

    (async () => {
      try {
        setRefreshingLocal(true);
        await refreshMe?.();
      } finally {
        setRefreshingLocal(false);
      }
    })();
  }, [user, initializing, refreshMe]);

  const isRefreshingMode = Boolean(refreshingMe || refreshingLocal);

  // Decide tab config based on *final* mode
  // While refreshing, keep previous mode stable to avoid UI flicker.
  const modeRef = React.useRef<"host" | "guest">("guest");
  React.useEffect(() => {
    if (!user) return;
    if (isRefreshingMode) return;

    modeRef.current = user?.mode === HOST ? "host" : "guest";
  }, [user, isRefreshingMode]);

  const mode = modeRef.current;
  const tabconfig = mode === "host" ? HOST_TAB_CONFIG : GUEST_TAB_CONFIG;

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

        {/* Optional tiny loader while mode refresh is happening */}
        {isRefreshingMode ? (
          <View pointerEvents="none" style={styles.modeRefreshingDot}>
            <ActivityIndicator size="small" />
          </View>
        ) : null}

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
            (tabconfig as any)[route.name] ??
            ({
              icon: { family: "feather", name: "circle" },
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

  // tiny spinner badge while refreshing mode
  modeRefreshingDot: {
    position: "absolute",
    right: 12,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
