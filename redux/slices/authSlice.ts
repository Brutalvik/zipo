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
    // Store the FULL user object here
    signIn: (state, action: PayloadAction<IUser>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    signOut: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },

    // Optional: update only some fields (nice for mode switch / profile patch)
    updateUser: (state, action: PayloadAction<Partial<IUser>>) => {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { signIn, signOut, updateUser } = authSlice.actions;
export default authSlice.reducer;
