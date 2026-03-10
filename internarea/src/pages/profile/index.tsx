import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import { ExternalLink, Mail, User, Edit2, Save, X } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
interface User {
  name: string;
  email: string;
  photo: string;
}
import { toast } from "react-toastify";
const index = () => {
  const user=useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const router = useRouter();
  const [applications, setApplications] = useState<any>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editResumeName, setEditResumeName] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    const fetchApplications = async () => {
      try {
        if (!user) return;
        const res = await axios.get(getApiEndpoint("/application"));
        // Filter applications where the user ID matches
        const userApps = res.data.filter((app: any) => app.user?.uid === user.uid);
        setApplications(userApps);
        console.log("✅ User applications fetched:", userApps);

        // Fetch user resumes
        try {
          const resumesRes = await axios.get(getApiEndpoint(`/resume/resumes/${user.uid}`));
          setResumes(resumesRes.data.resumes || []);
          // Set initial default resume ID from the user object if available
          const userRes = await axios.get(getApiEndpoint(`/users/${user.uid}`));
          // Extract user object from API response wrapper
          const userData = userRes.data.user || userRes.data;
          console.log("✅ User data for default resume:", userData);
          if (userData?.resumeId) {
            setDefaultResumeId(userData.resumeId);
            console.log("✅ Default resume ID set:", userData.resumeId);
          }
        } catch (resErr) {
          console.error("❌ Error fetching resumes:", resErr);
        }

      } catch (error) {
        console.error("❌ Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, [user]);

  const downloadResume = (resumeData: any) => {
    toast.info("Generating PDF sprint...");
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
            ${resumeData.experience.map((exp: any) => `
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
            ${resumeData.projects.map((proj: any) => `
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
            ${resumeData.education.map((edu: any) => `
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
              ${resumeData.skills.map((skill: any) => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
          ${resumeData.links && resumeData.links.length > 0 ? `
          <div class="section">
            <h2>Links</h2>
            <ul class="link-list">
              ${resumeData.links.map((link: any) => `
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
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await axios.delete(getApiEndpoint(`/resume/delete-resume/${user.uid}/${resumeId}`));
      toast.success("Resume deleted successfully");
      setResumes(resumes.filter(r => r.id !== resumeId));
      if (defaultResumeId === resumeId) {
        setDefaultResumeId(null);
      }
    } catch (error) {
      toast.error("Failed to delete resume");
      console.error(error);
    }
  };

  const handleSetDefaultResume = async (resumeId: string) => {
    try {
      await axios.post(getApiEndpoint(`/resume/set-default-resume`), {
        uid: user.uid,
        resumeId
      });
      setDefaultResumeId(resumeId);
      toast.success("Default resume updated");
    } catch (error) {
      toast.error("Failed to set default resume");
      console.error(error);
    }
  };

  const handleSaveResumeName = async (resumeId: string) => {
    try {
      if (!editResumeName.trim()) {
        toast.error("Resume name cannot be empty");
        return;
      }
      await axios.put(getApiEndpoint(`/resume/rename-resume/${user.uid}/${resumeId}`), {
        resumeName: editResumeName
      });
      toast.success("Resume renamed successfully");
      setResumes(resumes.map(r => r.id === resumeId ? { ...r, resumeName: editResumeName } : r));
      setEditingResumeId(null);
    } catch (error) {
      toast.error("Failed to rename resume");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="text-blue-600 font-semibold text-2xl">
                    {applications.filter((app: any) => app.status === "pending").length}
                  </span>
                  <p className="text-blue-600 text-sm mt-1">
                    {t('active_applications')}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">
                    {applications.filter((app: any) => app.status === "accepted").length}
                  </span>
                  <p className="text-green-600 text-sm mt-1">
                    {t('accepted_applications')}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <span className="text-purple-600 font-semibold text-2xl">
                    {applications.length}
                  </span>
                  <p className="text-purple-600 text-sm mt-1">
                    {t('total_applied')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {t('view_applications')}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Generated Resumes Section */}
            {resumes.length > 0 && (
              <div className="mt-12 border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Generated Resumes</h2>
                <div className="space-y-4">
                  {resumes.map((resume) => (
                    <div key={resume.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {editingResumeId === resume.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editResumeName}
                                onChange={(e) => setEditResumeName(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              />
                              <button onClick={() => handleSaveResumeName(resume.id)} className="text-green-600 hover:text-green-700">
                                <Save className="h-4 w-4" />
                              </button>
                              <button onClick={() => setEditingResumeId(null)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {resume.resumeName || resume.fullName || user?.name || "Resume"}
                              <button
                                onClick={() => {
                                  setEditingResumeId(resume.id);
                                  setEditResumeName(resume.resumeName || resume.fullName || user?.name || "Resume");
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {defaultResumeId === resume.id && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Default
                                </span>
                              )}
                            </h3>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Created at: {new Date(resume.createdAt?._seconds * 1000 || resume.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                        {defaultResumeId !== resume.id && (
                          <button
                            onClick={() => handleSetDefaultResume(resume.id)}
                            className="flex-1 sm:flex-none justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => downloadResume(resume)}
                          className="flex-1 sm:flex-none justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="flex-1 sm:flex-none justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
