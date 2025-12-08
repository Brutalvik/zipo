// app/(tabs)/index.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Button from "@/app/components/Button/Button";
import { signOut as fbSignOut } from "firebase/auth";
import { auth } from "@/app/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { signOut as storeSignOut } from "@/redux/slices/authSlice";

export default function TabOneScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
      dispatch(storeSignOut());
      router.replace("/");
    } catch (e) {
      console.warn("Logout error", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <Text style={styles.subtitle}>
        This is your temporary home screen. We can replace this with Zipo UI
        later.
      </Text>

      <Button title="Log out" variant="secondary" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "white", marginBottom: 12 },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
  },
});
