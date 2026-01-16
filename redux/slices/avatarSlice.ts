// redux/slices/avatarSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { uploadUserAvatar } from "@/redux/thunks/avatarThunk";

type AvatarState = {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastPhotoUrl: string | null;
  lastPhotoPath: string | null;
};

const initialState: AvatarState = {
  status: "idle",
  error: null,
  lastPhotoUrl: null,
  lastPhotoPath: null,
};

const avatarSlice = createSlice({
  name: "avatar",
  initialState,
  reducers: {
    clearAvatarError(state) {
      state.error = null;
    },
    resetAvatarState(state) {
      state.status = "idle";
      state.error = null;
      state.lastPhotoUrl = null;
      state.lastPhotoPath = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadUserAvatar.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.lastPhotoUrl = action.payload.photoUrl;
        state.lastPhotoPath = action.payload.photoPath;
      })
      .addCase(uploadUserAvatar.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string) || action.error.message || "Upload failed";
      });
  },
});

export const { clearAvatarError, resetAvatarState } = avatarSlice.actions;
export default avatarSlice.reducer;

export const selectAvatarUploadStatus = (s: any) =>
  s.avatar?.status as AvatarState["status"];
export const selectAvatarUploadError = (s: any) =>
  s.avatar?.error as string | null;
