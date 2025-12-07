import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/slices/authSlice";

// Configure the store with the reducers
export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers here (e.g., carReducer, bookingReducer)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
