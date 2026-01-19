// app/car/car-details.tsx
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
import { mapCarApiToCar, resolveAmenities } from "@/types/carMapper";
import { fetchCarById as apiFetchCarById } from "@/services/carsApi";
import { useAppSelector } from "@/redux/hooks";
import { COLORS, RADIUS } from "@/theme/ui";
import { getAvatar } from "@/lib/avatar";
import { prettyLabel, prettyValue } from "@/lib/helpers";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = 280;

type BookingFormData = {
  bookWithDriver: boolean;
  fullName: string;
  email: string;
  contact: string;
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

  // ✅ Features expand/collapse
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // ✅ Top-right menu
  const [showMenu, setShowMenu] = useState(false);

  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    bookWithDriver: false,
    fullName: user?.name || "",
    email: user?.email || "",
    contact: user?.phoneNumber || "",
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

  console.log(car);

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

  // ✅ Full feature list for "More"
  const featureList = useMemo(() => {
    if (!car) return [];

    const items: { label: string; value: string }[] = [];

    // ✅ Always include these (so "More" makes sense)
    items.push({ label: "Vehicle Type", value: prettyValue(car.vehicleType) });
    items.push({ label: "Transmission", value: prettyValue(car.transmission) });
    items.push({ label: "Fuel Type", value: prettyValue(car.fuelType) });
    items.push({
      label: "Seats",
      value: car.seats != null ? String(car.seats) : "—",
    });
    items.push({
      label: "Year",
      value: car.year != null ? String(car.year) : "—",
    });

    // Optional extras if present
    if (car.make) items.push({ label: "Make", value: prettyValue(car.make) });
    if (car.model)
      items.push({ label: "Model", value: prettyValue(car.model) });
    if (car.trim) items.push({ label: "Trim", value: prettyValue(car.trim) });
    if (car.bodyType)
      items.push({ label: "Body Type", value: prettyValue(car.bodyType) });

    if (car.doors != null)
      items.push({ label: "Doors", value: String(car.doors) });
    if (car.evRangeKm != null)
      items.push({ label: "EV Range", value: `${car.evRangeKm} km` });
    if (car.odometerKm != null)
      items.push({ label: "Odometer", value: `${car.odometerKm} km` });

    // Deduplicate by label (just in case)
    const seen = new Set<string>();
    return items.filter((x) => {
      if (seen.has(x.label)) return false;
      seen.add(x.label);
      return true;
    });
  }, [car]);

  const amenityItems = useMemo(() => {
    return resolveAmenities(car?.features?.amenities ?? []);
  }, [car]);

  const canExpandAmenities = amenityItems.length > 6;

  const visibleAmenities = useMemo(
    () => (showAllFeatures ? amenityItems : amenityItems.slice(0, 6)),
    [amenityItems, showAllFeatures]
  );

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
  const hostAllStar = !!car.host?.isAllStar;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Car Details</Text>
        <Pressable style={styles.iconBtn} onPress={() => setShowMenu(true)}>
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
                  {hostAllStar && (
                    <Text style={styles.allStarBadge}> ALL-STAR</Text>
                  )}
                </Text>
              </View>
            </View>

            {/* ✅ removed phone action as requested */}
            <View style={styles.ownerActions}>
              <Pressable
                style={styles.ownerActionBtn}
                onPress={() =>
                  Alert.alert("Messaging", "Messaging will be enabled soon.")
                }
              >
                <Feather name="message-circle" size={18} color={COLORS.text} />
              </Pressable>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Car features</Text>

              {canExpandAmenities && (
                <Pressable
                  onPress={() => setShowAllFeatures((v) => !v)}
                  hitSlop={10}
                >
                  <Text style={styles.moreText}>
                    {showAllFeatures ? "Less" : "Show All"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* quick spec cards (still useful) */}
            <View style={styles.features}>
              <FeatureCard
                icon="users"
                label="Capacity"
                value={`${car.seats || 4} Seats`}
              />
              <FeatureCard
                icon="zap"
                label="Fuel Type"
                value={prettyLabel(car.fuelType)}
              />
              <FeatureCard
                icon="settings"
                label="Transmission"
                value={prettyLabel(car.transmission)}
              />
              <FeatureCard
                icon="truck"
                label="Vehicle Type"
                value={prettyLabel(car.vehicleType)}
              />
              <FeatureCard
                icon="calendar"
                label="Year"
                value={car.year?.toString() || "—"}
              />
            </View>

            {/* {showAllFeatures && featureList.length > 0 && (
              <View style={styles.allFeaturesBox}>
                {featureList.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Text style={styles.featureRowLabel}>{f.label}</Text>
                    <Text style={styles.featureRowValue}>{f.value}</Text>
                  </View>
                ))}
              </View>
            )} */}

            {/* amenities list */}
            {!!amenityItems.length && (
              <View style={styles.amenitiesWrap}>
                {visibleAmenities.map((a) => (
                  <View key={a.id} style={styles.amenityPill}>
                    <Feather name={a.icon} size={14} color={COLORS.text} />
                    <Text style={styles.amenityText}>{a.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {!amenityItems.length && (
              <Text style={styles.noAmenitiesText}>
                No extra features listed.
              </Text>
            )}
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

            {/* ✅ Gender removed as requested */}

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

      {/* ✅ 3-dots menu */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.menuCard}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert("Share", "Share will be enabled soon.");
              }}
            >
              <Text style={styles.menuItemText}>Share</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert("Report", "Report listing will be enabled soon.");
              }}
            >
              <Text style={styles.menuItemText}>Report listing</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
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

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

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

  // new: all-star + features more + menu
  allStarBadge: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 11,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  moreText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.black,
  },
  allFeaturesBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bg,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  featureRowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  featureRowValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  menuItem: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  menuItemText: {
    fontWeight: "800",
    color: COLORS.text,
  },
  amenitiesWrap: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  noAmenitiesText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
});
