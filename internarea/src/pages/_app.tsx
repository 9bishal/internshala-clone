import Footer from "@/Components/Fotter";
import Navbar from "@/Components/Navbar";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { store } from "../store/store";
import { Provider, useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout, setLanguage } from "@/Feature/Userslice";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { getApiEndpoint } from "@/utils/api";

// Helper functions for device detection (safe for SSR)
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return "Unknown";
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  return "Unknown";
};

const getOSInfo = () => {
  if (typeof window === 'undefined') return "Unknown";
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Win")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  return "Unknown";
};

const getDeviceType = () => {
  if (typeof window === 'undefined') return "Desktop";
  const userAgent = navigator.userAgent;
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) return "Mobile";
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  return "Desktop";
};

const getClientIP = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json", { timeout: 5000 });
    return response.data.ip;
  } catch (error) {
    return "Unknown";
  }
};

// AuthListener must be defined OUTSIDE the App component to prevent re-creation on every render
function AuthListener() {
  const dispatch = useDispatch();
  const hasRecordedLogin = useRef(false);
  const hasSyncedUser = useRef(false);

  // Load language from localStorage once on client mount to avoid hydration mismatch
  // This will apply the last saved language FOR THE LOGGED-IN USER immediately on refresh
  useEffect(() => {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
      dispatch(setLanguage(savedLang));
    }
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authuser) => {
      if (authuser) {
        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName || authuser.email?.split('@')[0] || "User",
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
          })
        );
        
        // Initial language from localStorage/default
        let currentLanguage = typeof window !== 'undefined' ? (localStorage.getItem('preferredLanguage') || "en") : "en";

        // Fetch user preferences and sync ONCE per component mount (on refresh)
        if (!hasSyncedUser.current) {
          hasSyncedUser.current = true;

          try {
            // 1. Fetch language preference from DB to ensure it matches account settings
            const langRes = await axios.get(
              getApiEndpoint(`/language/preference/${authuser.uid}`)
            );
            
            if (langRes.data && langRes.data.currentLanguage) {
              currentLanguage = langRes.data.currentLanguage;
              dispatch(setLanguage(currentLanguage));
              // Note: setLanguage reducer updates localStorage automatically
            }

            // 2. Sync user data (identity)
            await axios.post(
              getApiEndpoint("/auth/sync-user"), 
              {
                uid: authuser.uid,
                name: authuser.displayName || authuser.email?.split('@')[0] || "User",
                email: authuser.email,
                photo: authuser.photoURL,
              },
              { timeout: 10000 }
            );
          } catch (error: any) {
            console.error("AuthListener Initialization Error:", error.message);
          }
        }

        // Only record login history ONCE per browser session
        const sessionKey = `login_recorded_${authuser.uid}`;
        if (
          !hasRecordedLogin.current &&
          !sessionStorage.getItem(sessionKey)
        ) {
          hasRecordedLogin.current = true;
          sessionStorage.setItem(sessionKey, 'true');

          try {
            const deviceInfo = {
              userAgent: navigator.userAgent,
              browser: getBrowserInfo(),
              os: getOSInfo(),
              device: getDeviceType(),
            };

            const ipAddress = await getClientIP();
            
            await axios.post(
              getApiEndpoint("/auth/login-history"), 
              {
                uid: authuser.uid,
                email: authuser.email,
                ipAddress: ipAddress,
                deviceInfo,
                language: currentLanguage,
              },
              { timeout: 10000 }
            );
          } catch (error: any) {
            console.error("Failed to record login history:", error.message);
          }
        }
      } else {
        // User is logged out or a guest
        dispatch(logout());
        
        // Ensure admin session is also cleared when standard user logs out
        if (typeof window !== 'undefined') {
          localStorage.removeItem("adminToken");
        }
        
        // Force language to English for guest visits
        dispatch(setLanguage("en"));
        
        // Clear the preference so a new visitor/guest doesn't inherit a previous user's language
        if (typeof window !== 'undefined') {
          localStorage.removeItem('preferredLanguage');
        }
        
        hasSyncedUser.current = false;
        hasRecordedLogin.current = false;
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const adminRoutes = [
    '/adminlogin',
    '/adminpanel',
    '/applications',
    '/postJob',
    '/postInternship',
    '/users',
    '/analytics',
    '/settings',
    '/detailapplication/[id]'
  ];
  
  const isAdminRoute = adminRoutes.includes(router.pathname);

  return (
    <Provider store={store}>
      <AuthListener />
      <div className="bg-white min-h-screen">
        <ToastContainer />
        {!isAdminRoute && <Navbar />}
        <Component {...pageProps} />
        {!isAdminRoute && <Footer />}
      </div>
    </Provider>
  );
}
