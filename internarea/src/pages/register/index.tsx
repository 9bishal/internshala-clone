import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "@/firebase/firebase";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useEffect } from "react";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const user = useSelector(selectuser);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !registered) {
      router.push("/");
    }
  }, [user, router, registered]);

  const passwordChecks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isFormValid =
    name.trim() &&
    email.trim() &&
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.match;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Please fill in all fields correctly.");
      return;
    }

    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Sync user data with backend
      try {
        await axios.post(getApiEndpoint("/auth/sync-user"), {
          uid: userCredential.user.uid,
          name: name,
          email: email,
          photo: null,
        });
      } catch (syncError) {
        console.warn("Backend sync failed, user still created:", syncError);
      }

      toast.success("Account created successfully! Welcome aboard!");
      setRegistered(true);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists. Please login.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email address.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak. Please use at least 6 characters.");
      } else {
        toast.error(
          `Registration failed: ${error.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Welcome, {name}! Redirecting to home page...
          </p>
          <div className="animate-pulse text-indigo-600 text-sm">
            Redirecting...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-10">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-indigo-100 mt-2">
              Join Internshala and find your dream internship
            </p>
          </div>

          <form onSubmit={handleRegister} className="p-8 space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicators */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.length
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    <span className="mr-1">
                      {passwordChecks.length ? "✓" : "○"}
                    </span>{" "}
                    At least 6 characters
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.uppercase
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    <span className="mr-1">
                      {passwordChecks.uppercase ? "✓" : "○"}
                    </span>{" "}
                    Contains uppercase letter
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.lowercase
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    <span className="mr-1">
                      {passwordChecks.lowercase ? "✓" : "○"}
                    </span>{" "}
                    Contains lowercase letter
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
              {confirmPassword.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    passwordChecks.match ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {passwordChecks.match
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign In
              </Link>
            </p>
          </form>
        </div>

        {/* Terms */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>
            By creating an account, you agree to our{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
