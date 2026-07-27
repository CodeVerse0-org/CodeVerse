// ChatbotPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Send,
  Plus,
  Zap,
  MessageSquare,
  Code,
  Terminal,
  Cpu,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DeveloperNavbar from "../components/DeveloperNavbar";

const ChatbotPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoName = searchParams.get("repo") || "";
  const instId = searchParams.get("inst");

  // =========================================================
  // STRICT USER RESOLUTION (Directly targets user ID)
  // =========================================================
  const getCurrentUserId = () => {
    try {
      // 1. Try retrieving directly from stored user object
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const resolvedId = parsed.id || parsed.user_id || parsed.userId;
        if (resolvedId) return String(resolvedId);
      }

      // 2. Fallback: Parse JWT token `sub` (Matches auth.py str(user_id))
      const token = localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));
        if (payload.sub) return String(payload.sub);
      }
    } catch (e) {
      console.warn("Could not parse user session:", e);
    }
    return null;
  };

  const userId = getCurrentUserId();

  const [sessionId, setSessionId] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("chatSidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const scrollRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("chatSidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  // ===========================
  // FETCH USER HISTORY
  // ===========================
  useEffect(() => {
    const fetchHistory = async () => {
      if (!repoName || !userId) return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_URL}/api/chat/history/${encodeURIComponent(userId)}/${encodeURIComponent(repoName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (res.status === 401) {
          navigate("/login");
          return;
        }

        const data = await res.json();

        if (data.sessions && data.sessions.length > 0) {
          const sessionMap = new Map();

          data.sessions.forEach((session) => {
            if (sessionMap.has(session.sessionId)) return;

            const historyText = session.history || "";
            const messageBlocks = historyText.split(/(?=User: |Assistant: )/g);

            const sessionMessages = messageBlocks
              .map((block) => {
                if (block.startsWith("User: ")) {
                  return {
                    role: "user",
                    content: block.replace("User: ", "").trim(),
                  };
                }
                if (block.startsWith("Assistant: ")) {
                  return {
                    role: "assistant",
                    content: block.replace("Assistant: ", "").trim(),
                  };
                }
                return null;
              })
              .filter(Boolean);

            const firstUserMsg = sessionMessages.find(
              (m) => m.role === "user",
            )?.content;

            sessionMap.set(session.sessionId, {
              id: session.sessionId,
              title: firstUserMsg
                ? firstUserMsg.slice(0, 25) + "..."
                : "New Session",
              messages: sessionMessages,
            });
          });

          const restoredChats = Array.from(sessionMap.values());
          setChats(restoredChats);

          const firstSessionId = restoredChats[0]?.id || null;
          if (firstSessionId) {
            setActiveChatId(firstSessionId);
            setSessionId(firstSessionId);
          }
        } else {
          createNewChat();
        }
      } catch (err) {
        console.error("❌ History Sync Error:", err);
        createNewChat();
      }
    };

    fetchHistory();
  }, [repoName, userId]);

  // ===========================
  // CREATE NEW CHAT
  // ===========================
  const createNewChat = () => {
    const newId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newChat = {
      id: newId,
      title: "New Analysis",
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setSessionId(newId);
  };

  // ===========================
  // DELETE SESSION
  // ===========================
  const handleDeleteSession = async (e, idToDelete) => {
    e.stopPropagation();

    if (!window.confirm("Permanently delete this session?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/chat/session/${idToDelete}?repository=${encodeURIComponent(repoName)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        setChats((prev) => prev.filter((chat) => chat.id !== idToDelete));

        if (activeChatId === idToDelete) {
          const remaining = chats.filter((c) => c.id !== idToDelete);
          if (remaining.length > 0) {
            handleSelectSession(remaining[0].id);
          } else {
            createNewChat();
          }
        }
      }
    } catch (err) {
      console.error("❌ Delete Error:", err);
    }
  };

  const handleSelectSession = (id) => {
    const selected = chats.find((c) => c.id === id);
    if (!selected) return;
    setActiveChatId(id);
    setSessionId(id);
  };

  const updateMessages = (newMessages) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...newMessages] }
          : chat,
      ),
    );
  };

  // ===========================
  // SEND CHAT MESSAGE
  // ===========================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];

    updateMessages(newMessages);

    if (messages.length === 0) {
      const title = input.slice(0, 25) + "...";
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, title } : c)),
      );
    }

    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      const payload = {
        message: currentInput,
        repository: repoName,
        user_id: userId,
        session_id: sessionId,
        installation_id: instId || "",
        history: newMessages.slice(-5),
      };

      const response = await fetch(`${API_URL}/api/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        updateMessages([
          ...newMessages,
          { role: "assistant", content: data.content },
        ]);
      } else {
        console.error("Validation / API Error Details:", data);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!repoName) return <div className="h-screen bg-black" />;

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <aside
          className={`${
            isSidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 ease-in-out bg-black border-r border-white/5 flex flex-col shrink-0`}
        >
          <div className="p-4 flex flex-col h-full overflow-hidden w-72">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all group"
            >
              <Plus
                size={16}
                strokeWidth={3}
                className="group-hover:rotate-90 transition-transform"
              />
              <span>New Chat</span>
            </button>

            <div className="mt-6 flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              <div className="px-2 mb-3">
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                  Session History
                </span>
              </div>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectSession(chat.id)}
                  className={`group relative w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-3 border cursor-pointer ${
                    chat.id === activeChatId
                      ? "bg-cyan-500/10 border-cyan-500/30 text-white"
                      : "border-transparent text-gray-400 hover:bg-white/[0.02] hover:text-gray-300"
                  }`}
                >
                  <MessageSquare
                    size={14}
                    className={`flex-shrink-0 ${chat.id === activeChatId ? "text-cyan-400" : "text-gray-600"}`}
                  />
                  <span className="truncate font-bold pr-6">{chat.title}</span>

                  <button
                    onClick={(e) => handleDeleteSession(e, chat.id)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-gray-500 transition-all"
                    title="Delete session"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <main className="flex-1 flex flex-col bg-black relative min-w-0">
          {/* Main Header */}
          <header className="h-16 border-b border-white/5 flex items-center px-6 bg-black justify-between z-20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {repoName}
              </span>
            </div>

            <button
              onClick={() => navigate("/chatbot-selection")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-[10px] font-bold uppercase tracking-wider transition-all text-gray-400 hover:text-cyan-400"
            >
              <ArrowLeftRight size={14} />
              Switch Repo
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 md:px-12 lg:px-24 py-8 space-y-6 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 text-cyan-400 mb-2">
                  <Cpu size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                    CodeVerse Intelligence
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    Ready to analyze{" "}
                    <span className="text-cyan-400">{repoName}</span>
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] lg:max-w-[85%] p-5 rounded-2xl border ${
                      msg.role === "user"
                        ? "bg-cyan-500/10 border-cyan-500/20 text-white rounded-br-sm"
                        : "bg-white/[0.02] border-white/5 text-gray-300 rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {msg.role === "user" ? (
                        <Terminal size={12} className="text-cyan-400" />
                      ) : (
                        <Code size={12} className="text-gray-500" />
                      )}
                      <span
                        className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                          msg.role === "user"
                            ? "text-cyan-400"
                            : "text-gray-500"
                        }`}
                      >
                        {msg.role === "user" ? "Developer" : "CodeVerse AI"}
                      </span>
                    </div>
                    <div className="markdown-container text-xs leading-relaxed font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center gap-3 text-cyan-500 py-4">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  Synthesizing response
                </span>
              </div>
            )}
          </div>

          <div className="p-4 md:px-12 lg:px-24 bg-black shrink-0 pb-6 border-t border-white/5">
            <form
              onSubmit={handleSendMessage}
              className="relative flex items-center gap-3 bg-black border border-white/10 p-1.5 rounded-xl focus-within:border-cyan-500/50 transition-colors shadow-2xl"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Query repository..."
                className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-mono focus:ring-0"
                disabled={isTyping}
              />

              <button
                disabled={!input.trim() || isTyping}
                className="p-3 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group mr-1"
              >
                <Send
                  size={16}
                  className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </button>
            </form>
          </div>
        </main>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.5); }
        
        .markdown-container pre { 
          background: rgba(0, 0, 0, 0.5) !important; 
          padding: 1rem; 
          border-radius: 0.75rem; 
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin: 1rem 0;
          overflow-x: auto;
        }
        .markdown-container code { 
          font-family: 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace; 
          color: #22d3ee;
          font-size: 0.75rem;
          background: rgba(34, 211, 238, 0.05);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .markdown-container pre code {
          background: transparent;
          padding: 0;
          color: #e2e8f0;
        }
        .markdown-container p { margin-bottom: 0.75rem; }
        .markdown-container p:last-child { margin-bottom: 0; }
        .markdown-container ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-container ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-container li { margin-bottom: 0.25rem; }
        .markdown-container a { color: #22d3ee; text-decoration: underline; text-underline-offset: 2px; }
        .markdown-container strong { color: #fff; }
      `,
        }}
      />
    </div>
  );
};

export default ChatbotPage;
