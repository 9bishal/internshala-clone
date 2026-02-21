import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  Check,
  X,
  Zap,
  Shield,
  Crown,
  ArrowLeft,
  Loader,
} from "lucide-react";
import { toast } from "react-toastify";

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchPlansAndSubscription();
  }, [user]);

  const fetchPlansAndSubscription = async () => {
    try {
      setLoading(true);

      // Fetch plans
      const plansResponse = await axios.get(getApiEndpoint("/subscription/plans"));
      setPlans(plansResponse.data.plans);

      // Fetch user's current subscription
      const subResponse = await axios.get(
        getApiEndpoint(`/subscription/${user.uid}`)
      );
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
      toast.info("You are already on this plan");
      return;
    }

    setSubscribing(planId);

    try {
      // For demo purposes, we'll use a fake payment token
      const paymentToken = planId === "free" ? null : "demo_token_" + Date.now();

      const response = await axios.post(getApiEndpoint("/subscription/subscribe"), {
        uid: user.uid,
        planId,
        paymentToken,
      });

      toast.success(response.data.message);
      setSubscription({
        planId,
        status: "active",
        expiresAt: response.data.subscription.expiresAt,
        planDetails: response.data.subscription.planDetails,
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to subscribe"
      );
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel your subscription? You will be downgraded to the free plan."
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
      setSubscription({
        planId: "free",
        status: "cancelled",
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to cancel subscription"
      );
    } finally {
      setSubscribing(null);
    }
  };

  const formatExpiryDate = (date: any) => {
    if (!date) return "Lifetime";
    
    try {
      let dateObj;
      
      // Handle Firestore Timestamp
      if (date.toDate && typeof date.toDate === "function") {
        dateObj = date.toDate();
      } 
      // Handle ISO string or timestamp
      else if (typeof date === "string" || typeof date === "number") {
        dateObj = new Date(date);
      } 
      // Handle Date object
      else if (date instanceof Date) {
        dateObj = date;
      } 
      // Handle object with seconds (Firestore format)
      else if (date._seconds || date.seconds) {
        const seconds = date._seconds || date.seconds;
        dateObj = new Date(seconds * 1000);
      } else {
        return "N/A";
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "N/A";
      }
      
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
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
            Back
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your career growth
          </p>
        </div>

        {/* Current Subscription Info */}
        {subscription && subscription.planId !== "free" && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Current Plan</h3>
                <p className="text-gray-600 mt-2">
                  You are currently on the{" "}
                  <span className="font-bold text-blue-600">
                    {subscription.planDetails?.name}
                  </span>{" "}
                  plan
                </p>
                {subscription.expiresAt && (
                  <p className="text-sm text-gray-600 mt-1">
                    Expires on: <span className="font-semibold">{formatExpiryDate(subscription.expiresAt)}</span>
                  </p>
                )}
              </div>
              {subscription.planId !== "free" && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={subscribing === "cancel"}
                  className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                >
                  {subscribing === "cancel" ? "Cancelling..." : "Cancel Plan"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading plans...</p>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const isPopular = plan.id === "silver"; // Silver is the most popular mid-tier plan

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl overflow-hidden transition-all transform hover:scale-105 ${
                    isPopular ? "ring-2 ring-purple-500" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                      Most Popular
                    </div>
                  )}

                  <div
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col ${
                      isPopular ? "shadow-2xl" : ""
                    }`}
                  >
                    {/* Plan Header */}
                    <div
                      className={`px-6 py-8 ${
                        isPopular
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold">{plan.name}</h3>
                          {plan.duration && (
                            <p
                              className={`text-sm mt-1 ${
                                isPopular ? "text-purple-100" : "text-gray-600"
                              }`}
                            >
                              {plan.duration} days
                            </p>
                          )}
                        </div>
                        {getPlanIcon(plan.id)}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          ₹{plan.price}
                        </span>
                        {plan.duration && (
                          <span
                            className={`text-sm ${
                              isPopular
                                ? "text-purple-200"
                                : "text-gray-600"
                            }`}
                          >
                            /month
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex-grow px-6 py-8">
                      <ul className="space-y-4">
                        {plan.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-sm text-gray-700"
                          >
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="px-6 py-6 border-t border-gray-200">
                      {isCurrentPlan ? (
                        <button
                          disabled
                          className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold cursor-not-allowed"
                        >
                          ✓ Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={subscribing === plan.id}
                          className={`w-full py-3 rounded-lg font-semibold transition-all ${
                            isPopular
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg disabled:opacity-50"
                              : "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50"
                          }`}
                        >
                          {subscribing === plan.id ? (
                            <>
                              <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                              Subscribing...
                            </>
                          ) : (
                            `Subscribe to ${plan.name}`
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

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "Can I change my plan anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and digital wallets through our secure payment gateway.",
              },
              {
                q: "Is there a money-back guarantee?",
                a: "Yes, if you're not satisfied within 7 days, we offer a full refund, no questions asked.",
              },
              {
                q: "Do you offer discounts for annual plans?",
                a: "Yes! Subscribe to annual plans and save up to 30% compared to monthly billing.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h4 className="font-semibold text-gray-900 mb-3">
                  {item.q}
                </h4>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
