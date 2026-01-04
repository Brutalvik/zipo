// hooks/useRefreshMe.ts
import { useCallback, useState } from "react";
import { auth } from "@/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice"; 

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type RefreshMeResult = {
  user: any | null;
};

export function useRefreshMe() {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const refreshMe = useCallback(async (): Promise<RefreshMeResult> => {
    const current = auth.currentUser;
    if (!current) return { user: null };

    setLoading(true);
    try {
      const idToken = await current.getIdToken(true);
      if (!idToken) return { user: null };

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to refresh user");

      const json = JSON.parse(text);
      const freshUser = json?.user ?? null;

      if (freshUser) dispatch(updateUser(freshUser));

      return { user: freshUser };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return { refreshMe, loading };
}
