// components/common/ZipoLaunchSplash.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  modeLabel?: "host" | "guest";
};

export default function ZipoLaunchSplash({ modeLabel }: Props) {
  const glow = useRef(new Animated.Value(0)).current;
  const floaty = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduceMotion(!!v))
      .catch(() => {});

    const sub =
      AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
        setReduceMotion(!!v);
      }) ?? null;

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    glow.stopAnimation();
    floaty.stopAnimation();
    sweep.stopAnimation();

    if (reduceMotion) {
      glow.setValue(0.35);
      floaty.setValue(0.5);
      sweep.setValue(0.2);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(floaty, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floaty, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(sweep, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(650),
          Animated.timing(sweep, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glow, floaty, sweep, reduceMotion]);

  const auraOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
  });

  const auraScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });

  const aura2Opacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.14],
  });

  const aura2Scale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.12],
  });

  const translateY = floaty.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -5],
  });

  const chipScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.99, 1.01],
  });

  const shineTranslateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  const label = useMemo(() => {
    if (!modeLabel) return "Loading your account…";
    return `Switching to ${modeLabel.toUpperCase()} mode…`;
  }, [modeLabel]);

  return (
    <View style={styles.root}>
      {/* layered background auras (dark-on-light) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.auraOuter,
          { opacity: aura2Opacity, transform: [{ scale: aura2Scale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.auraInner,
          { opacity: auraOpacity, transform: [{ scale: auraScale }] },
        ]}
      />

      {/* logo block */}
      <Animated.View
        style={[
          styles.center,
          { transform: [{ translateY }, { scale: chipScale }] },
        ]}
      >
        <View style={styles.logoChip}>
          {/* subtle shine sweep */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shine,
              {
                transform: [
                  { translateX: shineTranslateX },
                  { rotate: "18deg" },
                ],
              },
            ]}
          />
          <Text style={styles.logoText}>ZIPO</Text>
        </View>

        <Text style={styles.sub}>{label}</Text>
      </Animated.View>

      <Text style={styles.footer}>Secure • Fast • Simple</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  auraOuter: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 520,
    backgroundColor: "rgba(17,24,39,0.08)", // dark aura on white
  },

  auraInner: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 380,
    backgroundColor: "rgba(17,24,39,0.10)",
  },

  center: {
    alignItems: "center",
    gap: 14,
  },

  logoChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    overflow: "hidden",
  },

  shine: {
    position: "absolute",
    top: -18,
    bottom: -18,
    width: 54,
    borderRadius: 54,
    backgroundColor: "rgba(255,255,255,0.65)", // light shine
  },

  logoText: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  sub: {
    color: "rgba(17,24,39,0.55)",
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    position: "absolute",
    bottom: 42,
    color: "rgba(17,24,39,0.35)",
    fontSize: 12,
    fontWeight: "800",
  },
});
