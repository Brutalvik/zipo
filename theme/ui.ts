import { Platform } from "react-native";

export const BRAND = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#111827",
  muted: "rgba(17,24,39,0.65)",
  border: "rgba(0,0,0,0.10)",
  primary: "#111827",
  danger: "#DC2626",
  success: "#059669",
};

export const COLORS = {
  bg: "#F6F7FB",
  white: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "rgba(17, 24, 39, 0.10)",
  black: "#000000",
  amber: "#F59E0B",
  red: "#EF4444",
};

export const RADIUS = {
  xl: 16,
  lg: 14,
  md: 12,
};

export const SHADOW_CARD = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 2,
  },
  default: {},
});
