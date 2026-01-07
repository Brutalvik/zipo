// hooks/useIdToken.ts
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/services/firebase";

export function useIdToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No authenticated user");

      const newToken = await currentUser.getIdToken(true);
      if (!newToken) throw new Error("Missing auth token");

      setToken(newToken);
      return newToken;
    } catch (err: any) {
      setError(err);
      setToken(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatically fetch token on mount
  useEffect(() => {
    refreshToken().catch(() => {
      /* already handled in state */
    });
  }, [refreshToken]);

  return { token, loading, error, refreshToken };
}
