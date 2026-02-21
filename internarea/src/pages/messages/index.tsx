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
import { selectuser } from "@/Feature/Userslice";
import { getApiEndpoint } from "@/utils/api";
import { useRouter } from "next/router";
import Link from "next/link";

export default function MessageInbox() {
  const router = useRouter();
  const user = useSelector(selectuser);
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
              My Messages
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Please log in to view your messages.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Home
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
          <h1 className="text-3xl font-bold text-gray-900">My Messages</h1>
        </div>

        {/* Friends List */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Friends</h2>
          {loadingFriends ? (
            <div className="py-4 flex items-center justify-center">
              <Loader size={20} className="animate-spin text-blue-600" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-gray-500 text-sm">No friends yet.</div>
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
            <p className="text-gray-600 text-lg">Loading messages...</p>
          </div>
        ) : interactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">No messages yet</p>
          </div>
        ) : (
          <>
            {interactions.map((interaction) => {
              const likeCount = interaction.interactions?.filter(
                (i: any) => i.type === "like"
              ).length || 0;
              const commentCount = interaction.interactions?.filter(
                (i: any) => i.type === "comment"
              ).length || 0;
              const isLiked = interaction.interactions?.some(
                (i: any) => i.type === "like" && i.userId === user.uid
              );
              const isUnread = !interaction.isRead;

              return (
                <div
                  key={interaction._id}
                  className={`bg-white rounded-lg shadow-md p-6 mb-6 ${
                    isUnread ? "border-l-4 border-blue-600" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {interaction.sharedBy.photo ? (
                        <img
                          src={interaction.sharedBy.photo}
                          alt={interaction.sharedBy.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {interaction.sharedBy.name?.charAt(0).toUpperCase() ||
                            "U"}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {interaction.sharedBy.name}
                          {isUnread && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          Shared: {formatDate(interaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => markAsRead(interaction._id)}
                        className="text-blue-600 hover:text-blue-700 ml-4"
                      >
                        <Check size={20} />
                      </button>
                    )}
                  </div>

                  {/* Shared Message */}
                  {interaction.sharedMessage && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-400">
                      <p className="text-gray-900 italic">
                        "{interaction.sharedMessage}"
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {interaction.content.mediaUrls &&
                      interaction.content.mediaUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {interaction.content.mediaUrls.map((url: string, idx: number) => (
                            <img
                              key={idx}
                              src={url}
                              alt="Shared content"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    {interaction.content.caption && (
                      <p className="text-gray-900">{interaction.content.caption}</p>
                    )}
                  </div>

                  {/* Interaction Stats */}
                  <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    <button className="hover:text-gray-900 transition">
                      {likeCount} {likeCount === 1 ? "like" : "likes"}
                    </button>
                    <span>
                      {commentCount} {commentCount === 1 ? "comment" : "comments"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-4 pb-4 border-b">
                    <button
                      onClick={() => handleLikeContent(interaction._id)}
                      disabled={loadingActions[`like-${interaction._id}`]}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium flex-1 ${
                        loadingActions[`like-${interaction._id}`]
                          ? "opacity-60 cursor-not-allowed"
                          : isLiked
                          ? "text-red-500 bg-red-50 hover:bg-red-100"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {loadingActions[`like-${interaction._id}`] ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Heart
                          size={18}
                          fill={isLiked ? "currentColor" : "none"}
                        />
                      )}
                      {isLiked ? "Liked" : "Like"}
                    </button>
                    <button
                      onClick={() => handleDelete(interaction._id)}
                      disabled={loadingActions[`delete-${interaction._id}`]}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                    >
                      {loadingActions[`delete-${interaction._id}`] ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>

                  {/* Comment Section */}
                  <div className="space-y-3">
                    {/* Existing Comments */}
                    {interaction.interactions?.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {interaction.interactions
                          .filter((int: any) => int.type === "comment")
                          .map((comment: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {comment.userId?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-900">
                                  {comment.value}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(comment.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="flex gap-2">
                      {user?.photo ? (
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
                        value={commentText[interaction._id] || ""}
                        onChange={(e) =>
                          setCommentText({
                            ...commentText,
                            [interaction._id]: e.target.value,
                          })
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(interaction._id);
                          }
                        }}
                        placeholder="Write a response..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                      />
                      <button
                        onClick={() => handleComment(interaction._id)}
                        disabled={
                          !commentText[interaction._id]?.trim() ||
                          loadingActions[`comment-${interaction._id}`]
                        }
                        className={`px-3 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
                          !commentText[interaction._id]?.trim() ||
                          loadingActions[`comment-${interaction._id}`]
                            ? "bg-gray-400 cursor-not-allowed opacity-60"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {loadingActions[`comment-${interaction._id}`] ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={() => fetchInbox(offset)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
