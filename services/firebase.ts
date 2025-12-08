// services/firebase.ts

import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const firebaseConfig = Constants.expoConfig?.extra?.firebaseConfig;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error(
    "Firebase configuration is missing or incomplete. Check app.config.ts and .env file."
  );
}

// Initialize the app
const app = initializeApp(firebaseConfig);
// Initialize Firebase Auth and export it
const { initializeAuth, getReactNativePersistence } = firebaseAuth as any;

// ✅ Auth with React Native persistence using AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export default app;
