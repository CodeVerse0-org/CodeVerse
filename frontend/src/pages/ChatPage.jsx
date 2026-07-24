import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Send, Plus, Zap, MessageSquare, Code, Terminal, Cpu, Trash2, ArrowLeftRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DeveloperNavbar from "../components/DeveloperNavbar";

const ChatPage = () => {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const scrollRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

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
              "Content-Type": "application/json"
            },
          }
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

            const firstUserMsg = sessionMessages.find((m) => m.role === "user")?.content;

            sessionMap.set(session.sessionId, {
              id: session.sessionId,
              title: firstUserMsg ? firstUserMsg.slice(0, 25) + "..." : "New Session",
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
        }
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
        chat.id === activeChatId ? { ...chat, messages: [...newMessages] } : chat
      )
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
        prev.map((c) => (c.id === activeChatId ? { ...c, title } : c))
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
        updateMessages([...newMessages, { role: "assistant", content: data.content }]);
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

  if (!repoName) return <div className="h-screen bg-[#020405]" />;

  return (
    <div className="h-screen flex flex-col bg-[#020408] text-slate-300 overflow-hidden font-sans">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <aside
          className={`${
            isSidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 ease-in-out bg-[#05070a] border-r border-white/5 flex flex-col`}
        >
          <div className="p-5 flex flex-col h-full overflow-hidden">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 transition-all text-[#020408] rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <Plus size={16} strokeWidth={3} /> New Chat
            </button>

            <div className="mt-8 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              <div className="px-2 mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">History</span>
              </div>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectSession(chat.id)}
                  className={`group relative w-full text-left px-4 py-3 rounded-xl text-xs transition-all flex items-center gap-3 border cursor-pointer ${
                    chat.id === activeChatId
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                      : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300"
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="truncate font-medium pr-6">{chat.title}</span>

                  <button
                    onClick={(e) => handleDeleteSession(e, chat.id)}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <main className="flex-1 flex flex-col bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#0a0f1a] via-[#020408] to-[#020408]">
          <div className="flex items-center justify-between px-8 py-4 bg-[#05070a]/50 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{repoName}</span>
            </div>

            <button
              onClick={() => navigate("/chatbot-selection")}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              <ArrowLeftRight size={14} className="text-cyan-500" />
              Switch Repo
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 md:px-16 lg:px-32 py-10 space-y-8 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-10 animate-pulse"></div>
                  <Cpu size={48} className="relative text-cyan-500/40" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-slate-100 font-semibold tracking-tight">CodeVerse Intelligence</h3>
                  <p className="text-xs text-slate-500 font-mono italic underline decoration-cyan-500/30">
                    Analyzing: {repoName}
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
                    className={`max-w-[85%] lg:max-w-[80%] p-5 rounded-2xl border ${
                      msg.role === "user"
                        ? "bg-[#0f172a] border-cyan-500/20 text-slate-100"
                        : "bg-[#0d1117]/80 backdrop-blur-sm border-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 opacity-40">
                      {msg.role === "user" ? <Terminal size={12} /> : <Code size={12} />}
                      <span className="text-[10px] font-mono uppercase tracking-widest">
                        {msg.role === "user" ? "Developer" : "CodeVerse AI"}
                      </span>
                    </div>
                    <div className="markdown-container text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center gap-3 text-cyan-500 animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Synthesizing response</span>
              </div>
            )}
          </div>

          <div className="p-6 md:px-16 lg:px-32 bg-gradient-to-t from-[#020408] to-transparent">
            <form
              onSubmit={handleSendMessage}
              className="relative flex items-center gap-3 bg-[#0d1117] border border-white/10 p-2 rounded-2xl focus-within:border-cyan-500/50 transition-all shadow-2xl"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Query repository...`}
                className="flex-1 p-3 bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600"
              />

              <button className="p-3 bg-cyan-500 hover:bg-cyan-400 text-[#020408] rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/10">
                <Send size={18} />
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.3); }
        
        .markdown-container pre { 
          background: #010409 !important; 
          padding: 1.25rem; 
          border-radius: 12px; 
          border: 1px solid rgba(255,255,255,0.05);
          margin: 1rem 0;
          overflow-x: auto;
        }
        .markdown-container code { 
          font-family: 'JetBrains Mono', monospace; 
          color: #22d3ee;
          font-size: 0.85rem;
        }
        .markdown-container p { margin-bottom: 0.75rem; }
      `,
        }}
      />
    </div>
  );
};

export default ChatPage;