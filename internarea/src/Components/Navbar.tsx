import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  auth,
  signInWithEmailAndPassword,
} from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { ChevronDown, ChevronUp, Search, Mail, Lock, Eye, EyeOff, LogIn, Menu, X } from "lucide-react";
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);



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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && !(event.target as Element).closest('.mobile-menu-btn')) {
        setShowMobileMenu(false);
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
            <div className="flex-shrink-0 flex items-center">
              {/* Mobile Menu Button */}
              <button 
                className="md:hidden mr-2 text-gray-600 hover:text-blue-600 mobile-menu-btn"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
              
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
            <div className="hidden md:flex items-center space-x-4">
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
                  <div className="relative">
                    <Link
                      href="/login"
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg px-5 py-2 flex items-center space-x-2 hover:shadow-lg transition-all font-medium text-sm"
                    >
                      <LogIn size={16} />
                      <span>{t('login')}</span>
                    </Link>
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
          </div> 
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div ref={mobileMenuRef} className="md:hidden bg-white border-t border-gray-100 shadow-xl absolute w-full z-50">
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-full">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  className="ml-2 bg-transparent focus:outline-none text-gray-900 text-sm w-full"
                />
              </div>

              <div className="flex flex-col space-y-3">
                <Link href="/internship" className="text-gray-700 hover:text-blue-600 font-medium py-2" onClick={() => setShowMobileMenu(false)}>
                  {t('internships')}
                </Link>
                <Link href="/job" className="text-gray-700 hover:text-blue-600 font-medium py-2" onClick={() => setShowMobileMenu(false)}>
                  {t('jobs')}
                </Link>
                <Link href="/publicspace" className="text-gray-700 hover:text-blue-600 font-medium py-2" onClick={() => setShowMobileMenu(false)}>
                  {t('public_space')}
                </Link>
                {user && (
                  <Link href="/messages" className="text-gray-700 hover:text-blue-600 font-medium py-2" onClick={() => setShowMobileMenu(false)}>
                    {t('messages')}
                  </Link>
                )}
                <Link href="/subscription" className="text-gray-700 hover:text-blue-600 font-medium py-2" onClick={() => setShowMobileMenu(false)}>
                  {t('premium')}
                </Link>
              </div>

              <div className="border-t border-gray-200 pt-4 pb-2">
                {!user ? (
                  <div className="flex flex-col space-y-3">
                    <Link
                      href="/login"
                      onClick={() => setShowMobileMenu(false)}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg px-5 py-2.5 flex items-center justify-center space-x-2 font-medium text-sm w-full"
                    >
                      <LogIn size={16} />
                      <span>{t('login')}</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setShowMobileMenu(false)}
                      className="border border-indigo-600 text-indigo-600 bg-white rounded-lg px-5 py-2.5 text-center font-medium text-sm w-full"
                    >
                      {t('register')}
                    </Link>
                    <Link
                      href="/adminlogin"
                      onClick={() => setShowMobileMenu(false)}
                      className="text-gray-600 hover:text-gray-800 text-sm text-center py-2"
                    >
                      {t('admin')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3 mb-4 p-2 bg-gray-50 rounded-lg">
                      <img
                        src={user.photo || "/default-avatar.png"}
                        alt="user"
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600 truncate max-w-[200px]">{user.email}</p>
                      </div>
                    </div>
                    
                    <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm rounded-lg">
                      {t('my_profile')}
                    </Link>
                    <Link href="/friends" onClick={() => setShowMobileMenu(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm rounded-lg">
                      {t('friends')}
                    </Link>
                    <Link href="/resume" onClick={() => setShowMobileMenu(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm rounded-lg">
                      {t('resume')}
                    </Link>
                    <Link href="/loginhistory" onClick={() => setShowMobileMenu(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm rounded-lg">
                      {t('login_history')}
                    </Link>
                    <Link href="/language" onClick={() => setShowMobileMenu(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 block text-sm rounded-lg">
                      {t('language')}
                    </Link>
                    <button
                      onClick={() => {
                        handlelogout();
                        setShowMobileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg mt-2"
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
