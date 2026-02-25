import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import axios from "axios";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import {
  UserPlus,
  UserMinus,
  Users,
  Search,
  Check,
  X,
  Loader,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  photo?: string;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: any;
  sender?: User;
  recipient?: User;
}

export default function Friends() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">("friends");
  const [friends, setFriends] = useState<User[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchFriends(),
          fetchRequests(),
          fetchAllUsers()
        ]);
      } catch (error) {
        console.error("Error loading friends data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const fetchFriends = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching friends for user: ${user.uid} (Attempt ${attempt}/${retries})`);
        const response = await axios.get(
          getApiEndpoint(`/friends/friends/${user.uid}`)
        );
        setFriends(response.data.friends || []);
        setFriendCount(response.data.count || 0);
        return; // Success - exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Error fetching friends (Attempt ${attempt}/${retries}):`, error.message);
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed - set empty defaults
    console.error("Failed to fetch friends after all retries:", lastError);
    setFriends([]);
    setFriendCount(0);
  };

  const fetchRequests = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching friend requests for user: ${user.uid} (Attempt ${attempt}/${retries})`);
        const endpoint = getApiEndpoint(`/friends/requests/received/${user.uid}`);
        console.log(`Endpoint URL: ${endpoint}`);
        
        const [received, sent] = await Promise.all([
          axios.get(endpoint),
          axios.get(getApiEndpoint(`/friends/requests/sent/${user.uid}`)),
        ]);

        console.log("Received requests:", received.data);
        console.log("Sent requests:", sent.data);
        
        setReceivedRequests(received.data.requests || []);
        setSentRequests(sent.data.requests || []);
        return; // Success - exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Error fetching requests (Attempt ${attempt}/${retries}):`, error.message);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
        });
        
        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to fetch requests after all retries:", lastError);
    setReceivedRequests([]);
    setSentRequests([]);
  };

  const fetchAllUsers = async (retries = 3) => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching all users (Attempt ${attempt}/${retries})`);
        const response = await axios.get(
          getApiEndpoint(`/friends/all-users/${user.uid}`)
        );
        // Extra safety check: filter out current user in frontend too
        const filteredUsers = (response.data.users || []).filter(
          (u: User) => u.uid !== user.uid
        );
        setAllUsers(filteredUsers);
        return; // Success - exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Error fetching all users (Attempt ${attempt}/${retries}):`, error.message);
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    console.error("Failed to fetch all users after all retries:", lastError);
    setAllUsers([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Don't show error for empty search
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        getApiEndpoint(`/friends/search?query=${searchQuery}&userId=${user.uid}`)
      );
      // Extra safety check: filter out current user
      const filteredResults = response.data.users.filter(
        (u: User) => u.uid !== user.uid
      );
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      setActionLoading(toUserId);
      await axios.post(getApiEndpoint("/friends/send-request"), {
        fromUserId: user.uid,
        toUserId,
      });
      toast.success("Friend request sent!");
      // Immediately refresh all data to sync UI
      await Promise.all([fetchRequests(), fetchAllUsers()]);
      setSearchResults(searchResults.filter((u) => u.uid !== toUserId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await axios.post(getApiEndpoint("/friends/accept-request"), {
        requestId,
        userId: user.uid,
      });
      toast.success("Friend request accepted!");
      // Immediately refresh all data to sync UI
      await Promise.all([fetchFriends(), fetchRequests(), fetchAllUsers()]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await axios.post(getApiEndpoint("/friends/reject-request"), {
        requestId,
        userId: user.uid,
      });
      toast.success("Friend request rejected");
      // Immediately refresh all data to sync UI
      await Promise.all([fetchRequests(), fetchAllUsers()]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;

    try {
      setActionLoading(friendId);
      await axios.post(getApiEndpoint("/friends/remove-friend"), {
        userId: user.uid,
        friendId,
      });
      toast.success("Friend removed");
      // Immediately refresh all data to sync UI
      await Promise.all([fetchFriends(), fetchAllUsers()]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('back')}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {t('friends')}
              </h1>
              <p className="text-gray-600">
                {t('you_have')}{friendCount}{friendCount !== 1 ? t('friend_plural') : t('friend_single')}
                {friendCount === 0 && t('start_connecting')}
                {friendCount === 1 && t('post_once')}
                {friendCount === 2 && t('post_twice')}
                {friendCount >= 3 && friendCount < 10 && ` ${t('post_times').replace('times', friendCount.toString())}`}
                {friendCount >= 10 && t('unlimited_posts')}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("friends")}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === "friends"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t('friends')} ({friendCount})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 px-4 font-semibold transition-colors relative ${
              activeTab === "requests"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t('requests')}
            {receivedRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {receivedRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === "search"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t('find_friends')}
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === "friends" && (
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-4">
                    {t('no_friends_yet')}
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {t('find_friends')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.uid}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={friend.photo || "/default-avatar.png"}
                          alt={friend.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {friend.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {friend.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.uid)}
                        disabled={actionLoading === friend.uid}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === friend.uid ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="w-4 h-4" />
                            {t('remove_friend')}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Received Requests */}
              <div>
                <h3 className="font-semibold text-lg mb-4">
                  {t('received_requests')} ({receivedRequests.length})
                </h3>
                {receivedRequests.length === 0 ? (
                  <p className="text-gray-600 py-4">{t('no_pending_requests')}</p>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={request.sender?.photo || "/default-avatar.png"}
                            alt={request.sender?.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h4 className="font-semibold">{request.sender?.name}</h4>
                            <p className="text-sm text-gray-600">
                              {request.sender?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {actionLoading === request.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                {t('accept')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="font-semibold text-lg mb-4">
                  {t('sent_requests')} ({sentRequests.length})
                </h3>
                {sentRequests.length === 0 ? (
                  <p className="text-gray-600 py-4">{t('no_pending_requests')}</p>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={request.recipient?.photo || "/default-avatar.png"}
                            alt={request.recipient?.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h4 className="font-semibold">{request.recipient?.name}</h4>
                            <p className="text-sm text-gray-600">
                              {request.recipient?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{t('pending')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "search" && (
            <div>
              {/* Search Bar */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={t('search_friends_placeholder')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : t('search')}
                </button>
              </div>

              {/* All Users / Search Results */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (searchResults.length > 0 || allUsers.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(searchResults.length > 0 ? searchResults : allUsers).map((result) => {
                    // Check if user is already a friend
                    const isFriend = friends.some((f) => f.uid === result.uid);
                    
                    // Check if request has been sent by current user
                    const sentRequest = sentRequests.find((r) => r.toUserId === result.uid);
                    
                    // Check if request has been received from this user
                    const receivedRequest = receivedRequests.find((r) => r.fromUserId === result.uid);
                    
                    return (
                      <div
                        key={result.uid}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={result.photo || "/default-avatar.png"}
                            alt={result.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {result.name}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {result.email}
                            </p>
                          </div>
                        </div>
                        
                        {isFriend ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            {t('accepted')}
                          </button>
                        ) : sentRequest ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg flex items-center justify-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            {t('requested')}
                          </button>
                        ) : receivedRequest ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(receivedRequest.id)}
                              disabled={actionLoading === receivedRequest.id}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {actionLoading === receivedRequest.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('accept')}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(receivedRequest.id)}
                              disabled={actionLoading === receivedRequest.id}
                              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(result.uid)}
                            disabled={actionLoading === result.uid}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {actionLoading === result.uid ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                {t('add_friend')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery && !loading ? (
                <p className="text-center text-gray-600 py-8">
                  {t('no_users_found')}
                </p>
              ) : allUsers.length === 0 && !loading ? (
                <p className="text-center text-gray-600 py-8">
                  {t('no_users_available')}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
