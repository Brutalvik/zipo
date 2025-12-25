// components/onboarding/OnboardingSlides.tsx
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import Button from "@/components/Button/Button";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    titleLines: ["Let’s Start", "A New Experience", "With Car Rental."],
    description:
      "Discover your next adventure with Zipo. We’re here to provide you with a seamless car rental experience.",
    image: require("@/assets/images/blackcar.png"),
  },
  {
    id: "2",
    titleLines: ["Choose the Perfect", "Car for Every Trip."],
    description:
      "From daily commutes to weekend getaways, Zipo helps you find the right car at the right price.",
    image: require("@/assets/images/car.png"),
  },
  {
    id: "3",
    titleLines: ["Book in Minutes,", "Drive With Confidence."],
    description:
      "Secure bookings, transparent pricing, and smooth pickup. Get ready to hit the road with Zipo.",
    image: require("@/assets/images/whitecar.png"),
  },
];

export default function OnboardingSlides() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex === SLIDES.length - 1) {
      router.replace("/signup");
      return;
    }
    scrollRef.current?.scrollTo({
      x: (currentIndex + 1) * width,
      animated: true,
    });
  };

  const handleSkip = () => {
    router.replace("/signup");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.root}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        >
          {SLIDES.map((slide) => (
            <ImageBackground
              key={slide.id}
              source={slide.image}
              style={[styles.background, { width }]}
              resizeMode="cover"
            >
              <View style={styles.overlay} />

              <SafeAreaView style={styles.container}>
                <View style={styles.topRow}>
                  <View style={styles.logoWrapper}>
                    <View style={styles.logoCircle}>
                      <FontAwesome name="car" size={20} color="#fff" />
                    </View>
                    <Text style={styles.logoText}>Zipo</Text>
                  </View>

                  <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.content}>
                  <View style={styles.headingWrapper}>
                    {slide.titleLines.map((line, i) => (
                      <Text key={i} style={styles.heading}>
                        {line}
                      </Text>
                    ))}
                  </View>

                  <Text style={styles.description}>{slide.description}</Text>
                </View>

                <View style={styles.bottomSection}>
                  <View style={styles.dotsRow}>
                    {SLIDES.map((_, i) => {
                      const inputRange = [
                        (i - 1) * width,
                        i * width,
                        (i + 1) * width,
                      ];

                      const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: "clamp",
                      });

                      const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [1, 1.2, 1],
                        extrapolate: "clamp",
                      });

                      return (
                        <Animated.View
                          key={i}
                          style={[
                            styles.dot,
                            { opacity, transform: [{ scale }] },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Button
                    title={
                      currentIndex === SLIDES.length - 1
                        ? "Get Started"
                        : "Next"
                    }
                    variant="glass"
                    onPress={handleNext}
                    style={styles.button}
                  />
                </View>
              </SafeAreaView>
            </ImageBackground>
          ))}
        </Animated.ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
  },
  skipText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.85,
  },
  content: {
    marginTop: 40,
  },
  headingWrapper: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 38,
  },
  description: {
    fontSize: 15,
    color: "#fff",
    opacity: 0.85,
    maxWidth: "92%",
    marginTop: 10,
  },
  bottomSection: {
    marginTop: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginHorizontal: 5,
  },
  button: {
    borderRadius: 50,
  },
});
