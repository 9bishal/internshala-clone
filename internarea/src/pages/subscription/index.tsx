import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  Check,
  Zap,
  Shield,
  Crown,
  ArrowLeft,
  Loader,
  Clock,
  AlertTriangle,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "@/utils/i18n";

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number | null;
  features: string[];
}

interface UserSubscription {
  planId: string;
  status: string;
  expiresAt?: any;
  planDetails?: Plan;
}

export default function SubscriptionPlans() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successPlan, setSuccessPlan] = useState<string>("");

  // Check if current time is within the 10 AM - 11 AM IST payment window
  const isPaymentWindowOpen = () => {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now);
    const hour = parseInt(istTime);
    return hour >= 10 && hour < 11;
  };

  // Wait for auth to resolve
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchPlansAndSubscription();
    } else if (authChecked && !user) {
      setLoading(false);
    }
  }, [user, authChecked]);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchPlansAndSubscription = async () => {
    try {
      setLoading(true);
      const [plansResponse, subResponse] = await Promise.all([
        axios.get(getApiEndpoint("/razorpay-subscription/plans")),
        axios.get(getApiEndpoint(`/razorpay-subscription/${user.uid}`)),
      ]);
      setPlans(plansResponse.data.plans);
      setSubscription(subResponse.data);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (subscription?.planId === planId) {
      toast.info(t("already_on_plan"));
      return;
    }

    // Free plan - direct subscribe without payment
    if (planId === "free") {
      handleCancelSubscription();
      return;
    }

    // Enforce payment time window (10 AM - 11 AM IST)
    if (!isPaymentWindowOpen()) {
      toast.error(
        "⏰ Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try again during this window.",
        { autoClose: 6000 }
      );
      return;
    }

    if (!window.Razorpay) {
      toast.error("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    setSubscribing(planId);

    try {
      // Step 1: Create order on backend
      const orderRes = await axios.post(getApiEndpoint("/razorpay-subscription/create-order"), {
        uid: user.uid,
        planId,
      });

      const { orderId, amount, currency, planDetails } = orderRes.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Internshala Clone",
        description: `${planDetails.name} Subscription`,
        order_id: orderId,
        image: "/logo.png",
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        notes: {
          uid: user.uid,
          planId,
        },
        theme: {
          color: "#4F46E5",
        },
        handler: async (response: any) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await axios.post(
              getApiEndpoint("/razorpay-subscription/verify-payment"),
              {
                uid: user.uid,
                planId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                language,
              }
            );

            toast.success("🎉 Payment successful! Your subscription is now active.");
            setSuccessPlan(planDetails.name);
            setPaymentSuccess(true);
            setSubscription({
              planId,
              status: "active",
              expiresAt: verifyRes.data.subscription.expiresAt,
              planDetails: verifyRes.data.subscription.planDetails,
            });
          } catch (verifyError: any) {
            console.error("Payment verification failed:", verifyError);
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setSubscribing(null);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
            setSubscribing(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // Handle payment failure inside Razorpay
      rzp.on("payment.failed", async (response: any) => {
        console.error("Razorpay payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description || "Unknown error"}`, {
          autoClose: 6000,
        });

        // Notify backend to record failure and send failure email
        try {
          await axios.post(getApiEndpoint("/razorpay-subscription/payment-failed"), {
            uid: user.uid,
            planId,
            razorpay_order_id: orderId,
            error_code: response.error.code,
            error_description: response.error.description,
            language,
          });
        } catch (failErr) {
          console.error("Could not record payment failure:", failErr);
        }

        setSubscribing(null);
      });

      rzp.open();
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      const msg = error.response?.data?.message || "Failed to initiate payment";
      toast.error(msg, { autoClose: 6000 });
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        t("cancel_confirm")
      )
    ) {
      return;
    }

    setSubscribing("cancel");

    try {
      const response = await axios.post(
        getApiEndpoint(`/subscription/cancel-subscription/${user.uid}`)
      );
      toast.success(response.data.message);
      setSubscription({ planId: "free", status: "cancelled" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setSubscribing(null);
    }
  };

  const formatExpiryDate = (date: any) => {
    if (!date) return "Lifetime";
    try {
      let dateObj;
      if (date.toDate && typeof date.toDate === "function") {
        dateObj = date.toDate();
      } else if (typeof date === "string" || typeof date === "number") {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (date._seconds || date.seconds) {
        dateObj = new Date((date._seconds || date.seconds) * 1000);
      } else {
        return "N/A";
      }
      if (isNaN(dateObj.getTime())) return "N/A";
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(dateObj);
    } catch {
      return "N/A";
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "bronze":
        return <Shield className="w-8 h-8 text-amber-600" />;
      case "silver":
        return <Zap className="w-8 h-8 text-gray-400" />;
      case "gold":
        return <Crown className="w-8 h-8 text-yellow-500" />;
      default:
        return <Shield className="w-8 h-8 text-gray-500" />;
    }
  };

  const getPlanGradient = (planId: string) => {
    switch (planId) {
      case "bronze":
        return "from-amber-600 to-amber-800";
      case "silver":
        return "from-slate-400 to-slate-600";
      case "gold":
        return "from-yellow-400 to-yellow-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  // Payment time window indicator
  const paymentWindowOpen = isPaymentWindowOpen();

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{t("payment_successful")}</h1>
          <p className="text-gray-600 mb-2">
            {t("now_subscribed")} <span className="font-bold text-indigo-600">{successPlan}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {t("invoice_sent")}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setPaymentSuccess(false); fetchPlansAndSubscription(); }}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              {t("view_subscription")}
            </button>
            <button
              onClick={() => router.push("/internship")}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              {t("browse_internships_btn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t("back")}
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("choose_your_plan")}</h1>
          <p className="text-xl text-gray-600">
            {t("select_perfect_plan")}
          </p>
        </div>

        {/* Payment window status banner */}
        <div
          className={`mb-8 rounded-xl p-4 flex items-start gap-3 ${
            paymentWindowOpen
              ? "bg-green-50 border border-green-200"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          {paymentWindowOpen ? (
            <>
              <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">{t("payment_window_open")}</p>
                <p className="text-green-700 text-sm">
                  {t("payment_window_open_desc")}
                </p>
              </div>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">{t("payment_window_closed")}</p>
                <p className="text-amber-700 text-sm">
                  {t("payment_window_closed_desc")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Current Subscription Info */}
        {subscription && subscription.planId !== "free" && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{t("current_plan")}</h3>
                <p className="text-gray-600 mt-2">
                  {t("you_are_currently_on")}{" "}
                  <span className="font-bold text-blue-600">
                    {t(subscription.planDetails?.name || "")}
                  </span>{" "}
                  {t("plan_word")}
                </p>
                {subscription.expiresAt && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t("expires_on")}: <span className="font-semibold">{formatExpiryDate(subscription.expiresAt)}</span>
                  </p>
                )}
              </div>
              {subscription.planId !== "free" && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={subscribing === "cancel"}
                  className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                >
                  {subscribing === "cancel" ? (
                    <><Loader className="w-4 h-4 animate-spin" /> {t("cancelling")}</>
                  ) : t("cancel_plan")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading / Unauthenticated States */}
        {(loading && !authChecked) || (loading && user) ? (
          <div className="text-center py-16">
            <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t("loading_plans")}</p>
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("sign_in_plans")}</h2>
            <p className="text-gray-600 mb-6">{t("login_premium_desc")}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              {t("go_to_login")}
            </button>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const isPopular = plan.id === "silver";
              const gradient = getPlanGradient(plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl overflow-hidden transition-all transform hover:scale-105 ${
                    isPopular ? "ring-2 ring-purple-500 shadow-2xl" : "shadow-lg"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg z-10">
                      {t("most_popular")}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl overflow-hidden h-full flex flex-col">
                    {/* Plan Header */}
                    <div className={`bg-gradient-to-r ${gradient} px-6 py-6 text-white`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold">{t(plan.name)}</h3>
                          {plan.duration && (
                            <p className="text-xs opacity-80 mt-0.5">{plan.duration} {t("days")}</p>
                          )}
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-full p-2">
                          {getPlanIcon(plan.id)}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">₹{plan.price}</span>
                        {plan.price > 0 && (
                          <span className="text-sm opacity-80">{t("per_month")}</span>
                        )}
                        {plan.price === 0 && (
                          <span className="text-sm opacity-80">{t("free_forever")}</span>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex-grow px-5 py-5">
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{t(feature)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="px-5 py-5 border-t border-gray-100">
                      {isCurrentPlan ? (
                        <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-semibold text-center text-sm">
                          {t("current_plan_check")}
                        </div>
                      ) : plan.price === 0 ? (
                        <button
                          onClick={() => router.push("/internship")}
                          className="w-full py-3 rounded-lg font-semibold text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                        >
                          {t("browse_internships")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={!!subscribing}
                          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            isPopular
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-60"
                              : `bg-gradient-to-r ${gradient} text-white hover:shadow-lg disabled:opacity-60`
                          }`}
                        >
                          {subscribing === plan.id ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>{t("processing")}</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>{t("subscribe_btn")}{plan.price}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Razorpay Note */}
        {user && !loading && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="4" fill="#072654" />
                <path d="M7 17L12 7L17 17" stroke="#3395FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("secured_by_razorpay")}
            </p>
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {t("faq")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: t("when_payments"),
                a: t("when_payments_ans"),
              },
              {
                q: t("what_methods"),
                a: t("what_methods_ans"),
              },
              {
                q: t("will_invoice"),
                a: t("will_invoice_ans"),
              },
              {
                q: t("what_if_fails"),
                a: t("what_if_fails_ans"),
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-gray-900 mb-3">{item.q}</h4>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
