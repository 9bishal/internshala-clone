import Footer from "@/Components/Fotter";
import Navbar from "@/Components/Navbar";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { store } from "../store/store";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout } from "@/Feature/Userslice";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { getApiEndpoint } from "@/utils/api";

// Helper functions for device detection
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  return "Unknown";
};

const getOSInfo = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Win")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  return "Unknown";
};

const getDeviceType = () => {
  const userAgent = navigator.userAgent;
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) return "Mobile";
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  return "Desktop";
};

const getClientIP = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("Failed to get IP:", error);
    return "Unknown";
  }
};

export default function App({ Component, pageProps }: AppProps) {
  function AuthListener() {
    const dispatch = useDispatch();
    useEffect(() => {
      auth.onAuthStateChanged(async (authuser) => {
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
          
          // Sync user data with backend with retry logic
          const syncUserData = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
              try {
                await axios.post(
                  getApiEndpoint("/auth/sync-user"), 
                  {
                    uid: authuser.uid,
                    name: authuser.displayName || authuser.email?.split('@')[0] || "User",
                    email: authuser.email,
                    photo: authuser.photoURL,
                  },
                  { timeout: 10000 } // 10 second timeout
                );
                
                // Record login history
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
                
                // Success - break out of retry loop
                break;
              } catch (error: any) {
                console.error(`Failed to sync user data (attempt ${i + 1}/${retries}):`, error.message);
                
                if (i === retries - 1) {
                  // Last attempt failed
                  console.error("All sync attempts failed. User data may not be updated.");
                  
                  // Check if it's a network error
                  if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                    console.error("Backend server may not be running. Please check if the backend is started on port 5001.");
                  }
                } else {
                  // Wait before retrying (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
              }
            }
          };
          
          // Run sync in background without blocking
          syncUserData();
        } else {
          dispatch(logout());
        }
      });
    }, [dispatch]);
    return null;
  }

  return (
    <Provider store={store}>
      <AuthListener />
      <div className="bg-white">
        <ToastContainer/>
        <Navbar />
        <Component {...pageProps} />
        <Footer />
      </div>
    </Provider>
  );
}
