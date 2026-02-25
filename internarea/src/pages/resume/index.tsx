import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  Plus,
  Download,
  Trash2,
  ArrowLeft,
  Loader,
  Lock,
  FileText,
  CheckCircle,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "@/utils/i18n";
import { selectLanguage } from "@/Feature/Userslice";

interface Resume {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  experience: any[];
  education: any[];
  skills: string[];
  createdAt: any;
  updatedAt: any;
}

export default function ResumeBuilder() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage);
  const { t } = useTranslation(language);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user's subscription
      const subResponse = await axios.get(
        getApiEndpoint(`/razorpay-subscription/${user.uid}`)
      );
      setUserSubscription(subResponse.data);

      // TODO: Fetch user's resumes when storage is implemented
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResume = () => {
    // Check if user has premium subscription
    const premiumPlans = ["bronze", "silver", "gold"];
    if (!userSubscription || !premiumPlans.includes(userSubscription.planId?.toLowerCase())) {
      toast.error("Resume creation requires a premium subscription (Bronze, Silver, or Gold)");
      router.push("/subscription");
      return;
    }

    // Redirect to create resume flow (OTP + Payment + Editor)
    router.push("/resume/create");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const hasPremium = userSubscription && ["bronze", "silver", "gold"].includes(userSubscription.planId?.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('back_to_profile')}
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('resume_builder_title')}
            </h1>
            <p className="text-gray-600 mt-2">
              {t('resume_builder_desc')}
            </p>
          </div>

          <button
            onClick={handleCreateResume}
            disabled={!hasPremium}
            className={`flex items-center px-6 py-3 rounded-lg transition ${
              hasPremium
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {hasPremium ? (
              <>
                <Plus className="w-5 h-5 mr-2" />
                {t('create_new_resume')}
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Premium Only
              </>
            )}
          </button>
        </div>

        {/* Premium Required Banner */}
        {!hasPremium && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8 shadow-sm">
            <div className="flex items-start">
              <Lock className="w-6 h-6 text-yellow-600 mr-4 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Premium Feature: Resume Builder
                </h3>
                <p className="text-gray-700 mb-4">
                  Resume creation is exclusively available for our premium subscribers.
                  Upgrade to Bronze, Silver, or Gold plan to unlock this feature.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Professional resume templates
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Download as PDF
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Attached to your profile
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CreditCard className="w-4 h-4 text-blue-600 mr-2" />
                    ₹50 per resume (one-time payment)
                  </div>
                </div>
                <button
                  onClick={() => router.push("/subscription")}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  View Subscription Plans
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Premium User: Pricing Info */}
        {hasPremium && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg mb-8">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-blue-600 mr-4 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('resume_pricing_title')}
                </h3>
                <p className="text-gray-700 mb-3">
                  {t('resume_pricing_desc')}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {t('email_verification_otp')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {t('secure_payment_razorpay')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {t('instant_receipt')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumes List */}
        {resumes.length === 0 && hasPremium && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {t('no_resumes_yet')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('create_first_resume_desc') || "Create your first professional resume today!"}
            </p>
            <button
              onClick={handleCreateResume}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('create_first_resume')}
            </button>
          </div>
        )}

        {resumes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {resume.fullName}
                    </h3>
                    <p className="text-sm text-gray-600">{resume.email}</p>
                  </div>
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Experience:</span>{" "}
                    {resume.experience.length} positions
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Education:</span>{" "}
                    {resume.education.length} entries
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Skills:</span>{" "}
                    {resume.skills.length}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/resume/edit/${resume.id}`)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
                  >
                    Edit
                  </button>
                  <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscription Info */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('your_subscription')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('current_plan')}</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {userSubscription?.planId || "Free"}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('status_label')}</p>
              <p className={`text-lg font-semibold ${
                userSubscription?.status === "active" ? "text-green-600" : "text-red-600"
              }`}>
                {userSubscription?.status || "Inactive"}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('expires_on')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {userSubscription?.endsAt
                  ? new Date(userSubscription.endsAt.seconds * 1000).toLocaleDateString()
                  : t('not_available')}
              </p>
            </div>
          </div>
          {!hasPremium && (
            <button
              onClick={() => router.push("/subscription")}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
