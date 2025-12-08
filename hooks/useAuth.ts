import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/services/firebase";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { signOut as signOutAction } from "@/redux/slices/authSlice";

export const useAuth = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const logout = async () => {
    try {
      // 1) Sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error during Firebase sign-out:", error);
    } finally {
      // 2) ALWAYS clear Redux auth state
      dispatch(signOutAction());
    }
  };

  return {
    isAuthenticated,
    user,
    logout,
  };
};
