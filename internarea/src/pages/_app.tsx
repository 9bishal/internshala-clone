import Footer from "@/Components/Fotter";
import Navbar from "@/Components/Navbar";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { store } from "../store/store";
import { Provider, useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout } from "@/Feature/Userslice";
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
        
        // Only sync user data ONCE per component mount
        if (!hasSyncedUser.current) {
          hasSyncedUser.current = true;

          try {
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
            console.error("Failed to sync user data:", error.message);
          }
        }

        // Only record login history ONCE per browser session
        const sessionKey = `login_recorded_${authuser.uid}`;
        if (
          !hasRecordedLogin.current &&
          typeof window !== 'undefined' &&
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
              },
              { timeout: 10000 }
            );
          } catch (error: any) {
            console.error("Failed to record login history:", error.message);
          }
        }
      } else {
        dispatch(logout());
        hasSyncedUser.current = false;
        hasRecordedLogin.current = false;
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthListener />
      <div className="bg-white min-h-screen">
        <ToastContainer />
        <Navbar />
        <Component {...pageProps} />
        <Footer />
      </div>
    </Provider>
  );
}
