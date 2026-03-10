import axios from "axios";
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Upload,
  Loader,
  Send,
  X as CloseIcon,
  UserPlus,
  AlertCircle,
  Check,
  Users,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";

export default function PublicSpace() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postingLimitInfo, setPostingLimitInfo] = useState<any>(null);
  const [canPost, setCanPost] = useState(true);
  const [offset, setOffset] = useState(0);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [showLikes, setShowLikes] = useState<{ [key: string]: boolean }>({});
  const [shareMessage, setShareMessage] = useState<{ [key: string]: string }>({});
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>("");
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});
  const [showSharedPosts, setShowSharedPosts] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<{ [key: string]: string[] }>({});

  // Helper function to safely format dates
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Just now";
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      } 
      // Handle ISO string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle timestamp number
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      else {
        return "Just now";
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Just now";
      }

      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Just now";
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const loadInitialData = async () => {
        setInitialLoading(true);
        try {
          // Add a timeout to prevent indefinite loading
          const timeoutPromise = new Promise((resolve) => 
            setTimeout(() => resolve(null), 15000)
          );
          
          const loadDataPromise = Promise.all([
            fetchFeed(),
            checkPostingLimit(),
            fetchFriendCount()
          ]);
          
          await Promise.race([
            loadDataPromise,
            timeoutPromise
          ]);
        } catch (error) {
          console.error("Error loading initial data:", error);
        } finally {
          setInitialLoading(false);
        }
      };
      loadInitialData();
    } else {
      setInitialLoading(false);
    }
  }, [user?.uid]);
  
  // Handle scrolling to a specific post if a hash is present in the URL
  useEffect(() => {
    if (!initialLoading && posts.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#post-')) {
        const postId = hash.replace('#', '');
        // Small delay to ensure DOM is fully rendered
        const timer = setTimeout(() => {
          const element = document.getElementById(postId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight effect
            element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2');
            }, 3000);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialLoading, posts.length]);

  const fetchFriendCount = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching friend count (Attempt ${attempt}/${retries})`);
        const response = await axios.get(
          getApiEndpoint(`/friends/friends-count/${user.uid}`),
          { timeout: 5000 }
        );
        setFriendCount(response.data.count || 0);
        return; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`Error fetching friend count (Attempt ${attempt}/${retries}):`, error.message);
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to fetch friend count after all retries:", lastError);
    setFriendCount(0);
  };

  const fetchFeed = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        setLoading(true);
        if (!user?.uid) {
          console.error("User UID not available");
          return;
        }
        
        console.log(`Fetching feed (Attempt ${attempt}/${retries})`);
        const endpoint = getApiEndpoint(
          `/posts/feed?userId=${user.uid}&limit=10&offset=${offset}`
        );
        console.log("Feed endpoint:", endpoint);
        
        const response = await axios.get(endpoint, { timeout: 5000 });
        setPosts(response.data.posts || []);
        return; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`Failed to fetch feed (Attempt ${attempt}/${retries}):`, error.message);
        console.error("Error details:", {
          code: error.code,
          status: error.response?.status,
          message: error.message,
        });
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to fetch feed after all retries:", lastError);
    setPosts([]);
  };

  const checkPostingLimit = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!user?.uid) {
          setCanPost(false);
          setPostingLimitInfo({
            canPost: false,
            friendCount: 0,
            todaysPostCount: 0,
            limit: 0,
            reason: "Please log in to post"
          });
          return;
        }
        
        console.log(`Checking posting limit (Attempt ${attempt}/${retries})`);
        const response = await axios.post(
          getApiEndpoint("/posts/check-limit"),
          { userId: user.uid },
          { timeout: 5000 }
        );
        
        console.log("Posting limit response:", response.data);
        setPostingLimitInfo(response.data);
        setCanPost(response.data.canPost || false);
        return; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`Failed to check posting limit (Attempt ${attempt}/${retries}):`, error.message);
        console.error("Error details:", error.response?.data);
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to check posting limit after all retries:", lastError);
    setCanPost(false);
    setPostingLimitInfo({
      canPost: false,
      friendCount: 0,
      todaysPostCount: 0,
      limit: 0,
      reason: "Error checking posting limit"
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate file sizes (max 10MB each)
    for (let i = 0; i < fileArray.length; i++) {
      if (fileArray[i].size > 10 * 1024 * 1024) {
        toast.error(`File ${i + 1} is too large (max 10MB)`);
        e.target.value = '';
        return;
      }
    }

    // Store the actual files
    setSelectedFiles([...selectedFiles, ...fileArray]);

    // Create preview URLs
    const newPreviewUrls = fileArray.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);

    toast.success(`${fileArray.length} file(s) selected`);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!user?.uid) {
      toast.error("Please log in to create a post");
      return;
    }

    if (!postText.trim() && selectedFiles.length === 0) {
      toast.error("Please add some content to your post");
      return;
    }

    if (!canPost) {
      toast.error("You have reached your posting limit for today");
      return;
    }

    try {
      setUploadingMedia(true);
      setUploadProgress(0);
      setCurrentUploadingFile("");

      let uploadedUrls: string[] = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        console.log(`Starting upload of ${selectedFiles.length} files to Cloudinary...`);
        toast.info(`Uploading ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...`);
        
        try {
          // Create FormData for multipart upload
          const formData = new FormData();
          formData.append('userId', user.uid);
          
          selectedFiles.forEach((file) => {
            formData.append('files', file);
          });

          setCurrentUploadingFile("Uploading to Cloudinary...");

          // Upload to backend API (which will upload to Cloudinary)
          const uploadResponse = await axios.post(
            getApiEndpoint("/upload/media"),
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                  const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  setUploadProgress(progress);
                }
              },
            }
          );

          if (uploadResponse.data.success) {
            uploadedUrls = uploadResponse.data.files.map((file: any) => file.url);
            console.log(`${uploadedUrls.length} files uploaded successfully to Cloudinary`);
            toast.success("Media uploaded successfully!");
          } else {
            throw new Error("Upload failed");
          }
        } catch (uploadError: any) {
          console.error("Failed to upload files:", uploadError);
          toast.error(uploadError.response?.data?.message || "Failed to upload files");
          setUploadingMedia(false);
          setUploadProgress(0);
          setCurrentUploadingFile("");
          return; // Exit early on upload error
        }
      }

      // Create post with uploaded URLs
      setCurrentUploadingFile("Creating post...");
      setUploadProgress(100);
      console.log('Creating post with:', { userId: user.uid, caption: postText, mediaUrls: uploadedUrls });
      
      const response = await axios.post(getApiEndpoint("/posts"), {
        userId: user.uid,
        caption: postText,
        mediaUrls: uploadedUrls,
      });

      console.log('Post created successfully:', response.data);
      
      setPosts([response.data, ...posts]);
      
      // Clean up
      setPostText("");
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setUploadProgress(0);
      setCurrentUploadingFile("");
      
      toast.success("Post created successfully!");
      checkPostingLimit();
    } catch (error: any) {
      console.error("Failed to create post:", error);
      toast.error(error.response?.data?.reason || "Failed to create post");
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      setCurrentUploadingFile("");
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!user?.uid) {
      toast.error("Please log in to like posts");
      return;
    }

    setLoadingActions(prev => ({ ...prev, [`like-${postId}`]: true }));
    try {
      await axios.post(getApiEndpoint(`/posts/${postId}/like`), {
        userId: user.uid,
      });

      setPosts(
        posts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              likes: isLiked
                ? post.likes.filter((l: any) => l.userId !== user.uid)
                : [
                    ...post.likes,
                    { userId: user.uid, createdAt: new Date() },
                  ],
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error("Failed to like post:", error);
      toast.error("Failed to like post");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`like-${postId}`]: false }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user?.uid) {
      toast.error("Please log in to delete posts");
      return;
    }

    setLoadingActions(prev => ({ ...prev, [`delete-${postId}`]: true }));
    try {
      await axios.delete(getApiEndpoint(`/posts/${postId}`), {
        data: { userId: user.uid },
      });

      setPosts(posts.filter((post) => post._id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error("Failed to delete post");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete-${postId}`]: false }));
    }
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) {
      toast.error("Comment cannot be empty");
      return;
    }

    setLoadingActions(prev => ({ ...prev, [`comment-${postId}`]: true }));
    try {
      const response = await axios.post(
        getApiEndpoint(`/posts/${postId}/comment`),
        {
          userId: user.uid,
          text,
        }
      );

      // Update the post with new comment
      setPosts(
        posts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), response.data.comment],
            };
          }
          return post;
        })
      );

      // Clear comment input
      setCommentText({ ...commentText, [postId]: "" });
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`comment-${postId}`]: false }));
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments({
      ...showComments,
      [postId]: !showComments[postId],
    });
  };

  const toggleLikes = (postId: string) => {
    setShowLikes({
      ...showLikes,
      [postId]: !showLikes[postId],
    });
  };

  const fetchFriendsList = async (postId: string) => {
    if (friendsList.length > 0) return;
    
    setLoadingFriends(true);
    try {
      const response = await axios.get(
        getApiEndpoint(`/friends/list?userId=${user.uid}`)
      );
      
      if (response.data && response.data.friends) {
        setFriendsList(response.data.friends);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      toast.error("Failed to load friends list");
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriendSelection = (postId: string, friendId: string) => {
    setSelectedFriends(prev => {
      const current = prev[postId] || [];
      const updated = current.includes(friendId)
        ? current.filter(id => id !== friendId)
        : [...current, friendId];
      return { ...prev, [postId]: updated };
    });
  };

  const handleShareWithMessage = async (postId: string) => {
    const message = shareMessage[postId]?.trim() || "";
    const friendIds = selectedFriends[postId] || [];
    
    setLoadingActions(prev => ({ ...prev, [`share-${postId}`]: true }));
    try {
      // Share to all selected friends
      if (friendIds.length > 0) {
        const post = posts.find(p => p._id === postId);
        const postLink = `${window.location.origin}/publicspace#post-${postId}`;
        const finalMessage = message ? `${message}\n\nCheck out this post: ${postLink}` : `Check out this post: ${postLink}`;
        
        await axios.post(getApiEndpoint(`/messages/send-content`), {
          sharedBy: {
            userId: user.uid,
            name: user.name,
            email: user.email,
          },
          sharedWithIds: friendIds,
          content: {
            postId,
            caption: post.caption || "",
            mediaUrls: post.mediaUrls || [],
            originalPoster: {
              userId: post.userId,
              name: userProfiles[post.userId]?.name || "Public Space User",
            },
          },
          sharedMessage: finalMessage,
        });
        toast.success(`Post link shared with ${friendIds.length} friend${friendIds.length !== 1 ? 's' : ''}!`);
      }

      // Also record the share on the post itself
      await axios.post(getApiEndpoint(`/posts/${postId}/share`), {
        userId: user.uid,
        message: message,
      });

      setPosts(
        posts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              shares: [
                ...(post.shares || []),
                { userId: user.uid, message: message, sharedAt: new Date() },
              ],
            };
          }
          return post;
        })
      );

      setShowShareModal(null);
      setShareMessage({ ...shareMessage, [postId]: "" });
      setSelectedFriends({ ...selectedFriends, [postId]: [] });
    } catch (error) {
      console.error("Failed to share:", error);
      toast.error("Failed to share post");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`share-${postId}`]: false }));
    }
  };

  // Fetch user profiles for displaying names and photos
  // Cache for fetched profiles to avoid duplicate requests
  const profileFetchRequests = useRef<{ [key: string]: Promise<any> | undefined }>({});

  const fetchUserProfile = async (userId: string) => {
    // Return cached profile if available
    if (userProfiles[userId]) {
      return userProfiles[userId];
    }
    
    // Return ongoing request if already being fetched
    if (profileFetchRequests.current[userId]) {
      return profileFetchRequests.current[userId];
    }
    
    // Create new fetch request
    const fetchPromise = (async () => {
      try {
        console.log(`Fetching profile for user: ${userId}`);
        const response = await axios.get(
          getApiEndpoint(`/auth/user/${userId}`)
        );
        console.log(`Received profile for ${userId}:`, response.data);
        
        // Store the profile in state
        setUserProfiles(prev => {
          const updated = { ...prev, [userId]: response.data };
          console.log(`Updated userProfiles state for ${userId}:`, updated[userId]);
          return updated;
        });
        
        return response.data;
      } catch (error: any) {
        console.error(`Failed to fetch user profile for ${userId}:`, error.message);
        // Return a default but don't cache it to allow retries
        return { name: "Unknown User", photo: null };
      } finally {
        // Clean up the request cache
        profileFetchRequests.current[userId] = undefined;
      }
    })();
    
    profileFetchRequests.current[userId] = fetchPromise;
    return fetchPromise;
  };

  // Load user profiles for all posts
  useEffect(() => {
    if (posts.length > 0) {
      const uniqueUserIds = [...new Set(posts.map(post => post.userId))];
      // Load all user profiles in parallel
      Promise.all(uniqueUserIds.map(userId => fetchUserProfile(userId))).catch(err => 
        console.error("Error loading user profiles:", err)
      );
    }
  }, [posts]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Show login message if not authenticated */}
        {!user?.uid ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Public Space
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Please log in to access the Public Space and connect with other
              students!
            </p>
            <button 
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Home
            </button>
          </div>
        ) : initialLoading ? (
          <div className="bg-white rounded-lg shadow-md p-16 text-center">
            <Loader size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600 text-lg">{t('loading_space')}</p>
          </div>
        ) : (
          <>
        {/* Friend Count Banner */}
        {friendCount !== null && (
        <div className={`mb-6 rounded-lg p-4 ${
          friendCount === 0 ? 'bg-red-50 border-2 border-red-200' :
          friendCount < 10 ? 'bg-blue-50 border-2 border-blue-200' :
          'bg-green-50 border-2 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {friendCount === 0 ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <UserPlus className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {friendCount === 0 && t('no_friends_cant_post')}
                  {friendCount === 1 && t('one_friend_one_post')}
                  {friendCount === 2 && t('two_friends_two_posts')}
                  {friendCount >= 3 && friendCount < 10 && t('friends_3_to_9').replace('{count}', friendCount.toString()).replace('{count}', friendCount.toString())}
                  {friendCount >= 10 && t('friends_10_plus')}
                </p>
                <p className="text-sm text-gray-600">
                  {friendCount === 0 ? t('add_friends_to_post') : `${t('you_have')}${friendCount}${friendCount !== 1 ? t('friend_plural') : t('friend_single')}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/friends")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              {friendCount === 0 ? t('find_friends') : t('manage_friends')}
            </button>
          </div>
        </div>
        )}

        {/* Posting Limit Warning */}
        {postingLimitInfo && !canPost && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-medium">
              ⚠️ {postingLimitInfo.reason}
            </p>
            <p className="text-yellow-600 text-sm mt-1">
              {t('friend_count')} {postingLimitInfo.friendCount} | {t('posts_today')}
              {postingLimitInfo.todaysPostCount} |
              {postingLimitInfo.limit === -1
                ? t('unlimited_posts')
                : `${t('daily_limit')} ${postingLimitInfo.limit}`}
            </p>
          </div>
        )}

        {/* Create Post Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('share_with_community')}</h2>

          <div className="flex items-start gap-4">
            {user.photo ? (
              <img 
                src={user.photo} 
                alt={user.name || "User"} 
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            <div className="flex-1">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={`${t('whats_on_your_mind')}, ${user.name?.split(' ')[0] || 'User'}?`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
                rows={4}
              />

              {/* Media Preview */}
              {previewUrls.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{t('selected_media')}</h3>
                    <span className="text-xs text-gray-500">({previewUrls.length} file{previewUrls.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        {selectedFiles[idx]?.type?.startsWith('video/') ? (
                          <video
                            src={url}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all"
                            controls
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Media ${idx}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all"
                          />
                        )}
                        <button
                          onClick={() => removeMedia(idx)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
                          title="Remove image"
                        >
                          <Trash2 size={14} />
                        </button>
                        {/* File name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent text-white text-xs p-2 rounded-b-lg">
                          <p className="truncate font-medium">{selectedFiles[idx]?.name}</p>
                          <p className="text-gray-300 text-[10px]">
                            {(selectedFiles[idx]?.size / 1024 / 1024 < 1)
                              ? `${Math.round(selectedFiles[idx]?.size / 1024)} KB`
                              : `${(selectedFiles[idx]?.size / 1024 / 1024).toFixed(2)} MB`
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-col gap-3">
                {uploadingMedia && (
                  <div className="w-full bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Loader size={16} className="animate-spin text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">
                          {currentUploadingFile || "Processing..."}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-900">{uploadProgress}%</span>
                    </div>
                    <div className="bg-blue-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 items-center">
                  <label className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-all ${uploadingMedia ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload size={18} className={uploadingMedia ? 'text-gray-400' : 'text-blue-600'} />
                    <span className="text-sm font-medium text-blue-700">
                      {previewUrls.length > 0 ? `${previewUrls.length} file${previewUrls.length > 1 ? 's' : ''} selected` : t('add_media')}
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleMediaUpload}
                      className="hidden"
                      accept="image/*,video/*"
                      disabled={uploadingMedia}
                    />
                  </label>

                  {previewUrls.length > 0 && !uploadingMedia && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-xs font-semibold text-blue-700">
                        {t('total_size')}
                      </span>
                      <span className="text-xs font-bold text-blue-900">
                        {selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024) < 1 
                          ? `${Math.round(selectedFiles.reduce((acc, file) => acc + file.size, 0) / 1024)} KB`
                          : `${(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB`
                        }
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleCreatePost}
                    disabled={(!postText.trim() && selectedFiles.length === 0) || !canPost || uploadingMedia}
                    className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    title={!canPost ? "You've reached your posting limit" : uploadingMedia ? "Uploading media..." : ""}
                  >
                    {uploadingMedia ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        <span>{t('uploading')}</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>{t('post_button')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading && posts.length === 0 ? (
            <div className="text-center py-8">
              <Loader size={32} className="animate-spin mx-auto text-blue-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg">
                {t('no_posts_yet')}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = post.likes?.some(
                (like: any) => like.userId === user?.uid
              );
              const postUser = userProfiles[post.userId] || { name: "Loading...", photo: null };
              
              return (
                <div
                  key={post._id}
                  id={`post-${post._id}`}
                  className="bg-white rounded-lg shadow-md p-6 transition-all duration-500"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {postUser.photo ? (
                        <img 
                          src={postUser.photo} 
                          alt={postUser.name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {postUser.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{postUser.name || "Unknown User"}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {post.userId === user?.uid && (
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        disabled={loadingActions[`delete-${post._id}`]}
                        className={`transition ${
                          loadingActions[`delete-${post._id}`]
                            ? "text-gray-400 opacity-60 cursor-not-allowed"
                            : "text-red-500 hover:text-red-700 active:scale-110"
                        }`}
                        title="Delete post"
                      >
                        {loadingActions[`delete-${post._id}`] ? (
                          <Loader size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="mb-4 text-gray-800 whitespace-pre-wrap">{post.caption}</p>

                  {/* Media */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className={`gap-2 mb-4 ${post.mediaUrls.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2'}`}>
                      {post.mediaUrls.map((url: string, idx: number) => {
                        const isVideo = url.match(/\\.(mp4|webm|ogg)$/i) || url.includes('/video/upload/');
                        return isVideo ? (
                          <video
                            key={idx}
                            src={url}
                            className="w-full h-64 object-cover rounded-lg bg-black"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <img
                            key={idx}
                            src={url}
                            alt={`Post media ${idx}`}
                            className="w-full h-64 object-cover rounded-lg"
                            loading="lazy"
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Post Stats - Clickable */}
                  <div className="flex gap-4 text-sm mb-4 border-t border-b py-2">
                    <button 
                      onClick={() => toggleLikes(post._id)}
                      className="text-gray-700 hover:text-blue-600 font-medium transition"
                    >
                      {post.likes?.length || 0} {post.likes?.length === 1 ? 'like' : 'likes'}
                    </button>
                    <button 
                      onClick={() => toggleComments(post._id)}
                      className="text-gray-700 hover:text-blue-600 font-medium transition"
                    >
                      {post.comments?.length || 0} {post.comments?.length === 1 ? 'comment' : 'comments'}
                    </button>
                    <span className="text-gray-700 font-medium">
                      {post.shares?.length || 0} {post.shares?.length === 1 ? 'share' : 'shares'}
                    </span>
                  </div>

                  {/* Show Likes List */}
                  {showLikes[post._id] && post.likes?.length > 0 && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Liked by:</h4>
                      <div className="space-y-2">
                        {post.likes.map((like: any, idx: number) => {
                          const likeUser = userProfiles[like.userId] || { name: "User", photo: null };
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              {likeUser.photo ? (
                                <img 
                                  src={likeUser.photo} 
                                  alt={likeUser.name} 
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">
                                  {likeUser.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                              )}
                              <span className="text-sm text-gray-900 font-medium">{likeUser.name || like.userId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Show Shares List */}
                  {showLikes[post._id] && post.shares?.length > 0 && (
                    <div className="mb-4 bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Shared by:</h4>
                      <div className="space-y-3">
                        {post.shares.map((share: any, idx: number) => {
                          const shareUser = userProfiles[share.userId] || { name: "User", photo: null };
                          return (
                            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-blue-200 last:border-b-0">
                              <div className="flex items-center gap-2 flex-1">
                                {shareUser.photo ? (
                                  <img 
                                    src={shareUser.photo} 
                                    alt={shareUser.name} 
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {shareUser.name?.charAt(0).toUpperCase() || "U"}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 font-medium">{shareUser.name || share.userId}</p>
                                  {share.message && (
                                    <p className="text-xs text-gray-600 mt-1 italic">{share.message}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLikePost(post._id, isLiked)}
                      disabled={loadingActions[`like-${post._id}`]}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                        loadingActions[`like-${post._id}`]
                          ? "opacity-60 cursor-not-allowed"
                          : isLiked
                          ? "text-red-500 bg-red-50 hover:bg-red-100 active:scale-95"
                          : "text-gray-700 hover:bg-gray-100 active:scale-95"
                      }`}
                    >
                      {loadingActions[`like-${post._id}`] ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Heart
                          size={18}
                          fill={isLiked ? "currentColor" : "none"}
                        />
                      )}
                      {loadingActions[`like-${post._id}`] ? "Liking..." : isLiked ? "Liked" : "Like"}
                    </button>

                    <button
                      onClick={() => toggleComments(post._id)}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium active:scale-95"
                    >
                      <MessageCircle size={18} />
                      Comment
                    </button>

                    <button
                      onClick={() => {
                        setShowShareModal(post._id);
                        fetchFriendsList(post._id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium active:scale-95"
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>

                  {/* Share Modal */}
                  {showShareModal === post._id && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-96 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-gray-900">{t('share_post')}</h3>
                          <button
                            onClick={() => setShowShareModal(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <CloseIcon size={24} />
                          </button>
                        </div>

                        {/* Friends Selection */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-900 mb-3">
                            <Users size={16} className="inline mr-2" />
                            Share with friends:
                          </label>
                          {loadingFriends ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader size={20} className="animate-spin text-blue-600" />
                            </div>
                          ) : friendsList.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
                              {friendsList.map((friend: any) => {
                                const isSelected = (selectedFriends[post._id] || []).includes(friend.userId);
                                return (
                                  <button
                                    key={friend.userId}
                                    onClick={() => toggleFriendSelection(post._id, friend.userId)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${
                                      isSelected
                                        ? "bg-blue-100 border-2 border-blue-500"
                                        : "bg-white border border-gray-300 hover:border-gray-400"
                                    }`}
                                  >
                                    {friend.photo ? (
                                      <img
                                        src={friend.photo}
                                        alt={friend.name}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {friend.name?.charAt(0).toUpperCase() || "U"}
                                      </div>
                                    )}
                                    <span className="flex-1 text-left text-gray-900 font-medium">
                                      {friend.name}
                                    </span>
                                    {isSelected && (
                                      <Check size={18} className="text-blue-600 flex-shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm bg-gray-50 rounded-lg p-3">
                              No friends yet. Make some friends to share content!
                            </p>
                          )}
                          {friendsList.length > 0 && (
                            <p className="text-xs text-gray-600 mt-2">
                              {(selectedFriends[post._id] || []).length} friend{(selectedFriends[post._id] || []).length !== 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>

                        {/* Message Input */}
                        <textarea
                          value={shareMessage[post._id] || ""}
                          onChange={(e) =>
                            setShareMessage({
                              ...shareMessage,
                              [post._id]: e.target.value,
                            })
                          }
                          placeholder={t('write_message_optional')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none text-gray-900 mb-4 text-sm"
                          rows={3}
                        />

                        <button
                          onClick={() => handleShareWithMessage(post._id)}
                          disabled={loadingActions[`share-${post._id}`] || friendsList.length === 0}
                          className={`w-full px-6 py-3 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                            loadingActions[`share-${post._id}`] || friendsList.length === 0
                              ? "bg-gray-400 opacity-60 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                          }`}
                        >
                          {loadingActions[`share-${post._id}`] ? (
                            <>
                              <Loader size={18} className="animate-spin" />
                              <span>{t('sharing')}</span>
                            </>
                          ) : (
                            t('share_now')
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments Section */}
                  {showComments[post._id] && (
                    <div className="mt-4 border-t pt-4">
                      <div className="flex gap-2 mb-4">
                        {user.photo ? (
                          <img 
                            src={user.photo} 
                            alt={user.name || "User"} 
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <input
                          type="text"
                          value={commentText[post._id] || ""}
                          onChange={(e) =>
                            setCommentText({
                              ...commentText,
                              [post._id]: e.target.value,
                            })
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(post._id);
                            }
                          }}
                          placeholder={t('add_comment_placeholder')}
                          className="w-full flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                        <button
                          onClick={() => handleComment(post._id)}
                          disabled={!commentText[post._id]?.trim() || loadingActions[`comment-${post._id}`]}
                          className={`px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
                            !commentText[post._id]?.trim() || loadingActions[`comment-${post._id}`]
                              ? "bg-gray-400 cursor-not-allowed opacity-60"
                              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                          }`}
                          title="Send comment"
                        >
                          {loadingActions[`comment-${post._id}`] ? (
                            <Loader size={18} className="animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {post.comments?.length > 0 ? (
                          post.comments.map((comment: any, idx: number) => {
                            const commentUser = userProfiles[comment.userId] || { name: "User", photo: null };
                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-2"
                              >
                                {commentUser.photo ? (
                                  <img 
                                    src={commentUser.photo} 
                                    alt={commentUser.name} 
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {commentUser.name?.charAt(0).toUpperCase() || "U"}
                                  </div>
                                )}
                                <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                                  <p className="font-semibold text-gray-900 text-sm">{commentUser.name || comment.userId}</p>
                                  <p className="text-sm text-gray-800 mt-1">
                                    {comment.text}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(comment.createdAt)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-4">{t('no_comments_yet')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
