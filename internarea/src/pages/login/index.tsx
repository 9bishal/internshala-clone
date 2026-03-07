import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth, signInWithEmailAndPassword } from "@/firebase/firebase";
import { sendEmailVerification } from "firebase/auth";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { selectuser, setChromeOTPRequired } from "@/Feature/Userslice";
import { getBrowserInfo } from "@/utils/deviceInfo";

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useSelector(selectuser);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!result.user.emailVerified) {
        try {
          await sendEmailVerification(result.user);
        } catch (err) {
          console.warn("Could not resend email verification", err);
        }
        await auth.signOut();
        toast.error("Please verify your email before logging in. A new verification link has been sent to your inbox.");
        setLoading(false);
        return;
      }

      // Eagerly check if the Chrome OTP modal needs to open to avoid flashing
      const browserName = getBrowserInfo().toLowerCase();
      const chromeVerifiedKey = `chrome_otp_verified_${result.user.uid}`;
      if (browserName === "chrome" && !sessionStorage.getItem(chromeVerifiedKey)) {
        dispatch(setChromeOTPRequired({ required: true, uid: result.user.uid }));
      }

      toast.success("Logged in successfully!");
      // redirection will be handled by useEffect
    } catch (error: any) {
      console.warn("🔐 Auth warning:", error.code, error.message);
      
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
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-indigo-100 mt-2">
              Sign in to continue your journey
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white transition-all"
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
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white transition-all"
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
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                href="/forgotpassword"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Create Account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
