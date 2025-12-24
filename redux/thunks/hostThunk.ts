import { auth } from "@/services/firebase";
import {
  hostLoadStart,
  hostLoadSuccess,
  hostLoadError,
} from "@/redux/slices/hostSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

if (!API_BASE) {
  throw new Error("EXPO_PUBLIC_API_BASE is not set");
}

export const fetchHostMe = () => async (dispatch: any) => {
  dispatch(hostLoadStart());

  try {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);

    if (!idToken) {
      dispatch(hostLoadSuccess(null));
      return;
    }

    const res = await fetch(`${API_BASE}/api/host/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const text = await res.text();
    if (!res.ok) {
      // if backend returns 404 for "no host", treat it as null host
      if (res.status === 404) {
        dispatch(hostLoadSuccess(null));
        return;
      }
      throw new Error(text || "Failed to load host");
    }

    const json = JSON.parse(text);
    dispatch(hostLoadSuccess(json?.host ?? null));
  } catch (e: any) {
    dispatch(hostLoadError(e?.message || "Failed to load host profile"));
  }
};
