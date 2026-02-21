// import axios from "axios";
// import { useEffect, useState } from "react";
// import { useSelector } from "react-redux";
// import { useRouter } from "next/router";
// import { selectuser } from "@/Feature/Userslice";
// import { getApiEndpoint } from "@/utils/api";
// import { toast } from "react-toastify";
// import { Loader, ArrowLeft, Send } from "lucide-react";

// export default function ConversationPage() {
//   const router = useRouter();
//   const { userId: otherUserId } = router.query;
//   const user = useSelector(selectuser);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [messageText, setMessageText] = useState("");
//   const [otherUser, setOtherUser] = useState<any>(null);
//   const [sending, setSending] = useState(false);

//   useEffect(() => {
//     if (user?.uid && otherUserId) {
//       fetchConversation();
//       fetchOtherUser();
//     }
//     // eslint-disable-next-line
//   }, [user?.uid, otherUserId]);

//   const fetchConversation = async () => {
//     setLoading(true);
//     try {
//       const response = await axios.get(getApiEndpoint(`/messages/conversation/${otherUserId}`), {
//         params: { userId: user.uid, limit: 50, offset: 0 },
//       });
//       // Sort messages by createdAt descending (latest first)
//       const sorted = (response.data.interactions || []).slice().sort((a: any, b: any) => {
//         const ta = new Date(a.createdAt).getTime();
//         const tb = new Date(b.createdAt).getTime();
//         return tb - ta;
//       });
//       setMessages(sorted);
//     } catch (error) {
//       toast.error("Failed to load conversation");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchOtherUser = async () => {
//     try {
//       const response = await axios.get(getApiEndpoint(`/auth/user/${otherUserId}`));
//       setOtherUser(response.data);
//     } catch (error) {
//       setOtherUser({ name: "Unknown User" });
//     }
//   };

//   const handleSend = async () => {
//     if (!user?.uid || !messageText.trim() || sending) return;
//     setSending(true);
//     const newMessage = {
//       sharedBy: {
//         userId: user.uid,
//         name: user.name,
//         email: user.email,
//       },
//       sharedWithIds: [otherUserId],
//       content: {
//         postId: "direct-message",
//         caption: messageText,
//         mediaUrls: [],
//         originalPoster: {
//           userId: user.uid,
//           name: user.name,
//         },
//       },
//       sharedMessage: messageText,
//       createdAt: new Date().toISOString(),
//       read: false,
//     };
//     try {
//       // Optimistically add the message
//       setMessages((prev) => [...prev, newMessage]);
//       setMessageText("");
//       await axios.post(getApiEndpoint("/messages/send-content"), {
//         sharedBy: newMessage.sharedBy,
//         sharedWithIds: [otherUserId],
//         content: newMessage.content,
//         sharedMessage: messageText,
//       });
//       // Optionally, fetch from server after a delay to sync (not immediately)
//       setTimeout(() => fetchConversation(), 1000);
//     } catch (error) {
//       toast.error("Failed to send message");
//       // Remove the optimistically added message if failed
//       setMessages((prev) => prev.filter((msg) => msg !== newMessage));
//     } finally {
//       setSending(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-2xl mx-auto px-4">
//         <div className="flex items-center gap-4 mb-8">
//           <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg transition">
//             <ArrowLeft size={24} className="text-gray-700" />
//           </button>
//           <h1 className="text-2xl font-bold text-gray-900">
//             Conversation with {otherUser?.name || otherUserId}
//           </h1>
//         </div>
//         {loading ? (
//           <div className="bg-white rounded-lg shadow-md p-16 text-center">
//             <Loader size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
//             <p className="text-gray-600 text-lg">Loading conversation...</p>
//           </div>
//         ) : (
//           <div className="bg-white rounded-lg shadow-md p-6 flex flex-col gap-4 relative min-h-[400px]">
//             {messages.length === 0 ? (
//               <p className="text-gray-600 text-center">No messages yet. Start the conversation!</p>
//             ) : (
//               <div className="flex flex-col gap-2 pb-20">
//                 {messages.map((msg, idx) => (
//                   <div key={idx} className={`flex ${msg.sharedBy.userId === user.uid ? "justify-end" : "justify-start"}`}>
//                     <div className={`rounded-lg px-4 py-2 max-w-xs ${msg.sharedBy.userId === user.uid ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"}`}>
//                       <div className="text-sm font-bold">{msg.sharedBy.name}</div>
//                       <div className="text-base">{msg.sharedMessage || msg.content.caption}</div>
//                       <div className="text-xs text-gray-500 mt-1">{new Date(msg.createdAt).toLocaleString()}</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//             <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 flex gap-2 mt-4 z-10">
//               <input
//                 type="text"
//                 value={messageText}
//                 onChange={e => setMessageText(e.target.value)}
//                 className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
//                 placeholder="Type a message..."
//                 onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
//               />
//               <button
//                 onClick={handleSend}
//                 disabled={sending || !messageText.trim()}
//                 className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 ${sending ? "opacity-60 cursor-not-allowed" : ""}`}
//               >
//                 {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
//                 {sending ? "Sending..." : "Send"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { selectuser } from "@/Feature/Userslice";
import { getApiEndpoint } from "@/utils/api";
import { toast } from "react-toastify";
import { Loader, ArrowLeft, Send, Check, CheckCheck } from "lucide-react";

