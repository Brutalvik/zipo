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
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useAppSelector } from "@/redux/hooks";
import { selectCars } from "@/redux/slices/carSlice";
import CustomCalendar from "@/components/common/CustomCalendar";

import type { Car } from "@/types/car";
import { COLORS, RADIUS } from "@/theme/ui";
import { Alert } from "react-native";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = 280;

type BookingFormData = {
  bookWithDriver: boolean;
  fullName: string;
  email: string;
  contact: string;
  gender: "Male" | "Female" | "Others";
  rentalPeriod: "Hour" | "Day" | "Weekly" | "Monthly";
  pickupDate: Date | null;
  returnDate: Date | null;
};

export default function CarDetailsScreen() {
  const router = useRouter();
  const { carId } = useLocalSearchParams<{ carId: string }>();

  const cars = useAppSelector(selectCars);
  const user = useAppSelector((s) => s.auth.user);
  const car = cars.find((c) => c.id === carId) as Car | undefined;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<
    "pickup" | "return" | null
  >(null);

  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    bookWithDriver: false,
    fullName: user?.name || "",
    email: user?.email || "",
    contact: user?.phoneNumber || "",
    gender: "Male",
    rentalPeriod: "Day",
    pickupDate: null,
    returnDate: null,
  });

  const flatListRef = useRef<FlatList>(null);

  // Check KYC status
  const isKycComplete = user?.kycStatus === "verified";
  const needsKyc =
    (!isKycComplete &&
      (user?.kycStatus === "not_started" ||
        user?.kycStatus === "incomplete" ||
        user?.kycStatus === "expired")) ||
    user?.kycStatus === "pending";

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

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = String(date.getFullYear()).slice(-2);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, "0");
    return `${day}-${month}-${year} ${String(displayHours).padStart(
      2,
      "0"
    )}:${displayMinutes} ${ampm}`;
  };

  const calculateTotalPrice = () => {
    if (!car || !bookingForm.pickupDate || !bookingForm.returnDate) return 0;

    const days = Math.ceil(
      (bookingForm.returnDate.getTime() - bookingForm.pickupDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return days * car.pricePerDay;
  };

  const handlePayNow = () => {
    // Check KYC status first
    if (needsKyc) {
      Alert.alert(
        "KYC Verification Required",
        "You need to complete your KYC verification before booking a car.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Verify KYC",
            onPress: () => {
              console.log("Navigate to KYC verification");
              // TODO: Navigate to KYC verification screen
              // router.push("/kyc/verification");
            },
          },
        ]
      );
      return;
    }

    const bookingData = {
      carId: car?.id,
      carTitle: car?.title,
      userId: user?.id,
      userEmail: user?.email,
      ...bookingForm,
      totalPrice: calculateTotalPrice(),
      pickupLocation: car?.pickupAddress,
    };

    console.log("Booking Data:", JSON.stringify(bookingData, null, 2));
  };

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
                source={{ uri: "https://i.pravatar.cc/100?img=5" }}
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

          {/* BOOKING FORM */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            <View style={styles.driverToggle}>
              <View>
                <Text style={styles.driverTitle}>Book with driver</Text>
                <Text style={styles.driverSubtitle}>
                  Don't have a driver? book with driver.
                </Text>
              </View>
              <Switch
                value={bookingForm.bookWithDriver}
                onValueChange={(val) =>
                  setBookingForm({ ...bookingForm, bookWithDriver: val })
                }
                trackColor={{ false: "#E5E7EB", true: COLORS.black }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Feather name="user" size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name*"
                  placeholderTextColor={COLORS.muted}
                  value={bookingForm.fullName}
                  editable={false}
                />
              </View>

              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Feather name="mail" size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address*"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="email-address"
                  value={bookingForm.email}
                  editable={false}
                />
              </View>

              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Feather name="phone" size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Contact*"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  value={bookingForm.contact}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.genderSection}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(["Male", "Female", "Others"] as const).map((gender) => (
                  <Pressable
                    key={gender}
                    style={[
                      styles.genderBtn,
                      bookingForm.gender === gender && styles.genderBtnActive,
                    ]}
                    onPress={() => setBookingForm({ ...bookingForm, gender })}
                  >
                    <Feather
                      name={
                        gender === "Male"
                          ? "user"
                          : gender === "Female"
                          ? "user"
                          : "users"
                      }
                      size={16}
                      color={
                        bookingForm.gender === gender
                          ? COLORS.white
                          : COLORS.text
                      }
                    />
                    <Text
                      style={[
                        styles.genderText,
                        bookingForm.gender === gender &&
                          styles.genderTextActive,
                      ]}
                    >
                      {gender}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.rentalSection}>
              <Text style={styles.label}>Rental Date & Time</Text>
              <View style={styles.rentalRow}>
                {(["Hour", "Day", "Weekly", "Monthly"] as const).map(
                  (period) => (
                    <Pressable
                      key={period}
                      style={[
                        styles.rentalBtn,
                        bookingForm.rentalPeriod === period &&
                          styles.rentalBtnActive,
                      ]}
                      onPress={() =>
                        setBookingForm({ ...bookingForm, rentalPeriod: period })
                      }
                    >
                      <Text
                        style={[
                          styles.rentalText,
                          bookingForm.rentalPeriod === period &&
                            styles.rentalTextActive,
                        ]}
                      >
                        {period}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            <View style={styles.dateRow}>
              <Pressable
                style={styles.dateBox}
                onPress={() => setShowDatePicker("pickup")}
              >
                <Text style={styles.dateLabel}>Pick up Date</Text>
                <View style={styles.dateValue}>
                  <Feather name="calendar" size={16} color={COLORS.muted} />
                  <Text style={styles.dateText}>
                    {formatDateDisplay(bookingForm.pickupDate)}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.dateBox}
                onPress={() => setShowDatePicker("return")}
              >
                <Text style={styles.dateLabel}>Return Date</Text>
                <View style={styles.dateValue}>
                  <Feather name="calendar" size={16} color={COLORS.muted} />
                  <Text style={styles.dateText}>
                    {formatDateDisplay(bookingForm.returnDate)}
                  </Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.locationSection}>
              <Text style={styles.label}>Car Location</Text>
              <View style={styles.locationBox}>
                <Feather name="map-pin" size={18} color={COLORS.muted} />
                <Text style={styles.locationText}>
                  {car.pickupAddress || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bookBtn} onPress={handlePayNow}>
          <Text style={styles.priceText}>
            ${calculateTotalPrice().toFixed(0)}
          </Text>
          <Text style={styles.bookText}>Pay Now</Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <CustomCalendar
          visible={!!showDatePicker}
          onClose={() => setShowDatePicker(null)}
          onSelect={(pickup, dropoff) => {
            if (showDatePicker === "pickup") {
              setBookingForm({ ...bookingForm, pickupDate: pickup });
            } else {
              setBookingForm({ ...bookingForm, returnDate: dropoff });
            }
            setShowDatePicker(null);
          }}
          initialPickup={bookingForm.pickupDate || new Date()}
          initialDropoff={
            bookingForm.returnDate ||
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          }
        />
      )}
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: { position: "relative" },
  image: { width, height: IMAGE_HEIGHT, backgroundColor: COLORS.border },
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
  dotActive: { width: 8, height: 8, backgroundColor: COLORS.white },
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
  rating: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  star: { fontSize: 16 },
  reviewCount: { fontSize: 13, color: COLORS.muted },
  noReviews: { fontSize: 13, color: COLORS.muted, fontStyle: "italic" },
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
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24 },
  ownerInfo: { gap: 2 },
  ownerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ownerName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  ownerActions: { flexDirection: "row", gap: 8 },
  ownerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
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
  featureLabel: { fontSize: 10, color: COLORS.muted, marginBottom: 4 },
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
  driverToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  driverTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  driverSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  genderSection: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  genderBtnActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  genderText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  genderTextActive: { color: COLORS.white },
  rentalSection: { marginBottom: 20 },
  rentalRow: { flexDirection: "row", gap: 12 },
  rentalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  rentalBtnActive: { backgroundColor: COLORS.black },
  rentalText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  rentalTextActive: { color: COLORS.white },
  dateRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  dateBox: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  dateValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 12, color: COLORS.muted },
  locationSection: { marginBottom: 20 },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
  },
  locationText: { flex: 1, fontSize: 13, color: COLORS.muted },
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
    gap: 12,
  },
  priceText: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  bookText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
});
