import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getApiEndpoint } from "@/utils/api";
// export const internships = [
//   {
//     _id: "1",
//     title: "Frontend Developer Intern",
//     company: "Tech Innovators",
//     location: "Remote",
//     stipend: "$500/month",
//     Duration: "3 Months",
//     StartDate: "March 15, 2025",
//     aboutCompany:
//       "Tech Innovators is a leading software development company specializing in modern web applications.",
//     aboutJob:
//       "As a Frontend Developer Intern, you will work on real-world projects using React.js and Tailwind CSS.",
//     Whocanapply:
//       "Students and fresh graduates with knowledge of HTML, CSS, JavaScript, and React.js.",
//     perks: "Certificate, Letter of Recommendation, Flexible Work Hours",
//     AdditionalInfo: "This is a remote internship with flexible working hours.",
//     numberOfopning: "2",
//   },
//   {
//     _id: "2",
//     title: "Backend Developer Intern",
//     company: "Cloud Systems",
//     location: "San Francisco",
//     stipend: "$800/month",
//     Duration: "4 Months",
//     StartDate: "April 1, 2025",
//     aboutCompany:
//       "Cloud Systems focuses on scalable backend solutions and cloud-based applications.",
//     aboutJob:
//       "As a Backend Developer Intern, you will work with Node.js, Express, and MongoDB.",
//     Whocanapply:
//       "Students with experience in backend technologies and databases.",
//     perks: "Certificate, Networking Opportunities, Paid Internship",
//     AdditionalInfo: "A strong foundation in databases is required.",
//     numberOfopning: "3",
//   },
//   {
//     _id: "3",
//     title: "UI/UX Designer Intern",
//     company: "Creative Minds",
//     location: "New York",
//     stipend: "$600/month",
//     Duration: "6 Months",
//     StartDate: "May 10, 2025",
//     aboutCompany:
//       "Creative Minds is a design agency focused on user experience and interface design.",
//     aboutJob:
//       "As a UI/UX Designer Intern, you will work with Figma, Adobe XD, and design systems.",
//     Whocanapply:
//       "Students passionate about designing intuitive user experiences.",
//     perks: "Mentorship, Hands-on Projects, Letter of Recommendation",
//     AdditionalInfo: "A portfolio is required for application.",
//     numberOfopning: "1",
//   },
// ];

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [internshipData,setinternship]=useState<any>(null)
  const [error, seterror] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const [loadingUserData, setLoadingUserData] = useState(false);
  const user=useSelector(selectuser);

  useEffect(()=>{
    const fetchdata=async()=>{
      try {
        seterror(null);
        const res=await axios.get(getApiEndpoint(`/internship/${id}`))     
        setinternship(res.data)
        console.log("✅ Internship detail fetched:", res.data);

        // Fetch user data if logged in
        if (user?.uid) {
          try {
            setLoadingUserData(true);

            const userRes = await axios.get(getApiEndpoint(`/users/${user.uid}`));

            // Extract user object from API response wrapper

            const extractedUserData = userRes.data.user || userRes.data;

            setUserData(extractedUserData);

            console.log("✅ User data fetched:", extractedUserData);

            console.log("✅ Resume ID:", extractedUserData.resumeId);
          } catch (e) {
            console.error("Error fetching user data:", e);
          } finally {
            setLoadingUserData(false);
          }
        }
      } catch (error: any) {
        console.error("❌ Error fetching internship detail:", error)
        seterror(error.response?.data?.error || "Internship not found");
      }
    }
    if(id) fetchdata()
  },[id, user])
  const [availability, setAvailability] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkIfApplied = async () => {
      if (user?.uid && id) {
        try {
          const appRes = await axios.get(getApiEndpoint("/application"));
          const appliedIds = appRes.data
            .filter((app: any) => app.user?.uid === user.uid || app.user?.name === user.name || app.user?.email === user.email)
            .map((app: any) => app.Application);
          
          if (appliedIds.includes(id as string)) {
            setHasApplied(true);
          }
        } catch (error) {
          console.error("Error checking application status:", error);
        }
      }
    };
    checkIfApplied();
  }, [user, id]);
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/internship")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Internships
          </button>
        </div>
      </div>
    );
  }

  if (!internshipData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  const handlesubmitapplication=async()=>{
    if(!coverLetter.trim()){
      toast.error("please write a cover letter")
      return
    }
    if(!availability){
      toast.error("please select your availability")
      return
    }
    try {
      setIsSubmitting(true);
      const applicationdata={
        category:internshipData.category,
        company:internshipData.company,
        coverLetter:coverLetter,
        user:user,
        Application:id,
        availability,
        resumeId: userData?.resumeId || null,
      }
      await axios.post(getApiEndpoint("/application"),applicationdata)
      toast.success("Application submit successfully")
      setHasApplied(true);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to submit application";
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />
            <span className="font-medium">Actively Hiring</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {internshipData.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{internshipData.company}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{internshipData.location}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="h-5 w-5" />
              <span>{internshipData.stipend}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <span>{internshipData.startDate}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm">
              Posted on {internshipData.createdAt}
            </span>
          </div>
        </div>
        {/* Company Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            About {internshipData.company}
          </h2>
          <div className="flex items-center space-x-2 mb-4">
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Visit company website</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-gray-600">{internshipData.aboutCompany}</p>
        </div>
        {/* Internship Details Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            About the Internship
          </h2>
          <p className="text-gray-600 mb-6">{internshipData.aboutInternship}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Who can apply
          </h3>
          <p className="text-gray-600 mb-6">{internshipData.whoCanApply}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Perks</h3>
          <p className="text-gray-600 mb-6">{internshipData.perks}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Additional Information
          </h3>
          <p className="text-gray-600 mb-6">{internshipData.additionalInfo}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Number of Openings
          </h3>
          <p className="text-gray-600">{internshipData.numberOfOpening}</p>
        </div>
        {/* Apply Button */}
        <div className="p-6 flex justify-center">
          {internshipData.postedBy && user && internshipData.postedBy.uid === user.uid ? (
            <div className="bg-gray-100 text-gray-600 px-8 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>You posted this internship</span>
            </div>
          ) : hasApplied ? (
            <div className="bg-green-100 text-green-700 px-8 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">You have already applied</span>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!user) {
                  toast.error("Please login to apply");
                  return;
                }
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-150"
            >
              Apply Now
            </button>
          )}
        </div>
      </div>
      {/* Apply Modal */}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Apply to {internshipData.company}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Resume Section */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your Resume
                </h3>
                {loadingUserData ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading resume...</span>
                  </div>
                ) : userData?.resumeId ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-white p-3 border rounded">
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">
                            {userData?.resumeName || user?.name || 'Resume'}
                          </span>
                          <span className="text-xs text-green-600 font-medium">✓ Attached automatically</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm sm:text-base">
                    <p className="mb-2">You don't have a default resume attached to your profile.</p>
                    <p className="text-sm">You can <Link href="/resume" className="text-blue-600 hover:underline font-medium">create one</Link> or proceed without it (optional).</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cover Letter
                </h3>
                <p className="text-gray-600 mb-2">
                  Why should you be selected for this internship?
                </p>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Write your cover letter here..."
                ></textarea>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your Availability
                </h3>
                <div className="space-y-3">
                  {[
                    "Yes, I am available to join immediately",
                    "No, I am currently on notice period",
                    "No, I will have to serve notice period",
                    "Other",
                  ].map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name=""
                        id=""
                        value={option}
                        checked={availability === option}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                {user ? (
                  <button 
                    disabled={isSubmitting}
                    className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-all duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`} 
                    onClick={handlesubmitapplication}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Application</span>
                    )}
                  </button>
                ) : (
                  <Link
                    href={`/`}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Sign up to apply
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default index;
