import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  isAuthenticated: boolean;
  user: IUser | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<IUser>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    signOut: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },

    updateUser: (state, action: PayloadAction<Partial<IUser>>) => {
      if (!state.user) return;

      const prev = state.user;
      const patch = action.payload || {};

      const next: any = { ...prev, ...patch };
      if (
        (patch as any).profile_photo_url == null &&
        (prev as any).profile_photo_url
      ) {
        next.profile_photo_url = (prev as any).profile_photo_url;
      }

      state.user = next;
    },
  },
});

export const { signIn, signOut, updateUser } = authSlice.actions;
export default authSlice.reducer;