export default function ConversationPage() {
  const router = useRouter();
  const { userId: otherUserId } = router.query;
  const user = useSelector(selectuser);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Only scroll when a new message is added
  const prevMessagesLength = useRef<number>(0);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  useEffect(() => {
    // Redirect if no user
    if (!user?.uid) {
      router.push('/login');
      return;
    }
    
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
      // Sort messages by createdAt ascending (oldest first) for WhatsApp-like display
      const sorted = (response.data.interactions || []).slice().sort((a: any, b: any) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ta - tb; // Ascending order (oldest to newest)
      });
      setMessages(sorted);
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
      setOtherUser({ name: "Unknown User" });
    }
  };

  const handleSend = async () => {
    if (!user?.uid || !messageText.trim() || sending) return;
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
        caption: messageText,
        mediaUrls: [],
        originalPoster: {
          userId: user.uid,
          name: user.name,
        },
      },
      sharedMessage: messageText,
      createdAt: new Date().toISOString(),
      read: false,
    };
    try {
      // Optimistically add the message
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");
      await axios.post(getApiEndpoint("/messages/send-content"), {
        sharedBy: newMessage.sharedBy,
        sharedWithIds: [otherUserId],
        content: newMessage.content,
        sharedMessage: messageText,
      });
      // Optionally, fetch from server after a delay to sync (not immediately)
      setTimeout(() => fetchConversation(), 1000);
    } catch (error) {
      toast.error("Failed to send message");
      // Remove the optimistically added message if failed
      setMessages((prev) => prev.filter((msg) => msg !== newMessage));
    } finally {
      setSending(false);
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
          <p className="text-gray-600">Loading...</p>
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
              {otherUser?.name || "Loading..."}
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
            <p className="text-gray-600 text-lg">Loading conversation...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center">No messages yet. Say hello! 👋</p>
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
                      // Add null check for user
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
                            }`}
                          >
                            {/* Sender name (only for other user's messages) */}
                            {!isOwn && (
                              <div className="text-xs font-semibold mb-1 text-gray-700">
                                {msg.sharedBy.name}
                              </div>
                            )}
                            {/* Message content */}
                            <div className="text-sm break-words">
                              {msg.sharedMessage || msg.content.caption}
                            </div>
                            {/* Timestamp and status */}
                            <div className={`text-xs mt-1 flex items-center gap-1 ${
                              isOwn ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isOwn && (
                                <span>
                                  {msg.read ? (
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
              {/* Invisible element for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Sticky at bottom */}
            <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-50"
                  placeholder="Type a message..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button
                  onClick={handleSend}
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