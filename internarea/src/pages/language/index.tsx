import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectuser, setLanguage } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  Globe,
  Check,
  ArrowLeft,
  Loader,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  requiresOTP: boolean;
}

export default function LanguagePreferences() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectuser);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState("select"); // select, otp

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchLanguagePreferences();
  }, [user]);

  const fetchLanguagePreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        getApiEndpoint(`/language/preference/${user.uid}`)
      );

      setCurrentLanguage(response.data.currentLanguage);
      setLanguages(response.data.languages);
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load language preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      toast.info("You are already using this language");
      return;
    }

    setSelectedLanguage(languageCode);
    const selectedLang = languages.find((l) => l.code === languageCode);

    if (selectedLang?.requiresOTP) {
      // Request OTP for languages that require verification
      try {
        const response = await axios.post(
          getApiEndpoint("/language/request-change"),
          {
            uid: user.uid,
            email: user.email,
            language: languageCode,
          }
        );

        toast.success(response.data.message);
        setStep("otp");
        setShowOTPModal(true);
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to request OTP"
        );
        setSelectedLanguage(null);
      }
    } else {
      // Directly change language for non-OTP languages
      try {
        const response = await axios.post(
          getApiEndpoint("/language/request-change"),
          {
            uid: user.uid,
            email: user.email,
            language: languageCode,
          }
        );

        setTimeout(() => {
          dispatch(setLanguage(languageCode));
          setCurrentLanguage(languageCode);
          setSelectedLanguage(null);
          toast.success(response.data.message);
        }, 1500);
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to change language"
        );
        setSelectedLanguage(null);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !selectedLanguage) {
      toast.error("Enter OTP");
      return;
    }

    setVerifying(true);

    try {
      const response = await axios.post(
        getApiEndpoint("/language/verify-change"),
        {
          uid: user.uid,
          otp,
          language: selectedLanguage,
        }
      );

      // Simulate a small loading delay to give user feedback
      setTimeout(() => {
        dispatch(setLanguage(selectedLanguage));
        setCurrentLanguage(selectedLanguage);
        setShowOTPModal(false);
        setOtp("");
        setSelectedLanguage(null);
        setStep("select");
        setVerifying(false); // only finish verifying when done
        toast.success(response.data.message);
      }, 1500);
      
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to verify OTP"
      );
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <h1 className="text-4xl font-bold text-gray-900">
            Language Preferences
          </h1>
          <p className="text-gray-600 mt-2">
            Choose your preferred language for the platform
          </p>
        </div>

        {/* Current Language Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Current Language</p>
              <p className="text-lg font-semibold text-gray-900">
                {languages.find((l) => l.code === currentLanguage)?.nativeName}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading languages...</p>
          </div>
        ) : (
          /* Languages Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {languages.map((language) => {
              const isSelected = language.code === currentLanguage;
              const isLoading =
                selectedLanguage === language.code;

              return (
                <button
                  key={language.code}
                  onClick={() => handleLanguageSelect(language.code)}
                  disabled={isLoading || isSelected}
                  className={`relative p-6 rounded-lg border-2 transition-all text-left overflow-hidden group ${
                    isSelected
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      {language.name}
                    </h3>
                    <p className="text-2xl font-bold text-gray-700 mt-2">
                      {language.nativeName}
                    </p>

                    {language.requiresOTP && (
                      <div className="mt-3 flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-yellow-800">
                          Requires OTP verification
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <p className="text-xs text-green-700 mt-3 font-medium">
                        ✓ Currently selected
                      </p>
                    )}

                    {isLoading && (
                      <div className="mt-3 flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-xs text-blue-600">
                          Processing...
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* OTP Modal */}
        {showOTPModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verify Language Change
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                An OTP has been sent to{" "}
                <span className="font-semibold">{user.email}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    OTP will expire in 10 minutes
                  </p>
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={!otp || verifying}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Change Language"
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowOTPModal(false);
                    setOtp("");
                    setSelectedLanguage(null);
                    setStep("select");
                  }}
                  className="w-full text-gray-600 hover:text-gray-900 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gray-50 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            About Language Support
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                Some languages require OTP verification for security purposes
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                Your language preference is saved immediately after verification
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                All platform content will be displayed in your selected language
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                You can change your language preference anytime from this page
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
