import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// -------------------------
//   TYPES
// -------------------------
interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  onPress?: () => void;
  isLoading?: boolean;

  /**
   * Button variants:
   * - primary: gradient dark
   * - secondary: outlined
   * - glass: glassmorphic
   * - social: Google / Apple style
   */
  variant?: "primary" | "secondary" | "glass" | "social";

  /** For Apple / Google / any FontAwesome icon */
  iconName?: keyof typeof FontAwesome.glyphMap;

  /** Optional sizes */
  size?: "sm" | "md" | "lg";

  /** Custom button styling */
  style?: TouchableOpacityProps["style"];
}

// -------------------------
//   THEME COLORS
// -------------------------
const ZIPO_COLORS = {
  primaryDark: "#0D0D0D",
  primaryLight: "#1E1E1E",
  gradientStart: "#111111",
  gradientEnd: "#2A2A2A",
  glassBG: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.25)",
  textWhite: "#FFFFFF",
  textBlack: "#000000",
  borderLight: "#D0D0D0",
  googleBlue: "#4285F4",
};

// -------------------------
//   COMPONENT
// -------------------------
const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  variant = "primary",
  iconName,
  size = "md",
  style,
  ...rest
}) => {
  const isDisabled = isLoading || rest.disabled;

  // Size mapping
  const sizeStyles = {
    sm: { paddingVertical: 10, fontSize: 14 },
    md: { paddingVertical: 14, fontSize: 16 },
    lg: { paddingVertical: 18, fontSize: 18 },
  };

  const currentSize = sizeStyles[size];

  // ------------------------------------
  //  Social Button (Google / Apple)
  // ------------------------------------
  if (variant === "social") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.socialButton,
          { paddingVertical: currentSize.paddingVertical },
          style,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={ZIPO_COLORS.textBlack} />
        ) : (
          <View style={styles.contentContainer}>
            {iconName && (
              <FontAwesome
                name={iconName}
                size={22}
                color={ZIPO_COLORS.textBlack}
                style={styles.icon}
              />
            )}
            <Text
              style={[styles.socialText, { fontSize: currentSize.fontSize }]}
            >
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ------------------------------------
  //  Glass Variant
  // ------------------------------------
  if (variant === "glass") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[
          styles.glassButton,
          { paddingVertical: currentSize.paddingVertical },
          style,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={ZIPO_COLORS.textWhite} />
        ) : (
          <View style={styles.contentContainer}>
            {iconName && (
              <FontAwesome
                name={iconName}
                size={20}
                color={ZIPO_COLORS.textWhite}
                style={styles.icon}
              />
            )}
            <Text
              style={[styles.glassText, { fontSize: currentSize.fontSize }]}
            >
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ------------------------------------
  //  PRIMARY (Gradient)
  // ------------------------------------
  const primaryButton = (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.primaryWrapper, style]}
      {...rest}
    >
      <LinearGradient
        colors={[ZIPO_COLORS.gradientStart, ZIPO_COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.primaryButton,
          { paddingVertical: currentSize.paddingVertical },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={ZIPO_COLORS.textWhite} />
        ) : (
          <View style={styles.contentContainer}>
            {iconName && (
              <FontAwesome
                name={iconName}
                size={20}
                color={ZIPO_COLORS.textWhite}
                style={styles.icon}
              />
            )}
            <Text
              style={[styles.primaryText, { fontSize: currentSize.fontSize }]}
            >
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // ------------------------------------
  //  SECONDARY (Outlined)
  // ------------------------------------
  if (variant === "secondary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[
          styles.secondaryButton,
          { paddingVertical: currentSize.paddingVertical },
          style,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={ZIPO_COLORS.primaryDark} />
        ) : (
          <View style={styles.contentContainer}>
            <Text
              style={[styles.secondaryText, { fontSize: currentSize.fontSize }]}
            >
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return primaryButton;
};

// -------------------------
//   STYLES
// -------------------------
const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  icon: { marginRight: 10 },

  // -------- PRIMARY (Gradient) --------
  primaryWrapper: { width: "100%", borderRadius: 14 },
  primaryButton: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryText: {
    color: ZIPO_COLORS.textWhite,
    fontWeight: "600",
  },

  // -------- SECONDARY (Outline) --------
  secondaryButton: {
    borderWidth: 1,
    borderColor: ZIPO_COLORS.borderLight,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  secondaryText: {
    color: ZIPO_COLORS.primaryDark,
    fontWeight: "600",
  },

  // -------- SOCIAL (Google / Apple) --------
  socialButton: {
    backgroundColor: ZIPO_COLORS.textWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.borderLight,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: {
    color: ZIPO_COLORS.textBlack,
    fontWeight: "500",
  },

  // -------- GLASS BUTTON --------
  glassButton: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: ZIPO_COLORS.glassBG,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.glassBorder,
    backdropFilter: "blur(8px)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassText: {
    color: ZIPO_COLORS.textWhite,
    fontWeight: "600",
  },
});

export default CustomButton;
