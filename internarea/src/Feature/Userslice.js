import { createSlice } from "@reduxjs/toolkit";

export const userslice = createSlice({
  name: "user",
  initialState: {
    user: null,
    language: "en",
    chromeOTPRequired: false,
    chromeOTPUid: null,
  },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.chromeOTPRequired = false;
      state.chromeOTPUid = null;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("preferredLanguage", action.payload);
      }
    },
    setChromeOTPRequired: (state, action) => {
      state.chromeOTPRequired = action.payload.required;
      state.chromeOTPUid = action.payload.uid || null;
    },
    clearChromeOTP: (state) => {
      state.chromeOTPRequired = false;
      state.chromeOTPUid = null;
    },
  },
});
export const {
  login,
  logout,
  setLanguage,
  setChromeOTPRequired,
  clearChromeOTP,
} = userslice.actions;
export const selectuser = (state) => state.user.user;
export const selectLanguage = (state) => state.user.language;
export const selectChromeOTPRequired = (state) => state.user.chromeOTPRequired;
export const selectChromeOTPUid = (state) => state.user.chromeOTPUid;
export default userslice.reducer;
