import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useAppSelector } from "@/redux/hooks";
import { selectCars } from "@/redux/slices/carSlice";
import CustomCalendar from "@/components/common/CustomCalendar";

import type { Car } from "@/types/car";
import { COLORS, RADIUS } from "@/theme/ui";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = 280;

export default function CarDetailsScreen() {
  const router = useRouter();
  const { carId } = useLocalSearchParams<{ carId: string }>();

  const cars = useAppSelector(selectCars);
  const car = cars.find((c) => c.id === carId) as Car | undefined;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [dropoffDate, setDropoffDate] = useState<Date>(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  );

  const flatListRef = useRef<FlatList>(null);

  const images = useMemo<string[]>(() => {
    if (!car) return [];
    const urls: string[] = [];

    if (Array.isArray(car.imageGallery)) {
      for (const img of car.imageGallery) {
        if (typeof img === "string" && img.trim()) {
          urls.push(img.trim());
        } else if (typeof img === "object" && img !== null && "url" in img) {
          urls.push((img as any).url);
        }
      }
    }

    if (car.imageUrl && !urls.includes(car.imageUrl)) {
      urls.unshift(car.imageUrl);
    }

    return Array.from(new Set(urls));
  }, [car]);

  // Infinite scroll logic
  const infiniteImages = useMemo(() => {
    if (images.length === 0) return [];
    if (images.length === 1) return images;
    return [...images, ...images, ...images];
  }, [images]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index % images.length);
  };

  const hasReviews = car && car.reviews > 0;

  if (!car) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Car Details</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={{ padding: 16 }}>
          <Text>Car not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Car Details</Text>
        <Pressable style={styles.iconBtn}>
          <Feather name="more-horizontal" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <FlatList
            ref={flatListRef}
            data={infiniteImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.image} />
            )}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            initialScrollIndex={images.length > 1 ? images.length : 0}
          />

          <Pressable
            style={styles.favBtn}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Feather
              name="heart"
              size={20}
              color={isFavorite ? "#FF385C" : COLORS.text}
              fill={isFavorite ? "#FF385C" : "transparent"}
            />
          </Pressable>

          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {car.year} {car.title}
          </Text>
          <Text style={styles.description}>
            A car with high specs that are rented at an affordable price.
          </Text>

          {hasReviews ? (
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>{car.rating.toFixed(1)}</Text>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.reviewCount}>({car.reviews}+ Reviews)</Text>
            </View>
          ) : (
            <View style={styles.ratingRow}>
              <Text style={styles.noReviews}>No reviews yet</Text>
            </View>
          )}

          <View style={styles.ownerSection}>
            <View style={styles.ownerRow}>
              <Image
                source={{
                  uri: "https://i.pravatar.cc/100?img=5",
                }}
                style={styles.ownerAvatar}
              />
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>Hela Quintin</Text>
                  <Feather name="check-circle" size={16} color="#1DA1F2" />
                </View>
              </View>
            </View>

            <View style={styles.ownerActions}>
              <Pressable style={styles.ownerActionBtn}>
                <Feather name="phone" size={18} color={COLORS.text} />
              </Pressable>
              <Pressable style={styles.ownerActionBtn}>
                <Feather name="message-circle" size={18} color={COLORS.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Car features</Text>
            <View style={styles.features}>
              {car.seats && (
                <FeatureCard
                  icon="users"
                  label="Capacity"
                  value={`${car.seats} Seats`}
                />
              )}
              {car.fuelType && (
                <FeatureCard
                  icon="zap"
                  label="Fuel Type"
                  value={car.fuelType}
                />
              )}
              {car.transmission && (
                <FeatureCard
                  icon="settings"
                  label="Transmission"
                  value={car.transmission}
                />
              )}
              {car.vehicleType && (
                <FeatureCard
                  icon="truck"
                  label="Vehicle Type"
                  value={car.vehicleType}
                />
              )}
              {car.doors && (
                <FeatureCard
                  icon="minimize-2"
                  label="Doors"
                  value={`${car.doors} Doors`}
                />
              )}
              {car.year && (
                <FeatureCard
                  icon="calendar"
                  label="Year"
                  value={car.year.toString()}
                />
              )}
            </View>
          </View>

          {hasReviews ? (
            <View style={styles.section}>
              <View style={styles.reviewHeader}>
                <Text style={styles.sectionTitle}>Review ({car.reviews})</Text>
                <Pressable
                  onPress={() => router.push(`/car/reviews?carId=${car.id}`)}
                >
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>
              <Text style={styles.noReviews}>No reviews yet</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <Text style={styles.noReviews}>No reviews yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.bookBtn}
          onPress={() => setCalendarVisible(true)}
        >
          <Text style={styles.bookText}>Book Now</Text>
          <Feather name="arrow-right" size={18} color={COLORS.white} />
        </Pressable>
      </View>

      <CustomCalendar
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onSelect={(pickup, dropoff) => {
          setPickupDate(pickup);
          setDropoffDate(dropoff);
          router.push({
            pathname: "/booking/details",
            params: {
              carId: car.id,
              pickup: pickup.toISOString(),
              dropoff: dropoff.toISOString(),
            },
          });
        }}
        initialPickup={pickupDate}
        initialDropoff={dropoffDate}
      />
    </SafeAreaView>
  );
}

function FeatureCard({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Feather name={icon} size={20} color={COLORS.muted} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  imageContainer: {
    position: "relative",
  },

  image: {
    width,
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.border,
  },

  favBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  dots: {
    position: "absolute",
    bottom: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.white,
  },

  content: { padding: 16 },

  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },

  rating: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },

  star: {
    fontSize: 16,
  },

  reviewCount: {
    fontSize: 13,
    color: COLORS.muted,
  },

  noReviews: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: "italic",
  },

  ownerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  ownerInfo: {
    gap: 2,
  },

  ownerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  ownerName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  ownerActions: {
    flexDirection: "row",
    gap: 8,
  },

  ownerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },

  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  featureCard: {
    width: "31%",
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  featureLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 4,
  },

  featureValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  seeAll: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.bg || "#007AFF",
  },

  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  bookBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.black,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  bookText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
