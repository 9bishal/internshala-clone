import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart, ArrowLeft } from 'lucide-react';

export default function Analytics() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/adminlogin");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart className="w-6 h-6 text-red-600" />
            Analytics Dashboard
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Analytics Coming Soon</h2>
          <p className="text-gray-500 mt-2">
            Detailed reports and statistics will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
