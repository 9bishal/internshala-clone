import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  auth,
  signInWithEmailAndPassword,
} from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { ChevronDown, ChevronUp, Search, Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";

interface User {
  name: string;
  email: string;
  photo: string;
}

const Navbar = () => {
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const loginFormRef = useRef<HTMLDivElement>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    const email = loginEmail.trim();

    try {
      // Use the email directly from state or trimmed variable
      const result = await signInWithEmailAndPassword(auth, email, loginPassword);
      console.log("✅ Login successful:", result.user.email);
      toast.success("Logged in successfully!");
      setShowLoginForm(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (error: any) {
      // Using console.warn instead of console.error for expected auth failures 
      // can sometimes prevent the Next.js dev overlay from appearing.
      console.warn("🔐 Auth warning:", error.code, error.message);

      // Clear fields on failure as requested
      setLoginEmail("");
      setLoginPassword("");

      // Handle specific Firebase auth errors
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email address.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many failed attempts. Please try again later.");
      } else {
        toast.error(`Login failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handlelogout = () => {
    signOut(auth);
    localStorage.removeItem("adminToken");
    setShowUserMenu(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (
        loginFormRef.current &&
        !loginFormRef.current.contains(event.target as Node)
      ) {
        setShowLoginForm(false);
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
              <Link href="/internship" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors">
                <span>{t('internships')}</span>
              </Link>
              <Link href="/job" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors">
                <span>{t('jobs')}</span>
              </Link>
              <Link href="/publicspace" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors">
                <span>{t('public_space')}</span>
              </Link>
              {user && (
                <Link href="/messages" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors">
                  <span>{t('messages')}</span>
                </Link>
              )}
              <Link href="/subscription" className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors">
                <span>{t('premium')}</span>
              </Link>
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
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
                          {t('my_profile')}
                        </Link>
                        <Link href="/messages" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('my_messages')}
                        </Link>
                        <Link href="/friends" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('friends')}
                        </Link>
                        <Link href="/resume" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('resume')}
                        </Link>
                        <Link href="/loginhistory" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('login_history')}
                        </Link>
                        <Link href="/language" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('language')}
                        </Link>
                        <Link href="/forgotpassword" className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm">
                          {t('change_password')}
                        </Link>
                        <div className="border-t border-gray-200 my-2"></div>
                        <button
                          onClick={handlelogout}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm font-medium"
                        >
                          {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  {/* Login Button */}
                  <div className="relative" ref={loginFormRef}>
                    <button
                      onClick={() => setShowLoginForm(!showLoginForm)}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg px-5 py-2 flex items-center space-x-2 hover:shadow-lg transition-all font-medium text-sm"
                    >
                      <LogIn size={16} />
                      <span>{t('login')}</span>
                    </button>

                    {/* Login Dropdown Form */}
                    {showLoginForm && (
                      <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                          <h3 className="text-white text-lg font-bold">{t('welcome_back')}</h3>
                          <p className="text-indigo-100 text-xs">{t('signin_desc')}</p>
                        </div>
                        <form onSubmit={handleEmailLogin} className="p-5 space-y-4">
                          {/* Email Input */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {t('email_address')}
                            </label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                                required
                              />
                            </div>
                          </div>

                          {/* Password Input */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {t('password')}
                            </label>
                            <div className="relative">
                              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type={showPassword ? "text" : "password"}
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Login Button */}
                          <button
                            type="submit"
                            disabled={loginLoading || !loginEmail || !loginPassword}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {loginLoading ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Signing in...</span>
                              </>
                            ) : (
                              <span>{t('sign_in')}</span>
                            )}
                          </button>

                          {/* Links */}
                          <div className="flex justify-between items-center text-xs">
                            <Link
                              href="/forgotpassword"
                              className="text-indigo-600 hover:text-indigo-700 font-medium"
                              onClick={() => setShowLoginForm(false)}
                            >
                              {t('forgot_password')}
                            </Link>
                            <Link
                              href="/register"
                              className="text-indigo-600 hover:text-indigo-700 font-medium"
                              onClick={() => setShowLoginForm(false)}
                            >
                              {t('create_account')}
                            </Link>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Register Button */}
                  <Link
                    href="/register"
                    className="border border-indigo-600 text-indigo-600 rounded-lg px-5 py-2 hover:bg-indigo-50 transition-all font-medium text-sm"
                  >
                    {t('register')}
                  </Link>

                  <a
                    href="/adminlogin"
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    {t('admin')}
                  </a>
                </div>
              )}
            </div>
          </div>{" "}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
