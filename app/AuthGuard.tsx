import React, { useEffect, useState, memo } from "react";
import { useSegments, useRouter } from "expo-router";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { signIn } from "@/redux/slices/authSlice";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/verify-phone",
];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments: string[] = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // 1) Listen to Firebase auth state and SIGN IN if needed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser && firebaseUser.emailVerified) {
          const userPayload = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || "",
            email: firebaseUser.email ?? "",
            photoURL: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
            emailVerified: firebaseUser.emailVerified,
            providerId: firebaseUser.providerId ?? null,
          };

          dispatch(signIn(userPayload));
        }
        setIsFirebaseInitialized(true);
      }
    );

    return unsubscribe;
  }, [dispatch]);

  // 2) Handle routing based on Redux auth + current route + phone verification
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    let currentPath: string;
    if (segments.length === 0) {
      currentPath = "/";
    } else {
      currentPath = `/${segments[0]}`;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    const appHome = "/(tabs)";
    const hasPhoneVerified = !!user?.phoneNumber;

    // 🔐 NOT authenticated
    if (!isAuthenticated) {
      // If trying to access a protected route, kick back to Get Started
      if (!isPublicRoute) {
        router.replace("/login");
      }
      return;
    }

    // ✅ Authenticated

    // Authenticated + on a public route → redirect to home / verify-phone
    if (isAuthenticated && isPublicRoute && currentPath !== "/verify-phone") {
      if (!hasPhoneVerified) {
        router.replace("/verify-phone");
        return;
      }

      router.replace(appHome);
      return;
    }

    // Authenticated but phone NOT verified → force /verify-phone
    if (
      isAuthenticated &&
      !hasPhoneVerified &&
      currentPath !== "/verify-phone"
    ) {
      router.replace("/verify-phone");
      return;
    }

    // Authenticated + phone verified + stuck on /verify-phone → send home
    if (
      isAuthenticated &&
      hasPhoneVerified &&
      currentPath === "/verify-phone"
    ) {
      router.replace(appHome);
      return;
    }
  }, [isAuthenticated, isFirebaseInitialized, segments, router, user]);

  if (!isFirebaseInitialized) return null;

  return <>{children}</>;
}

export default memo(AuthGuard);
