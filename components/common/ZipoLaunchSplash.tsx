// components/common/ZipoLaunchSplash.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function ZipoLaunchSplash() {
  const glow = useRef(new Animated.Value(0)).current;
  const floaty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(floaty, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(floaty, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glow, floaty]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.5],
  });

  const translateY = floaty.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -3],
  });

  const scale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.02],
  });

  return (
    <View style={styles.root}>
      {/* soft background aura */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aura,
          {
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />

      {/* logo block */}
      <Animated.View style={[styles.center, { transform: [{ translateY }] }]}>
        <View style={styles.logoChip}>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        <Text style={styles.sub}>Loading your account…</Text>
      </Animated.View>

      {/* tiny bottom hint */}
      <Text style={styles.footer}>Secure • Fast • Simple</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0F19",
    alignItems: "center",
    justifyContent: "center",
  },

  aura: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 420,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  center: {
    alignItems: "center",
    gap: 14,
  },

  logoChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  sub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    position: "absolute",
    bottom: 42,
    color: "rgba(255,255,255,0.40)",
    fontSize: 12,
    fontWeight: "800",
  },
});
