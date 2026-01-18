import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import CustomCalendar from "@/components/common/CustomCalendar";
import type { Car } from "@/types/car";
import type { CarApi } from "@/types/carApi";
import { mapCarApiToCar } from "@/types/carMapper";
import { fetchCarById as apiFetchCarById } from "@/services/carsApi";
import { useAppSelector } from "@/redux/hooks";
import { COLORS, RADIUS } from "@/theme/ui";
import { getAvatar } from "@/lib/avatar";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = 280;

type BookingFormData = {
  bookWithDriver: boolean;
  fullName: string;
  email: string;
  contact: string;
  gender: "Male" | "Female" | "Others";
  pickupDate: Date | null;
  returnDate: Date | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export default function CarDetailsScreen() {
  const router = useRouter();
  const { carId } = useLocalSearchParams<{ carId: string }>();

  const user = useAppSelector((s) => s.auth.user);

  const [car, setCar] = useState<Car | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    pickupDate: null,
    returnDate: null,
  });

  const flatListRef = useRef<FlatList>(null);

  const needsKyc = useMemo(
    () => user?.kycStatus !== "verified",
    [user?.kycStatus]
  );

  // ALWAYS fetch fresh car data when this screen opens / carId changes
  useEffect(() => {
    let alive = true;

    async function load() {
      const id = String(carId ?? "").trim();
      if (!id) {
        setLoadState("error");
        setErrorMsg("Missing carId");
        return;
      }

      setLoadState("loading");
      setErrorMsg(null);

      try {
        const apiItem = await apiFetchCarById(`${id}?t=${Date.now()}`);
        if (!alive) return;

        if (!apiItem) {
          setLoadState("error");
          setErrorMsg("Car not found");
          setCar(null);
          return;
        }

        const uiCar = mapCarApiToCar(apiItem as CarApi);
        setCar(uiCar);
        setLoadState("ready");
      } catch (e: any) {
        if (!alive) return;
        setLoadState("error");
        setErrorMsg(e?.message ?? "Failed to load car");
        setCar(null);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [carId]);

  const images = useMemo(() => {
    if (!car) return [];
    const urls = new Set<string>();

    if (car.imageUrl) urls.add(String(car.imageUrl));

    (car.imageGallery ?? []).forEach((img: any) => {
      const url = typeof img === "string" ? img : img?.url;
      if (url) urls.add(String(url));
    });

    return Array.from(urls);
  }, [car]);

  const infiniteImages = useMemo(() => {
    if (images.length < 2) return images;
    return [...images, ...images, ...images];
  }, [images]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!images.length) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(index % images.length);
    },
    [images.length]
  );

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  };

  const calculateTotalPrice = useCallback(() => {
    if (!car || !bookingForm.pickupDate || !bookingForm.returnDate) return 0;
    const diffTime =
      bookingForm.returnDate.getTime() - bookingForm.pickupDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(days, 1) * car.pricePerDay;
  }, [car, bookingForm.pickupDate, bookingForm.returnDate]);

  const handleDateSelect = useCallback(
    (selectedDate: Date) => {
      if (showDatePicker === "pickup") {
        setBookingForm((prev) => ({
          ...prev,
          pickupDate: selectedDate,
          returnDate: null,
        }));
      } else if (showDatePicker === "return") {
        setBookingForm((prev) => ({ ...prev, returnDate: selectedDate }));
      }
      setShowDatePicker(null);
    },
    [showDatePicker]
  );

  const handlePayNow = () => {
    if (needsKyc) {
      Alert.alert("KYC Verification", "Please verify your profile to book.");
      return;
    }
    if (!bookingForm.pickupDate || !bookingForm.returnDate) {
      Alert.alert("Date Required", "Please select your rental duration.");
      return;
    }
    console.log("Processing Booking...", bookingForm);
  };

  // ---- Loading / error states (prevents your "imageUrl of undefined" crash) ----
  if (loadState === "loading" || loadState === "idle") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading car details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === "error" || !car) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load this car</Text>
          <Text style={styles.errorMsg}>{errorMsg ?? "Unknown error"}</Text>

          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hostName = car.host?.name?.trim() || "Host";
  const hostAvatar = getAvatar(car.host?.avatarUrl);

  const hostVerified = !!car.host?.isVerified;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
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
        {/* Image Slider */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={flatListRef}
            data={infiniteImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.image} />
            )}
            getItemLayout={(_, index) => ({
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
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{car.title}</Text>

          {/* Ratings */}
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>{car.rating?.toFixed(1) || "0.0"}</Text>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.reviewCount}>({car.reviews || 0} Reviews)</Text>
          </View>

          {/* Owner Profile (REAL DATA) */}
          <View style={styles.ownerSection}>
            <View style={styles.ownerRow}>
              <Image
                source={hostAvatar}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#eee",
                }}
                resizeMode="cover"
              />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>
                  {hostName}{" "}
                  {hostVerified && (
                    <Feather name="check-circle" size={14} color="#1DA1F2" />
                  )}
                </Text>
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

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Car features</Text>
            <View style={styles.features}>
              <FeatureCard
                icon="users"
                label="Capacity"
                value={`${car.seats || 4} Seats`}
              />
              <FeatureCard
                icon="zap"
                label="Fuel Type"
                value={car.fuelType || "—"}
              />
              <FeatureCard
                icon="settings"
                label="Transmission"
                value={car.transmission || "—"}
              />
              <FeatureCard
                icon="truck"
                label="Vehicle Type"
                value={car.vehicleType || "—"}
              />
              <FeatureCard
                icon="calendar"
                label="Year"
                value={car.year?.toString() || "—"}
              />
            </View>
          </View>

          {/* Booking Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.driverToggle}>
              <View>
                <Text style={styles.driverTitle}>Book with driver</Text>
                <Text style={styles.driverSubtitle}>
                  Professional assistance for your trip.
                </Text>
              </View>
              <Switch
                value={bookingForm.bookWithDriver}
                onValueChange={(val) =>
                  setBookingForm((p) => ({ ...p, bookWithDriver: val }))
                }
                trackColor={{ false: "#E5E7EB", true: COLORS.black }}
              />
            </View>

            <View style={styles.inputGroup}>
              <InputItem icon="user" value={bookingForm.fullName} />
              <InputItem icon="mail" value={bookingForm.email} />
              <InputItem icon="phone" value={bookingForm.contact} />
            </View>

            <View style={styles.genderSection}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(["Male", "Female", "Others"] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[
                      styles.genderBtn,
                      bookingForm.gender === g && styles.genderBtnActive,
                    ]}
                    onPress={() => setBookingForm((p) => ({ ...p, gender: g }))}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        bookingForm.gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.dateRow}>
              <DateBox
                label="Pick up Date"
                value={formatDateDisplay(bookingForm.pickupDate)}
                onPress={() => setShowDatePicker("pickup")}
              />
              <DateBox
                label="Return Date"
                value={formatDateDisplay(bookingForm.returnDate)}
                onPress={() => {
                  if (!bookingForm.pickupDate) {
                    return Alert.alert(
                      "Wait",
                      "Please select a pickup date first."
                    );
                  }
                  setShowDatePicker("return");
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bookBtn} onPress={handlePayNow}>
          <Text style={styles.priceText}>${calculateTotalPrice()}</Text>
          <Text style={styles.bookText}>Pay Now</Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <CustomCalendar
          visible={!!showDatePicker}
          mode={showDatePicker}
          onClose={() => setShowDatePicker(null)}
          onSelect={handleDateSelect}
          initialDate={
            showDatePicker === "return"
              ? new Date(
                  bookingForm.pickupDate!.getTime() + 24 * 60 * 60 * 1000
                )
              : bookingForm.pickupDate || undefined
          }
          minDate={
            showDatePicker === "return"
              ? new Date(
                  bookingForm.pickupDate!.getTime() + 24 * 60 * 60 * 1000
                )
              : new Date()
          }
        />
      )}
    </SafeAreaView>
  );
}

const FeatureCard = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIcon}>
      <Feather name={icon} size={18} color={COLORS.muted} />
    </View>
    <Text style={styles.featureLabel}>{label}</Text>
    <Text style={styles.featureValue}>{value}</Text>
  </View>
);

const InputItem = ({ icon, value }: { icon: any; value: string }) => (
  <View style={[styles.inputWrapper, styles.inputDisabled]}>
    <Feather name={icon} size={18} color={COLORS.muted} />
    <TextInput style={styles.input} value={value} editable={false} />
  </View>
);

const DateBox = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) => (
  <Pressable style={styles.dateBox} onPress={onPress}>
    <Text style={styles.dateLabel}>{label}</Text>
    <View style={styles.dateValue}>
      <Feather name="calendar" size={16} color={COLORS.muted} />
      <Text style={styles.dateText}>{value}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  errorTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  errorMsg: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.black,
  },
  backBtnText: { color: COLORS.white, fontWeight: "800" },

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
    elevation: 4,
  },

  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  description: { marginTop: 8, fontSize: 13, color: COLORS.muted },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  rating: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  star: { fontSize: 14 },
  reviewCount: { fontSize: 13, color: COLORS.muted },

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
    width: "30.5%",
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureLabel: { fontSize: 10, color: COLORS.muted, marginBottom: 4 },
  featureValue: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
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
  },
  inputDisabled: { opacity: 0.7 },
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
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  genderBtnActive: { backgroundColor: COLORS.black },
  genderText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  genderTextActive: { color: COLORS.white },

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
  dateText: { fontSize: 11, color: COLORS.text, fontWeight: "700" },

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
