import axios from "axios";
import {
  Heart,
  MessageCircle,
  Trash2,
  Loader,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import Link from "next/link";

export default function MessageInbox() {
  const router = useRouter();
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Helper function to safely format dates
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Just now";

    try {
      let date: Date;

      if (dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === "number") {
        date = new Date(dateValue);
      } else {
        return "Just now";
      }

      if (isNaN(date.getTime())) {
        return "Just now";
      }

      return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Just now";
    }
  };

  const fetchInbox = async (newOffset = 0) => {
    try {
      const response = await axios.get(getApiEndpoint("/messages/inbox"), {
        params: {
          userId: user.uid,
          limit: 10,
          offset: newOffset,
        },
      });

      if (newOffset === 0) {
        setInteractions(response.data.interactions);
      } else {
        setInteractions((prev) => [...prev, ...response.data.interactions]);
      }

      setHasMore(response.data.count >= 10);
      setOffset(newOffset + 10);
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (interactionId: string) => {
    try {
      await axios.patch(
        getApiEndpoint(`/messages/${interactionId}/mark-read`),
        {
          userId: user.uid,
        }
      );

      setInteractions((prev) =>
        prev.map((i) =>
          i._id === interactionId ? { ...i, isRead: true } : i
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleLikeContent = async (interactionId: string) => {
    setLoadingActions((prev) => ({
      ...prev,
      [`like-${interactionId}`]: true,
    }));
    try {
      await axios.post(
        getApiEndpoint(`/messages/${interactionId}/interact`),
        {
          userId: user.uid,
          type: "like",
        }
      );

      setInteractions((prev) =>
        prev.map((i) => {
          if (i._id === interactionId) {
            return {
              ...i,
              interactions: [
                ...(i.interactions || []),
                {
                  type: "like",
                  userId: user.uid,
                  value: "",
                  createdAt: new Date(),
                },
              ],
            };
          }
          return i;
        })
      );

      toast.success("Liked!");
    } catch (error: any) {
      if (error.response?.data?.error?.includes("Already liked")) {
        toast.error("You already liked this");
      } else {
        console.error("Failed to like:", error);
        toast.error("Failed to like content");
      }
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        [`like-${interactionId}`]: false,
      }));
    }
  };

  const handleComment = async (interactionId: string) => {
    const text = commentText[interactionId]?.trim();
    if (!text) {
      toast.error("Comment cannot be empty");
      return;
    }

    setLoadingActions((prev) => ({
      ...prev,
      [`comment-${interactionId}`]: true,
    }));
    try {
      await axios.post(
        getApiEndpoint(`/messages/${interactionId}/interact`),
        {
          userId: user.uid,
          type: "comment",
          value: text,
        }
      );

      setInteractions((prev) =>
        prev.map((i) => {
          if (i._id === interactionId) {
            return {
              ...i,
              interactions: [
                ...(i.interactions || []),
                {
                  type: "comment",
                  userId: user.uid,
                  value: text,
                  createdAt: new Date(),
                },
              ],
            };
          }
          return i;
        })
      );

      setCommentText({ ...commentText, [interactionId]: "" });
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        [`comment-${interactionId}`]: false,
      }));
    }
  };

  const handleDelete = async (interactionId: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;

    setLoadingActions((prev) => ({
      ...prev,
      [`delete-${interactionId}`]: true,
    }));
    try {
      await axios.delete(getApiEndpoint(`/messages/${interactionId}`), {
        data: { userId: user.uid },
      });

      setInteractions((prev) =>
        prev.filter((i) => i._id !== interactionId)
      );

      toast.success("Deleted successfully");
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        [`delete-${interactionId}`]: false,
      }));
    }
  };

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      setOffset(0);
      setInteractions([]);
      fetchInbox(0);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      setLoadingFriends(true);
      axios
        .get(getApiEndpoint(`/friends/list?userId=${user.uid}`))
        .then((res) => setFriends(res.data.friends || []))
        .catch(() => setFriends([]))
        .finally(() => setLoadingFriends(false));
    }
  }, [user?.uid]);

  if (!user?.uid) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('my_messages_title')}
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              {t('please_login_messages')}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {t('go_to_home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('my_messages_title')}</h1>
        </div>

        {/* Friends List */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">{t('friends_title')}</h2>
          {loadingFriends ? (
            <div className="py-4 flex items-center justify-center">
              <Loader size={20} className="animate-spin text-blue-600" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-gray-500 text-sm">{t('no_friends_yet')}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {friends.map((friend) => (
                <Link
                  key={friend.userId}
                  href={{ pathname: "/messages/conversation", query: { userId: friend.userId } }}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:bg-blue-50 transition border border-gray-200 cursor-pointer"
                >
                  {friend.photo ? (
                    <img src={friend.photo} alt={friend.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {friend.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{friend.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-16 text-center">
            <Loader size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600 text-lg">{t('loading_messages')}</p>
          </div>
        ) : interactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">{t('no_messages')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 px-1">{t('recent_messages')}</h2>
              {interactions.reduce((acc: any[], curr: any) => {
                if (!acc.find(item => item.sharedBy.userId === curr.sharedBy.userId)) {
                  acc.push(curr);
                }
                return acc;
              }, []).map((interaction: any) => (
                <Link
                  key={interaction._id}
                  href={{ pathname: "/messages/conversation", query: { userId: interaction.sharedBy.userId } }}
                  className={`block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all ${
                    !interaction.isRead ? "border-l-4 border-blue-600 bg-blue-50/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {interaction.sharedBy.photo ? (
                      <img
                        src={interaction.sharedBy.photo}
                        alt={interaction.sharedBy.name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {interaction.sharedBy.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900 truncate">
                          {interaction.sharedBy.name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(interaction.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!interaction.isRead ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                        {interaction.sharedMessage || interaction.content.caption || t('sent_you_post')}
                      </p>
                    </div>

                    {!interaction.isRead && (
                      <div className="w-3 h-3 bg-blue-600 rounded-full shadow-sm"></div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchInbox(offset)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition font-medium shadow-sm"
                >
                  {t('load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
