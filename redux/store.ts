import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/slices/authSlice";
import carsReducer from "@/redux/slices/carSlice";

// Configure the store with the reducers
export const store = configureStore({
  reducer: {
    auth: authReducer,
    cars: carsReducer,
    // Add other reducers here (e.g., bookingReducer, paymentsReducer)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
