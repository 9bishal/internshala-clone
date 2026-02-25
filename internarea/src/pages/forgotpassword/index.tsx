import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader } from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "@/utils/i18n";
import { selectLanguage } from "@/Feature/Userslice";

export default function ForgotPassword() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage);
  const { t } = useTranslation(language);
  const [step, setStep] = useState("email"); // email, otp, password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // Auto-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent sending if already sent (double-click protection)
    if (loading || otpSent) return;

    setLoading(true);

    try {
      const response = await axios.post(
        getApiEndpoint("/auth/forgot-password"),
        { email, language }
      );

      toast.success(response.data.message);
      setStep("otp");
      setTimer(600); // 10 minutes
      setOtpSent(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        getApiEndpoint("/auth/verify-otp-reset"),
        { email, otp, newPassword }
      );

      toast.success(response.data.message);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          {t('back')}
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {user ? t('change_password_page_title') : t('forgot_password')}
            </h1>
            <p className="text-indigo-100 mt-2 text-sm">
              {user 
                ? `${t('logged_in_as')} ${user.email}` 
                : t('signin_desc')
              }
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-8 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === "email" ? "bg-indigo-600 text-white" : "bg-green-500 text-white"
                }`}>
                  {step !== "email" ? "✓" : "1"}
                </div>
                <span className="ml-2 text-xs text-gray-600 hidden sm:inline">{t('step_1_email')}</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step !== "email" ? "bg-green-500" : "bg-gray-200"}`} />
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === "otp" ? "bg-indigo-600 text-white" : step === "email" ? "bg-gray-200 text-gray-500" : "bg-green-500 text-white"
                }`}>
                  2
                </div>
                <span className="ml-2 text-xs text-gray-600 hidden sm:inline">{t('step_2_verify_reset')}</span>
              </div>
            </div>
          </div>

          <form onSubmit={step === "email" ? handleRequestOTP : handleVerifyOTP} className="px-8 pb-8">
            {/* Step 1: Email */}
            {step === "email" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    {t('email_address')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('enter_registered_email_placeholder')}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 ${
                      user?.email ? "bg-gray-50" : ""
                    }`}
                    required
                    readOnly={!!user?.email}
                  />
                  {user?.email && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {t('autofilled_from_account')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || otpSent}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('sending_otp')}
                    </>
                  ) : otpSent ? (
                    t('requested')
                  ) : (
                    t('send_otp')
                  )}
                </button>
              </div>
            )}

            {/* Step 2: OTP & New Password */}
            {step === "otp" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                  <p className="text-sm text-gray-700">
                    OTP sent to <span className="font-semibold">{email}</span>
                  </p>
                  {timer > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expires in: <span className="font-semibold text-red-600">{formatTime(timer)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-widest font-mono transition-all text-gray-900"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('enter_new_password_placeholder')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-10 text-gray-900"
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
                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className={`text-xs flex items-center gap-1 ${newPassword.length >= 6 ? "text-green-600" : "text-gray-400"}`}>
                        {newPassword.length >= 6 ? "✓" : "○"} {t('min_6_chars')}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirm_password_placeholder')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{t('passwords_dont_match')}</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
                    <p className="text-xs text-green-600 mt-1">✓ {t('passwords_match')}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('resetting')}
                    </>
                  ) : (
                    t('reset_password')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtpSent(false);
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-indigo-600 hover:text-indigo-700 font-medium py-2 text-sm"
                >
                  ← {t('try_different_email')}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            {t('remember_password')}{" "}
            <button
              onClick={() => router.push("/")}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {t('go_to_login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
