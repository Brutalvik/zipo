// app/AuthGuard.tsx
import React, { useEffect, useState, memo } from "react"; // Added memo
import { useSegments, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { signIn, signOut } from "@/redux/slices/authSlice";

// List of routes accessible to UNAUTHENTICATED users
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/verify-otp", "/onboarding"];

/**
 * Checks authentication status and redirects user based on route segments.
 * Renders children (the navigation stack) once the Firebase session is verified.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  useEffect(() => {
    // Firebase listener to keep Redux state synchronized with Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in via Firebase
        dispatch(
          signIn({
            id: user.uid,
            name: user.displayName || user.email || "User",
          })
        );
      } else {
        // User is signed out
        dispatch(signOut());
      }
      setIsFirebaseInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 1. Wait until Firebase has checked the user's session from AsyncStorage/Cache
    if (!isFirebaseInitialized) return; // 2. Check if the current segment is public or private // segments[0] is the top-level route (e.g., 'login', '(tabs)', 'index')

    const currentPath = `/${segments[0]}`;
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath); // Get the correct home path
    const appHome = "/(tabs)";

    if (isAuthenticated && isPublicRoute) {
      router.replace(appHome);
    } else if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isAuthenticated, isFirebaseInitialized, segments]);
  return isFirebaseInitialized ? <>{children}</> : null;
}

export default memo(AuthGuard);
