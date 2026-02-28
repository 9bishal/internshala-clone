import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Loader,
  Save,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  CheckCircle,
  X,
  Link as LinkIcon,
  FolderGit2
} from "lucide-react";
import { toast } from "react-toastify";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Experience {
  id: string;
  company: string;
  position: string;
  duration: string;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  year: string;
  percentage: string;
}

interface Project {
  id: string;
  title: string;
  link: string;
  description: string;
}

interface LinkItem {
  id: string;
  label: string;
  url: string;
}

interface ResumeData {
  resumeName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  photo: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  links: LinkItem[];
}

export default function ResumeEditor() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const [resumeData, setResumeData] = useState<ResumeData>({
    resumeName: "",
    fullName: "",
    email: user?.email || "",
    phone: "",
    address: "",
    photo: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    links: [],
  });

  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        getApiEndpoint(`/resume/access/${user.uid}`)
      );

      const access = response.data;
      
      // Check if user has premium plan
      if (access.canCreateResume) {
        setHasAccess(true);
      } else {
        toast.error("Please unlock resume creation first");
        router.push("/resume/create");
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      toast.error("Failed to verify access. Redirecting...");
      setTimeout(() => router.push("/resume/create"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    setRequestingOTP(true);
    try {
      const response = await axios.post(
        getApiEndpoint("/resume/request-otp"),
        {
          uid: user.uid,
        }
      );

      toast.success(response.data.message);
      setOtpSent(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send OTP"
      );
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
        getApiEndpoint("/resume/verify-otp"),
        {
          uid: user.uid,
          otp,
        }
      );

      if (response.data.verified) {
        toast.success("OTP verified! Proceeding to payment...");
        setOtpVerified(true);
        setShowOTPModal(false);
        
        // Initiate Razorpay payment
        await initiatePayment();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "OTP verification failed"
      );
    } finally {
      setVerifyingOTP(false);
    }
  };

  const initiatePayment = async () => {
    try {
      // Create Razorpay order
      const orderResponse = await axios.post(
        getApiEndpoint("/resume/create-resume-order"),
        {
          uid: user.uid,
        }
      );

      const { orderId, amount, currency } = orderResponse.data;

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
          name: "Internshala",
          description: "Resume Creation - ₹50",
          order_id: orderId,
          handler: async (response: any) => {
            await verifyPayment(response);
          },
          prefill: {
            name: user.name || "",
            email: user.email || "",
            contact: resumeData.phone || "",
          },
          theme: {
            color: "#3B82F6",
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment cancelled");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      };
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to initiate payment"
      );
    }
  };

  const verifyPayment = async (paymentData: any) => {
    try {
      const response = await axios.post(
        getApiEndpoint("/resume/verify-resume-payment"),
        {
          uid: user.uid,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }
      );

      toast.success("Payment successful! You can now create your resume.");
      setOtpVerified(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Payment verification failed"
      );
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setPhotoUploading(true);

    try {
      // Convert to base64 data URL directly in browser (no server upload needed)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        setResumeData({ ...resumeData, photo: base64Url });
        toast.success("Photo uploaded successfully");
        setPhotoUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read photo file");
        setPhotoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Failed to upload photo");
      setPhotoUploading(false);
    }
  };

  const addExperience = () => {
    setResumeData({
      ...resumeData,
      experience: [
        ...resumeData.experience,
        {
          id: Date.now().toString(),
          company: "",
          position: "",
          duration: "",
          description: "",
        },
      ],
    });
  };

  const updateExperience = (id: string, field: string, value: string) => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.filter((exp) => exp.id !== id),
    });
  };

  const addEducation = () => {
    setResumeData({
      ...resumeData,
      education: [
        ...resumeData.education,
        {
          id: Date.now().toString(),
          institution: "",
          degree: "",
          year: "",
          percentage: "",
        },
      ],
    });
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((edu) => edu.id !== id),
    });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setResumeData({
      ...resumeData,
      skills: [...resumeData.skills, newSkill.trim()],
    });
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    setResumeData({
      ...resumeData,
      skills: resumeData.skills.filter((_, i) => i !== index),
    });
  };

  const addProject = () => {
    setResumeData({
      ...resumeData,
      projects: [
        ...resumeData.projects,
        { id: Date.now().toString(), title: "", link: "", description: "" },
      ],
    });
  };

  const updateProject = (id: string, field: string, value: string) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj
      ),
    });
  };

  const removeProject = (id: string) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.filter((proj) => proj.id !== id),
    });
  };

  const addLink = () => {
    setResumeData({
      ...resumeData,
      links: [
        ...resumeData.links,
        { id: Date.now().toString(), label: "", url: "" },
      ],
    });
  };

  const updateLink = (id: string, field: string, value: string) => {
    setResumeData({
      ...resumeData,
      links: resumeData.links.map((link) =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    });
  };

  const removeLink = (id: string) => {
    setResumeData({
      ...resumeData,
      links: resumeData.links.filter((link) => link.id !== id),
    });
  };

  const handleSaveResume = async () => {
    // Validate required fields
    if (!resumeData.resumeName || !resumeData.fullName || !resumeData.email || !resumeData.phone) {
      toast.error("Please fill in all required fields (Resume Name, Name, Email, Phone)");
      return;
    }

    if (!otpVerified) {
      setShowOTPModal(true);
      return;
    }

    setSaving(true);

    try {
      const response = await axios.post(
        getApiEndpoint("/resume/save-resume"),
        {
          uid: user.uid,
          resumeData,
        }
      );

      toast.success("Resume saved successfully!");
      setResumeId(response.data.resumeId);
      
      // Send confirmation email
      await axios.post(getApiEndpoint("/resume/send-confirmation"), {
        uid: user.uid,
        resumeId: response.data.resumeId,
      });

      // Auto trigger download
      setTimeout(() => {
        handleDownloadResume();
      }, 500);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to save resume"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadResume = async () => {
    toast.info("Generating PDF summary...");
    // Generate an HTML string holding the professional resume template
    const resumeHTML = `
      <html>
        <head>
          <title>${resumeData.resumeName || `Resume - ${resumeData.fullName}`}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #2c3e50; margin: 0 0 10px 0; font-size: 32px; letter-spacing: 1px; text-transform: uppercase; }
            h2 { color: #2980b9; font-size: 20px; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .contact-info { margin-bottom: 10px; color: #555; font-size: 14px; }
            .section { margin-bottom: 25px; }
            .item { margin-bottom: 20px; }
            .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
            .item-title { font-weight: bold; color: #2c3e50; font-size: 16px; }
            .item-subtitle { color: #7f8c8d; font-style: italic; font-size: 14px; }
            .description { margin-top: 5px; font-size: 14px; color: #444; }
            ul.link-list { list-style: none; padding: 0; margin: 0; }
            ul.link-list li { margin-bottom: 5px; font-size: 14px; }
            .skills-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .skill-tag { background: #f0f4f8; border: 1px solid #dce4ec; color: #2c3e50; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 500; }
            a { color: #2980b9; text-decoration: none; }
            img.photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${resumeData.photo ? `<img src="${resumeData.photo}" class="photo" alt="Profile Photo" />` : ''}
            <h1>${resumeData.fullName || 'Your Name'}</h1>
            <div class="contact-info">
              ${resumeData.email || ''} 
              ${resumeData.phone ? ` | ${resumeData.phone}` : ''} 
              ${resumeData.address ? ` | ${resumeData.address}` : ''}
            </div>
          </div>
          
          ${resumeData.summary ? `
          <div class="section">
            <h2>Professional Summary</h2>
            <div class="description">${resumeData.summary}</div>
          </div>
          ` : ''}

          ${resumeData.experience && resumeData.experience.length > 0 ? `
          <div class="section">
            <h2>Experience</h2>
            ${resumeData.experience.map(exp => `
              <div class="item">
                <div class="item-header">
                  <span class="item-title">${exp.position} at ${exp.company}</span>
                  <span class="item-subtitle">${exp.duration}</span>
                </div>
                <div class="description">${exp.description}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${resumeData.projects && resumeData.projects.length > 0 ? `
          <div class="section">
            <h2>Projects</h2>
            ${resumeData.projects.map(proj => `
              <div class="item">
                <div class="item-header">
                  <span class="item-title">${proj.title} ${proj.link ? `- <a href="${proj.link}">${proj.link}</a>` : ''}</span>
                </div>
                <div class="description">${proj.description}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${resumeData.education && resumeData.education.length > 0 ? `
          <div class="section">
            <h2>Education</h2>
            ${resumeData.education.map(edu => `
              <div class="item">
                <div class="item-header">
                  <span class="item-title">${edu.degree}</span>
                  <span class="item-subtitle">${edu.year}</span>
                </div>
                <div class="item-subtitle">${edu.institution} ${edu.percentage ? `| ${edu.percentage}` : ''}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${resumeData.skills && resumeData.skills.length > 0 ? `
          <div class="section">
            <h2>Skills</h2>
            <div class="skills-container">
              ${resumeData.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
          ${resumeData.links && resumeData.links.length > 0 ? `
          <div class="section">
            <h2>Links</h2>
            <ul class="link-list">
              ${resumeData.links.map(link => `
                <li><strong>${link.label}:</strong> <a href="${link.url}">${link.url}</a></li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(resumeHTML);
      printWindow.document.close();
      printWindow.focus();
      // Only print after the images/styles have loaded
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Create Your Resume
              </h1>
              <p className="text-gray-600 mt-2">
                Fill in your details to generate a professional resume
              </p>
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4 max-w-2xl">
                <p className="text-yellow-800 font-medium text-sm">
                  ⚠️ <strong>Important</strong>: Do not close or refresh this page. Once saved, this resume cannot be edited without a new payment. 
                  A PDF will automatically download when you click Save.
                </p>
              </div>
            </div>
            {resumeId && (
              <CheckCircle className="w-12 h-12 text-green-500" />
            )}
          </div>
        </div>

        {/* Resume Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {/* File Information */}
          <div className="mb-8 border-b border-gray-100 pb-8">
            <div className="flex items-center mb-6">
              <FolderGit2 className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">
                File Details
              </h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume File Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={resumeData.resumeName}
                onChange={(e) =>
                  setResumeData({ ...resumeData, resumeName: e.target.value })
                }
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Frontend Developer Resume v1"
              />
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <User className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">
                Personal Information
              </h2>
            </div>

            {/* Photo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {resumeData.photo ? (
                  <img
                    src={resumeData.photo}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={photoUploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                    {photoUploading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {photoUploading ? "Uploading..." : "Upload Photo"}
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={resumeData.fullName}
                  onChange={(e) =>
                    setResumeData({ ...resumeData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={resumeData.email}
                  onChange={(e) =>
                    setResumeData({ ...resumeData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={resumeData.phone}
                  onChange={(e) =>
                    setResumeData({ ...resumeData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={resumeData.address}
                  onChange={(e) =>
                    setResumeData({ ...resumeData, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State, Country"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Summary
              </label>
              <textarea
                value={resumeData.summary}
                onChange={(e) =>
                  setResumeData({ ...resumeData, summary: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief overview of your professional background and goals..."
              />
            </div>
          </div>

          {/* Experience Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Briefcase className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Experience</h2>
              </div>
              <button
                onClick={addExperience}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            </div>

            {resumeData.experience.map((exp, index) => (
              <div
                key={exp.id}
                className="bg-gray-50 rounded-lg p-6 mb-4 relative"
              >
                <button
                  onClick={() => removeExperience(exp.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(exp.id, "company", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) =>
                        updateExperience(exp.id, "position", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your role"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) =>
                      updateExperience(exp.id, "duration", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jan 2020 - Dec 2022"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={exp.description}
                    onChange={(e) =>
                      updateExperience(exp.id, "description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your responsibilities and achievements..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Education</h2>
              </div>
              <button
                onClick={addEducation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Education
              </button>
            </div>

            {resumeData.education.map((edu, index) => (
              <div
                key={edu.id}
                className="bg-gray-50 rounded-lg p-6 mb-4 relative"
              >
                <button
                  onClick={() => removeEducation(edu.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        updateEducation(edu.id, "institution", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="University/College name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Degree
                    </label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) =>
                        updateEducation(edu.id, "degree", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="B.Tech, MBA, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) =>
                        updateEducation(edu.id, "year", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2020 - 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentage/CGPA
                    </label>
                    <input
                      type="text"
                      value={edu.percentage}
                      onChange={(e) =>
                        updateEducation(edu.id, "percentage", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="85% or 8.5 CGPA"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skills Section */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Award className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Skills</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a skill (e.g., JavaScript, Project Management)"
              />
              <button
                onClick={addSkill}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {resumeData.skills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(index)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Links Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <LinkIcon className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Links</h2>
              </div>
              <button
                onClick={addLink}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-5 h-5 mr-1" />
                Add Link
              </button>
            </div>

            {resumeData.links.map((link) => (
              <div key={link.id} className="bg-gray-50 rounded-lg p-6 mb-4 relative group">
                <button
                  onClick={() => removeLink(link.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Label (e.g. GitHub, LinkedIn)</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(link.id, "label", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, "url", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Projects Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FolderGit2 className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
              </div>
              <button
                onClick={addProject}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-5 h-5 mr-1" />
                Add Project
              </button>
            </div>

            {resumeData.projects.map((proj) => (
              <div key={proj.id} className="bg-gray-50 rounded-lg p-6 mb-4 relative group">
                <button
                  onClick={() => removeProject(proj.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => updateProject(proj.id, "title", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Link (Optional)</label>
                    <input
                      type="url"
                      value={proj.link}
                      onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={proj.description}
                    onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  ></textarea>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          {resumeId && (
            <button
              onClick={handleDownloadResume}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          )}
          <button
            onClick={handleSaveResume}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Resume
              </>
            )}
          </button>
        </div>
      </div>

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Verify Email & Pay
            </h3>
            <p className="text-gray-600 mb-6">
              To create a resume, you need to verify your email with OTP and pay ₹50 through Razorpay.
            </p>

            {!otpSent ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  An OTP will be sent to: <strong>{user.email}</strong>
                </p>
                <button
                  onClick={handleRequestOTP}
                  disabled={requestingOTP}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest mb-4"
                  placeholder="000000"
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyOTP}
                  disabled={verifyingOTP || otp.length !== 6}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mb-3"
                >
                  {verifyingOTP ? (
                    <>
                      <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Proceed to Payment"
                  )}
                </button>
                <button
                  onClick={handleRequestOTP}
                  disabled={requestingOTP}
                  className="w-full py-2 text-blue-600 hover:text-blue-700 text-sm disabled:opacity-50 flex justify-center items-center"
                >
                  {requestingOTP ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => setShowOTPModal(false)}
              className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
