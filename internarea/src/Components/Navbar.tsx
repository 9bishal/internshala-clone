import React, { use, useEffect, useRef, useState } from "react";
import logo from "../Assets/logo.png";
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
interface User {
  name: string;
  email: string;
  photo: string;
}
const Navbar = () => {
  const user = useSelector(selectuser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handlelogin = async () => {
    try {
      console.log('🔐 Starting Google login...');
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login successful:', result.user.email);
      toast.success("Logged in successfully");
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('ℹ️ User closed the popup without completing login');
        // Don't show error toast for user-initiated cancellation
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('ℹ️ Popup request was cancelled');
        // Don't show error toast for cancelled request
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup was blocked. Please allow popups for this site.");
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        toast.error("Authentication is not supported in this browser environment.");
      } else {
        toast.error(`Login failed: ${error.message || 'Unknown error'}`);
      }
    }
  };
  const handlelogout = () => {
    signOut(auth);
    setShowUserMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-blue-600">
                <img src={"/logo.png"} alt="" className="h-16" />
              </a>
            </div>
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/internship"}>
                  <span>Internships</span>
                </Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/job"}>
                  <span>Jobs</span>
                </Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/publicspace"}>
                  <span>Public Space</span>
                </Link>
              </button>
              {user && (
                <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                  <Link href={"/messages"}>
                    <span>Messages</span>
                  </Link>
                </button>
              )}
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/subscription"}>
                  <span>Premium</span>
                </Link>
              </button>
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search opportunities..."
                  className="ml-2 bg-transparent focus:outline-none text-sm w-48"
                />
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    <img
                      src={user.photo || "/default-avatar.png"}
                      alt="user"
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-gray-700 hidden sm:inline max-w-[100px] truncate">
                      {user.name}
                    </span>
                    {showUserMenu ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link href="/profile" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          👤 My Profile
                        </Link>
                        <Link href="/messages" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          💬 My Messages
                        </Link>
                        <Link href="/friends" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          👥 Friends & Connections
                        </Link>
                        <Link href="/resume" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          📄 Resume Builder
                        </Link>
                        <Link href="/loginhistory" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          🔐 Login History
                        </Link>
                        <Link href="/language" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          🌐 Language
                        </Link>
                        <Link href="/forgotpassword" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          🔑 Change Password
                        </Link>
                        <div className="border-t border-gray-200 my-2"></div>
                        <button
                          onClick={handlelogout}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm font-medium"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handlelogin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50 "
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-700">Continue with google</span>
                  </button>
                  <a
                    href="/adminlogin"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Admin
                  </a>
                </>
              )}
            </div>
          </div>{" "}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
