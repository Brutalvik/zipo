// app/components/AuthGuard.tsx  (or wherever your AuthGuard lives)
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
  "/forgot-password",
];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments: string[] = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser && firebaseUser.emailVerified) {
          dispatch(
            signIn({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email || "",
              email: firebaseUser.email ?? "",
              photoURL: firebaseUser.photoURL,
              phoneNumber: firebaseUser.phoneNumber,
              emailVerified: firebaseUser.emailVerified,
              providerId: firebaseUser.providerId ?? null,
            })
          );
        }
        setIsFirebaseInitialized(true);
      }
    );

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const currentPath = segments.length === 0 ? "/" : `/${segments[0]}`;
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    // If authenticated and on "/" or "/login" etc, push into tabs
    if (
      isAuthenticated &&
      (currentPath === "/" ||
        currentPath === "/login" ||
        currentPath === "/signup")
    ) {
      router.replace("/(tabs)");
      return;
    }
  }, [isAuthenticated, isFirebaseInitialized, segments, router]);

  if (!isFirebaseInitialized) return null;
  return <>{children}</>;
}

export default memo(AuthGuard);
