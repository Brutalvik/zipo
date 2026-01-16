// hooks/useFreshAvatarUrl.ts
import * as React from "react";
import { useFocusEffect } from "expo-router";
import { auth } from "@/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice";
import { refreshSignedAvatarUrl } from "@/redux/thunks/avatarThunk";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type Options = {
  /** Also refresh /api/users/me on focus (recommended on Profile tab) */
  refreshMeOnFocus?: boolean;
  /** If true, refresh signed url even if profile_photo_url already exists (forces newest) */
  forceSignedUrlOnFocus?: boolean;
};

export function useFreshAvatarUrl(options?: Options) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user) as any;

  const refreshMeOnFocus = options?.refreshMeOnFocus ?? false;
  const forceSignedUrlOnFocus = options?.forceSignedUrlOnFocus ?? true;

  const profilePhotoPath = user?.profile_photo_path ?? null;
  const profilePhotoUrl = user?.profile_photo_url ?? null;

  const refreshMe = React.useCallback(async () => {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);
    if (!idToken) return;

    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) return;

    const json = JSON.parse(text);
    if (json?.user) dispatch(updateUser(json.user));
  }, [dispatch]);

  // Run when screen is focused (tabs/screens)
  useFocusEffect(
    React.useCallback(() => {
      if (refreshMeOnFocus) refreshMe();

      const shouldRefreshSignedUrl =
        !!profilePhotoPath && (forceSignedUrlOnFocus || !profilePhotoUrl);

      if (shouldRefreshSignedUrl) {
        dispatch(refreshSignedAvatarUrl());
      }
    }, [
      dispatch,
      refreshMe,
      refreshMeOnFocus,
      forceSignedUrlOnFocus,
      profilePhotoPath,
      profilePhotoUrl,
    ])
  );

  // Also run when path changes (after upload)
  React.useEffect(() => {
    if (!profilePhotoPath) return;
    dispatch(refreshSignedAvatarUrl());
  }, [dispatch, profilePhotoPath]);
}
