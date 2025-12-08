// app/services/firebase.ts
import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = Constants.expoConfig?.extra?.firebaseConfig;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error(
    "Firebase configuration is missing or incomplete. Check app.config.ts and .env file."
  );
}

const app = initializeApp(firebaseConfig);
const { initializeAuth, getReactNativePersistence } = firebaseAuth as any;

// ✅ Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ----- FIRESTORE -----
export const db = getFirestore(app);

export default app;
