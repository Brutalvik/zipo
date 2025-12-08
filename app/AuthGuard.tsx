// app/AuthGuard.tsx
import React, { useEffect, useState, memo } from "react";
import { useSegments, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { signIn, signOut } from "@/redux/slices/authSlice";

// Routes that do NOT require login
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/onboarding",
];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments: string[] = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user && user.emailVerified) {
        // Logged in + email verified
        dispatch(
          signIn({
            id: user.uid,
            name: user.displayName || user.email || "",
          })
        );
      } else {
        // Not logged in or not verified
        dispatch(signOut());
      }

      setIsFirebaseInitialized(true);
    });

    return unsubscribe;
  }, [dispatch]);

  // Handle routing based on auth + current route
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    let currentPath: string;

    // When at root '/', segments is []
    if (segments.length === 0) {
      currentPath = "/";
    } else {
      // First segment maps to "/login", "/signup", "/(tabs)", etc.
      currentPath = `/${segments[0]}`;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    const appHome = "/(tabs)";

    if (isAuthenticated && isPublicRoute) {
      // Authenticated user on public route -> send to main app
      router.replace(appHome);
    } else if (!isAuthenticated && !isPublicRoute) {
      // Unauthenticated user on protected route -> send to landing page
      router.replace("/");
    }
  }, [isAuthenticated, isFirebaseInitialized, segments, router]);

  if (!isFirebaseInitialized) return null;

  return <>{children}</>;
}

export default memo(AuthGuard);
