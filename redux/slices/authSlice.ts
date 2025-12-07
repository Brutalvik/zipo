import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define the shape of the data in the slice (state)
interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
}

// Set the initial state
const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  userName: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Reducer to handle successful login
    signIn: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.isAuthenticated = true;
      state.userId = action.payload.id;
      state.userName = action.payload.name;
    },
    // Reducer to handle logout
    signOut: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.userName = null;
    },
  },
});

// Export the actions
export const { signIn, signOut } = authSlice.actions;

// Export the reducer for the store
export default authSlice.reducer;
