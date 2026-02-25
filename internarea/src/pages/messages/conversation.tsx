import axios from "axios";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { selectuser, selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";
import { getApiEndpoint } from "@/utils/api";
import { toast } from "react-toastify";
import { Loader, ArrowLeft, Send, Check, CheckCheck } from "lucide-react";

export default function ConversationPage() {
  const router = useRouter();
  const { userId: otherUserId } = router.query;
  const user = useSelector(selectuser);
  const language = useSelector(selectLanguage) || "en";
  const { t } = useTranslation(language);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Scroll to bottom only when explicitly requested
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    if (user?.uid && otherUserId) {
      fetchConversation();
      fetchOtherUser();
    }
    // eslint-disable-next-line
  }, [user?.uid, otherUserId]);

  const fetchConversation = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const response = await axios.get(getApiEndpoint(`/messages/conversation/${otherUserId}`), {
        params: { userId: user.uid, limit: 50, offset: 0 },
      });
      // Sort messages by createdAt ascending (oldest first)
      const sorted = (response.data.interactions || []).slice().sort((a: any, b: any) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ta - tb;
      });
      setMessages(sorted);

      // Only scroll to bottom on initial load
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setTimeout(() => scrollToBottom("auto"), 100);
      }
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUser = async () => {
    try {
      const response = await axios.get(getApiEndpoint(`/auth/user/${otherUserId}`));
      setOtherUser(response.data);
    } catch (error) {
      setOtherUser({ name: t('unknown_user') });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    // Prevent default form/button behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user?.uid || !messageText.trim() || sending) return;

    const currentMessage = messageText.trim();
    setSending(true);

    const newMessage = {
      sharedBy: {
        userId: user.uid,
        name: user.name,
        email: user.email,
      },
      sharedWithIds: [otherUserId],
      content: {
        postId: "direct-message",
        caption: currentMessage,
        mediaUrls: [],
        originalPoster: {
          userId: user.uid,
          name: user.name,
        },
      },
      sharedMessage: currentMessage,
      createdAt: new Date().toISOString(),
      read: false,
      _optimistic: true, // Mark as optimistically added
    };

    try {
      // Clear input immediately
      setMessageText("");

      // Optimistically add the message
      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom for the new message
      setTimeout(() => scrollToBottom("smooth"), 50);

      // Keep focus on input
      inputRef.current?.focus();

      // Send to server (no page refresh, no refetch)
      await axios.post(getApiEndpoint("/messages/send-content"), {
        sharedBy: newMessage.sharedBy,
        sharedWithIds: [otherUserId],
        content: newMessage.content,
        sharedMessage: currentMessage,
      });

      // Mark the optimistic message as confirmed (remove _optimistic flag)
      setMessages((prev) =>
        prev.map((msg) =>
          msg === newMessage ? { ...msg, _optimistic: false } : msg
        )
      );
    } catch (error) {
      toast.error("Failed to send message");
      // Remove the optimistically added message if failed
      setMessages((prev) => prev.filter((msg) => msg !== newMessage));
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key without form submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  // Format timestamp like WhatsApp (today, yesterday, or date)
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date (like WhatsApp)
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = '';
    messages.forEach((msg: any) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({
          date: msgDate,
          messages: [msg],
        });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  };

  // Show loading if user is not available yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Loader size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 bg-white rounded-lg shadow-md p-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {otherUser?.name || t('loading')}
            </h1>
            <p className="text-sm text-gray-500">
              {otherUser?.email || ""}
            </p>
          </div>
        </div>

        {/* Messages Container */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-16 text-center">
            <Loader size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600 text-lg">{t('loading_conversation')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center">{t('no_messages_hello')}</p>
                </div>
              ) : (
                groupMessagesByDate().map((group: any, groupIdx: number) => (
                  <div key={groupIdx}>
                    {/* Date Separator */}
                    <div className="flex justify-center mb-4">
                      <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {new Date(group.date).toLocaleDateString([], {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {group.messages.map((msg: any, idx: number) => {
                      const isOwn = user && msg.sharedBy.userId === user.uid;
                      return (
                        <div
                          key={`${groupIdx}-${idx}`}
                          className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-gray-200 text-gray-900 rounded-bl-none'
                            } ${msg._optimistic ? 'opacity-70' : ''}`}
                          >
                            {/* Sender name (only for other user's messages) */}
                            {!isOwn && (
                              <div className="text-xs font-semibold mb-1 text-gray-700">
                                {msg.sharedBy.name}
                              </div>
                            )}
                            {/* Shared Content Preview (Images/Caption) */}
                            {msg.content && msg.content.postId !== "direct-message" && (
                              <div className="mb-2 bg-black/5 rounded group overflow-hidden border border-black/5 hover:border-black/10 transition-colors">
                                <a 
                                  href={`${window.location.origin}/publicspace#post-${msg.content.postId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  {msg.content.mediaUrls && msg.content.mediaUrls.length > 0 && (
                                    <div className="relative aspect-video w-full overflow-hidden bg-gray-200">
                                      <img 
                                        src={msg.content.mediaUrls[0]} 
                                        alt="Shared content" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                  )}
                                  {msg.content.caption && (
                                    <div className={`p-2 text-xs italic line-clamp-2 ${isOwn ? 'text-blue-50' : 'text-gray-600'}`}>
                                      {msg.content.caption}
                                    </div>
                                  )}
                                </a>
                              </div>
                            )}

                            {/* Message content (with linkification) */}
                            <div className="text-sm break-words">
                              {(msg.sharedMessage || (msg.content?.caption && msg.content.postId === "direct-message") || "").split(/(\s+)/).map((part: string, i: number) => {
                                if (part.startsWith("http://") || part.startsWith("https://")) {
                                  return (
                                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100 break-all">
                                      {part}
                                    </a>
                                  );
                                }
                                return part;
                              })}
                            </div>
                            {/* Timestamp and status */}
                            <div className={`text-xs mt-1 flex items-center gap-1 ${
                              isOwn ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isOwn && (
                                <span>
                                  {msg._optimistic ? (
                                    <Loader size={12} className="animate-spin" />
                                  ) : msg.read ? (
                                    <CheckCheck size={14} className="text-blue-200" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Input Area - Sticky at bottom */}
            <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-50"
                  placeholder="Type a message..."
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  onClick={(e) => handleSend(e)}
                  disabled={sending || !messageText.trim()}
                  className={`p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition flex items-center justify-center ${
                    sending || !messageText.trim() ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {sending ? (
                    <Loader size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}