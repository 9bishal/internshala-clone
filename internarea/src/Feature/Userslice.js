import { createSlice } from "@reduxjs/toolkit";

export const userslice = createSlice({
  name: "user",
  initialState: {
    user: null,
    language: "en"
  },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredLanguage', action.payload);
      }
    }
  },
});
export const { login, logout, setLanguage } = userslice.actions;
export const selectuser = (state) => state.user.user;
export const selectLanguage = (state) => state.user.language;
export default userslice.reducer;
