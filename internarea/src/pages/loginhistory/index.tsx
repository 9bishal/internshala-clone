import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  Smartphone,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

interface LoginRecord {
  timestamp: any;
  ipAddress: string;
  deviceInfo: {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
  };
  isSuspicious: boolean;
  suspiciousReason?: string;
}

export default function LoginHistory() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || 'en';
  const { t } = useTranslation(language);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogins, setTotalLogins] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchLoginHistory();
  }, [user]);

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        getApiEndpoint(`/auth/login-history/${user.uid}`)
      );

      setLoginHistory(response.data.loginHistory || []);
      setTotalLogins(response.data.totalLogins || 0);
    } catch (error: any) {
      console.error("Error fetching login history:", error);
      toast.error("Failed to load login history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return t('not_available');
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp
      if (date._seconds) {
        dateObj = new Date(date._seconds * 1000);
      }
      // Handle Firestore toDate method
      else if (date.toDate && typeof date.toDate === "function") {
        dateObj = date.toDate();
      }
      // Handle ISO string or timestamp
      else {
        dateObj = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return t('invalid_date');
      }
      
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return t('invalid_date');
    }
  };

  const getDeviceIcon = (deviceInfo: any) => {
    const osLower = deviceInfo?.os?.toLowerCase() || "";
    if (osLower.includes("mobile") || osLower.includes("iphone")) {
      return <Smartphone className="w-5 h-5 text-blue-600" />;
    }
    return <Globe className="w-5 h-5 text-purple-600" />;
  };

  const maskIP = (ip: string) => {
    if (!ip) return "Unknown";
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
    }
    return ip.substring(0, 10) + "***";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{t('login_history_title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('login_history_desc')}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('total_logins')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalLogins}
                </p>
              </div>
              <Smartphone className="w-10 h-10 text-indigo-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('security_status')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  {t('secure')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('last_login')}</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">
                  {loginHistory.length > 0
                    ? formatDate(loginHistory[0]?.timestamp)
                    : t('never')}
                </p>
              </div>
              <Clock className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Suspicious Activity Alert */}
        {loginHistory.some((record) => record.isSuspicious) && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">
                  {t('suspicious_activity')}
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  {t('unusual_activity_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login History List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('loading_history')}</p>
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">{t('no_history_found')}</p>
            </div>
          ) : (
            loginHistory.map((record, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${
                  record.isSuspicious ? "border-red-500" : "border-green-500"
                } transition-all hover:shadow-lg`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      {getDeviceIcon(record.deviceInfo)}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {record.deviceInfo?.device || t('unknown_device')}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {record.deviceInfo?.browser || t('unknown_browser')} •{" "}
                          {record.deviceInfo?.os || t('unknown_os')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.isSuspicious ? (
                        <div className="flex items-center gap-2 text-red-600 font-semibold">
                          <AlertCircle className="w-5 h-5" />
                          <span>{t('suspicious')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle className="w-5 h-5" />
                          <span>{t('verified')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">{t('ip_address')}</p>
                      <p className="font-mono text-gray-900 mt-1">
                        {maskIP(record.ipAddress)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t('date_time')}</p>
                      <p className="text-gray-900 mt-1">
                        {formatDate(record.timestamp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t('user_agent')}</p>
                      <p className="text-gray-900 mt-1 truncate">
                        {record.deviceInfo?.userAgent || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {record.isSuspicious && record.suspiciousReason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                      <strong>{t('alert')}</strong> {record.suspiciousReason}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            {t('security_tips')}
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>{t('tip_review')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>{t('tip_2fa')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>{t('tip_logout')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>{t('tip_never_share')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
