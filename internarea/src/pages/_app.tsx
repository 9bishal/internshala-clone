import Footer from "@/Components/Fotter";
import Navbar from "@/Components/Navbar";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { store } from "../store/store";
import { Provider, useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout, setLanguage, setChromeOTPRequired, clearChromeOTP, selectChromeOTPRequired, selectChromeOTPUid, selectuser, selectLanguage } from "@/Feature/Userslice";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import { useTranslation } from "@/utils/i18n";

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

// Chrome OTP Verification Modal - blocks app access until OTP is verified
function ChromeOTPModal() {
  const dispatch = useDispatch();
  const chromeOTPRequired = useSelector(selectChromeOTPRequired);
  const chromeOTPUid = useSelector(selectChromeOTPUid);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  if (!chromeOTPRequired || !chromeOTPUid) return null;

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError(t("chrome_otp_invalid"));
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const response = await axios.post(
        getApiEndpoint("/auth/verify-chrome-otp"),
        { uid: chromeOTPUid, otp }
      );

      if (response.data.verified) {
        toast.success("✅ Chrome login verified successfully!");
        // Store in sessionStorage so the modal doesn't reappear on navigation
        sessionStorage.setItem(`chrome_otp_verified_${chromeOTPUid}`, 'true');
        dispatch(clearChromeOTP());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      dispatch(clearChromeOTP());
      dispatch(logout());
      toast.info("Logged out. You can try logging in again.");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', padding: '40px',
        maxWidth: '440px', width: '90%', textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Chrome icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '28px', color: 'white',
        }}>
          🔐
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px' }}>
          {t("chrome_otp_title")}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          {t("chrome_otp_desc")}
        </p>

        {/* OTP Input */}
        <input
          type="text"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          placeholder={t("chrome_otp_enter")}
          maxLength={6}
          autoFocus
          style={{
            width: '100%', padding: '14px', fontSize: '24px',
            textAlign: 'center', letterSpacing: '8px', fontFamily: 'monospace',
            border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
            borderRadius: '12px', outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
            color: '#1a1a2e',
            backgroundColor: '#ffffff',
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = '#4285F4';
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = '#e5e7eb';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
        />

        {/* Error message */}
        {error && (
          <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
            {error}
          </p>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={verifying || otp.length !== 6}
          style={{
            width: '100%', padding: '14px', marginTop: '20px',
            background: verifying || otp.length !== 6
              ? '#9ca3af'
              : 'linear-gradient(135deg, #4285F4, #3367D6)',
            color: 'white', border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: '600', cursor: verifying || otp.length !== 6 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {verifying ? t("chrome_otp_verifying") : t("chrome_otp_verify")}
        </button>

        {/* Logout option */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: '16px', background: 'none', border: 'none',
            color: '#6b7280', cursor: 'pointer', fontSize: '13px',
            textDecoration: 'underline',
          }}
        >
          {t("chrome_otp_signout")}
        </button>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '20px' }}>
          {t("chrome_otp_spam")}
        </p>
      </div>
    </div>
  );
}

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
            
            const loginRes = await axios.post(
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

            // Handle Chrome OTP requirement
            if (loginRes.data.requiresChromeOTP) {
              // Only show OTP modal if not already verified this session
              const chromeVerifiedKey = `chrome_otp_verified_${authuser.uid}`;
              if (!sessionStorage.getItem(chromeVerifiedKey)) {
                dispatch(setChromeOTPRequired({ required: true, uid: authuser.uid }));
              }
            }

            // Handle mobile time restriction (blocked by backend, show toast)
            if (loginRes.data.blocked && loginRes.data.reason === "mobile_time_restriction") {
              toast.error(loginRes.data.message, { autoClose: 8000 });
              await auth.signOut();
              dispatch(logout());
            }
          } catch (error: any) {
            // If login was blocked (e.g., mobile time restriction), the backend returns 403
            if (error.response?.status === 403 && error.response?.data?.reason === "mobile_time_restriction") {
              toast.error(error.response.data.message, { autoClose: 8000 });
              await auth.signOut();
              dispatch(logout());
            } else {
              console.error("Failed to record login history:", error.message);
            }
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
      <ChromeOTPModal />
      <div className="bg-white min-h-screen">
        <ToastContainer />
        {!isAdminRoute && <Navbar />}
        <Component {...pageProps} />
        {!isAdminRoute && <Footer />}
      </div>
    </Provider>
  );
}

