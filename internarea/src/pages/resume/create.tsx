import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Lock,
  CheckCircle,
  CreditCard,
  Mail,
  Shield,
  AlertCircle,
  X,
  Loader,
} from "lucide-react";
import { toast } from "react-toastify";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CreateResume() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        getApiEndpoint(`/resume/access/${user.uid}`)
      );

      const access = response.data;
      setUserSubscription(access.planDetails);

      // Wait, let any user request the OTP and pay the Rs 50.
      if (access.hasPaidForResume) {
        router.push("/resume-editor");
        return;
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      toast.error("Failed to verify access");
      router.push("/subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    setRequestingOTP(true);
    try {
      const response = await axios.post(
        getApiEndpoint("/resume-razorpay/request-otp"),
        {
          uid: user.uid,
          language: language,
        }
      );

      toast.success(response.data.message);
      setOtpSent(true);
    } catch (error: any) {
      if (error.response?.data?.requiresPremium) {
        toast.error(error.response.data.message);
        router.push("/subscription");
      } else {
        toast.error(error.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      setRequestingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setVerifyingOTP(true);

    try {
      const response = await axios.post(
        getApiEndpoint("/resume-razorpay/verify-otp"),
        {
          uid: user.uid,
          otp,
        }
      );

      if (response.data.verified) {
        toast.success("OTP verified successfully!");
        setOtpVerified(true);
        setCurrentStep(2);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setVerifyingOTP(false);
    }
  };

  const initiatePayment = async () => {
    setProcessingPayment(true);

    try {
      // Create Razorpay order
      const orderResponse = await axios.post(
        getApiEndpoint("/resume-razorpay/create-resume-order"),
        {
          uid: user.uid,
        }
      );

      const { orderId, amount, currency, price } = orderResponse.data;

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amount,
          currency: currency,
          name: "Internshala Resume Builder",
          description: `Resume Creation - ₹${price}`,
          order_id: orderId,
          handler: async (response: any) => {
            await verifyPayment(response);
          },
          prefill: {
            name: user.name || "",
            email: user.email || "",
          },
          theme: {
            color: "#3B82F6",
          },
          modal: {
            ondismiss: async () => {
              setProcessingPayment(false);
              toast.info("Payment cancelled");
              // Notify backend about cancellation
              try {
                await axios.post(
                  getApiEndpoint("/resume-razorpay/payment-failed"),
                  {
                    uid: user.uid,
                    razorpay_order_id: orderId,
                    reason: "Payment cancelled by user",
                  }
                );
              } catch (err) {
                console.error("Failed to record payment cancellation:", err);
              }
            },
          },
        };

        const razorpay = new window.Razorpay(options);

        // Handle payment failure from Razorpay
        razorpay.on("payment.failed", async (response: any) => {
          setProcessingPayment(false);
          const failReason =
            response.error?.description ||
            response.error?.reason ||
            "Payment failed";
          toast.error(`Payment failed: ${failReason}`);
          try {
            await axios.post(
              getApiEndpoint("/resume-razorpay/payment-failed"),
              {
                uid: user.uid,
                razorpay_order_id: orderId,
                reason: failReason,
              }
            );
          } catch (err) {
            console.error("Failed to record payment failure:", err);
          }
        });

        razorpay.open();
      };

      script.onerror = () => {
        setProcessingPayment(false);
        toast.error("Failed to load payment gateway");
      };
    } catch (error: any) {
      setProcessingPayment(false);
      if (error.response?.data?.requiresOTP) {
        toast.error("Please verify OTP first");
        setCurrentStep(1);
      } else {
        toast.error(error.response?.data?.message || "Failed to initiate payment");
      }
    }
  };

  const verifyPayment = async (paymentData: any) => {
    try {
      const response = await axios.post(
        getApiEndpoint("/resume-razorpay/verify-resume-payment"),
        {
          uid: user.uid,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }
      );

      toast.success("Payment successful! Redirecting to resume editor...");
      
      // Wait for 2 seconds then redirect
      setTimeout(() => {
        router.push("/resume-editor");
      }, 2000);
    } catch (error: any) {
      setProcessingPayment(false);
      toast.error(error.response?.data?.message || "Payment verification failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Your Professional Resume
          </h1>
          <p className="text-gray-600">
            One-time payment of ₹50 per resume
          </p>
        </div>

        {/* Test Mode Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Test Mode:</strong> Use test card <code className="bg-yellow-100 px-2 py-1 rounded">4111 1111 1111 1111</code> with any future date and CVV.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {/* Step 1 */}
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {otpVerified ? <CheckCircle className="w-5 h-5" /> : "1"}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Verify Email
              </span>
            </div>

            <div className="w-16 h-1 bg-gray-300"></div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {processingPayment ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  "2"
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Payment
              </span>
            </div>

            <div className="w-16 h-1 bg-gray-300"></div>

            {/* Step 3 */}
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Build Resume
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: OTP Verification */}
          {currentStep === 1 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verify Your Email
                </h2>
                <p className="text-gray-600">
                  We'll send a 6-digit OTP to your registered email
                </p>
              </div>

              {!otpSent ? (
                <div className="text-center">
                  <button
                    onClick={handleRequestOTP}
                    disabled={requestingOTP}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                  >
                    {requestingOTP ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleVerifyOTP}
                      disabled={verifyingOTP || otp.length !== 6}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingOTP ? (
                        <span className="flex items-center justify-center">
                          <Loader className="w-5 h-5 animate-spin mr-2" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify OTP"
                      )}
                    </button>

                    <button
                      onClick={handleRequestOTP}
                      disabled={requestingOTP}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                      {requestingOTP ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        "Resend"
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 text-center mt-4">
                    OTP expires in 10 minutes
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Complete Payment
                </h2>
                <p className="text-gray-600">
                  Secure payment powered by Razorpay
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Resume Creation</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ₹50
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Shield className="w-4 h-4 mr-2" />
                      Secure payment with Razorpay
                    </div>
                  </div>
                </div>

                {processingPayment && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">
                          Please do not close or refresh this window.
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Doing so may lead to payment failure. Wait for the transaction to complete.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={initiatePayment}
                  disabled={processingPayment}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    "Pay ₹50 & Continue"
                  )}
                </button>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">
                      One-time payment per resume
                    </span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">
                      Professional templates included
                    </span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">
                      Download as PDF anytime
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Need help?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
