import axios from "axios";
import {
  ArrowUpRight,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Pin,
  PlayCircle,
  Pointer,
  X,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getApiEndpoint } from "@/utils/api";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
// const internshipData = [
//   {
//     _id: "1",
//     title: "Frontend Developer Intern",
//     company: "TechCorp",
//     StartDate: "April 2025",
//     Duration: "3 Months",
//     stipend: "$500/month",
//     category: "Web Development",
//     location: "New York",
//   },
//   {
//     _id: "2",
//     title: "Data Science Intern",
//     company: "DataTech",
//     StartDate: "May 2025",
//     Duration: "6 Months",
//     stipend: "$800/month",
//     category: "Data Science",
//     location: "San Francisco",
//   },
//   {
//     _id: "3",
//     title: "Marketing Intern",
//     company: "MarketPro",
//     StartDate: "June 2025",
//     Duration: "4 Months",
//     stipend: "$400/month",
//     category: "Marketing",
//     location: "Los Angeles",
//   },
// ];

const index = () => {
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage);
  const { t } = useTranslation(language);
  const [filteredInternships, setfilteredInternships] = useState<any>([]);
  const [isFiltervisible, setisFiltervisible] = useState(false);
  const [filter, setfilters] = useState({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    stipend: 50,
  });
  const [internshipData, setinternship] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  // Fetch internships with retry logic
  const fetchInternshipsWithRetry = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching internships (Attempt ${attempt}/${retries})`);
        const endpoint = getApiEndpoint("/internship");
        console.log("Internships endpoint:", endpoint);
        
        const res = await axios.get(endpoint, { timeout: 5000 });
        
        console.log("✅ Internships fetched successfully:", res.data);
        setinternship(res.data || []);
        setfilteredInternships(res.data || []);
        setError(null);
        return; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Error fetching internships (Attempt ${attempt}/${retries}):`, error.message);
        console.error("Error details:", {
          code: error.code,
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to fetch internships after all retries:", lastError);
    setinternship([]);
    setfilteredInternships([]);
    
    // Set user-friendly error message
    if (lastError.code === 'ECONNABORTED' || lastError.message === 'Network Error') {
      setError("Unable to connect to the server. Please check if the backend is running on http://localhost:5001");
    } else if (lastError.response?.status === 404) {
      setError("Internships endpoint not found. Please check the backend API.");
    } else {
      setError(`Failed to load internships: ${lastError.message || 'Unknown error'}`);
    }
  };
  useEffect(() => {
    const loadInternships = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchInternshipsWithRetry();
        if (user?.uid) {
          const appRes = await axios.get(getApiEndpoint("/application"));
          const uApps = appRes.data.filter((app: any) => 
            app.user?.uid === user.uid || app.user?.name === user.name || app.user?.email === user.email
          );
          setAppliedIds(uApps.map((app: any) => app.Application));
        }
      } catch (err) {
        console.error("Error in useEffect:", err);
        setError("An unexpected error occurred while loading internships");
      } finally {
        setLoading(false);
      }
    };
    
    loadInternships();
  }, [user]);

  useEffect(() => {
    const filtered = internshipData.filter((internship:any) => {
      // Don't show internships posted by the current user
      if (user && internship.postedBy && internship.postedBy.uid === user.uid) {
        return false;
      }
      const matchesCategory = (internship.category || "")
        .toLowerCase()
        .includes(filter.category.toLowerCase());
      const matchesLocation = (internship.location || "")
        .toLowerCase()
        .includes(filter.location.toLowerCase());
      return matchesCategory && matchesLocation;
    });
    setfilteredInternships(filtered);
  }, [filter, internshipData, user]);
  const handlefilterchange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setfilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const clearFilters = () => {
    setfilters({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      stipend: 50,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filter  */}
          <div className="hidden md:block w-64 bg-white rounded-lg shadow-sm p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-black">{t('filters')}</span>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t('clear_all')}
              </button>
            </div>
            <div className="space-y-6">
              {/* Profile/Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('category')}
                </label>
                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handlefilterchange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t('category_placeholder')}
                />
              </div>
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('location')}
                </label>
                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handlefilterchange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t('location_placeholder')}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handlefilterchange}
                    className="h-4 w-4 text-blue-600 rounded "
                  />
                  <span className="text-gray-700">{t('work_from_home')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handlefilterchange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-700">{t('part_time')}</span>
                </label>
              </div>

              {/* Stipend Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('monthly_stipend')}
                </label>
                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="100"
                  value={filter.stipend}
                  onChange={handlefilterchange}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0</span>
                  <span>₹50K</span>
                  <span>₹100K</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="md:hidden mb-4">
              <button
                onClick={() => setisFiltervisible(!isFiltervisible)}
                className="w-full flex items-center justify-center space-x-2 bg-white p-3 rounded-lg shadow-sm text-black"
              >
                <Filter className="h-5 w-5" />
                <span> {t('show_filters')}</span>
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <p className="text-center font-medium text-black">
                {t('internships_found').replace('{count}', filteredInternships.length.toString())}
              </p>
            </div>
            {loading ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <div className="flex justify-center mb-4">
                  <div className="animate-spin h-8 w-8 text-blue-600">
                    <PlayCircle className="h-8 w-8" />
                  </div>
                </div>
                <p className="text-gray-600">{t('loading_internships')}</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                <div className="mb-4 text-4xl">⚠️</div>
                <p className="text-red-800 font-semibold mb-2">{t('error_loading_internships')}</p>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchInternshipsWithRetry();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {t('try_again')}
                </button>
              </div>
            ) : filteredInternships.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <p className="text-gray-600">{t('no_internships_found')}</p>
              </div>
            ) : null}
            {!loading && !error && filteredInternships.length > 0 && (
            <div className="space-y-4">
              {filteredInternships.map((internship: any) => (
                <div
                  key={internship._id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-2 text-blue-600 mb-4">
                    <ArrowUpRight className="h-5 w-5" />
                    <span className="font-medium">{t('actively_hiring')}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {internship.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{internship.company}</p>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <PlayCircle className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{t('start_date')}</p>
                        <p className="text-sm">{internship.startDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Pin className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{t('location')}</p>
                        <p className="text-sm">{internship.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <DollarSign className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{t('stipend')}</p>
                        <p className="text-sm">{internship.stipend}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {t('internship_tag')}
                      </span>
                      <div className="flex items-center space-x-1 text-green-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{t('posted_recently')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {appliedIds.includes(internship._id) ? (
                        <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                          <CheckCircle2 size={16} /> {t('applied')}
                        </span>
                      ) : null}
                      <Link
                        href={`/detailiternship/${internship._id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {t('view_details')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Filters Modal */}
      {isFiltervisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white h-full w-full max-w-sm ml-auto p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">{t('filters')}</h2>
              <button
                onClick={() => setisFiltervisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              {/* Profile/Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('category')}
                </label>
                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handlefilterchange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t('category_placeholder')}
                />
              </div>
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('location')}
                </label>
                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handlefilterchange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t('location_placeholder')}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handlefilterchange}
                    className="h-4 w-4 text-blue-600 rounded "
                  />
                  <span className="text-gray-700">{t('work_from_home')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handlefilterchange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-700">{t('part_time')}</span>
                </label>
              </div>

              {/* Stipend Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('monthly_stipend')}
                </label>
                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="100"
                  value={filter.stipend}
                  onChange={handlefilterchange}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0</span>
                  <span>₹50K</span>
                  <span>₹100K</span>
                </div>
              </div>
            </div>
           
          </div>
        </div>
      )}
    </div>
  );
};

export default index;
