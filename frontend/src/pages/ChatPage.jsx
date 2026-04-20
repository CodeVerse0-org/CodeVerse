import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom"; // Added useNavigate
import { 
  Send, MessageSquare, Plus, Terminal, Cpu, Trash2, 
  Layers, Zap, Globe, ChevronDown 
} from "lucide-react"; // Added Globe and ChevronDown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DeveloperNavbar from "../components/DeveloperNavbar";

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize navigate
  const repoName = searchParams.get("repo");
  const instId = searchParams.get("inst");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  const storageKey = `chatHistory_${repoName}`;

  // Error state for missing repo
  if (!repoName) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020405] text-gray-400 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="text-center space-y-6 z-10">
          <div className="w-20 h-20 mx-auto bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center shadow-2xl">
            <Terminal size={40} className="text-cyan-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">No Repository Active</h2>
            <p className="text-sm text-gray-500 max-w-[250px] mx-auto leading-relaxed">
              Connect a codebase via the dashboard to initialize AI analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Load chats on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);
      if (parsed.length > 0) setActiveChatId(parsed.id);
    } else {
      const newChat = { id: Date.now(), title: "New Analysis", messages: [] };
      setChats([newChat]);
      setActiveChatId(newChat.id);
    }
  }, [repoName, storageKey]);

  // Save chats on change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(chats));
    }
  }, [chats, storageKey]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats, isTyping]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  const createNewChat = () => {
    const newChat = { id: Date.now(), title: "New Analysis", messages: [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (id) => {
    const filtered = chats.filter(chat => chat.id !== id);
    setChats(filtered);
    if (id === activeChatId && filtered.length > 0) {
      setActiveChatId(filtered.id);
    }
  };

  const updateMessages = (newMessages) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === activeChatId ? { ...chat, messages: newMessages } : chat
      )
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    updateMessages(newMessages);

    const currentInput = input;
    setInput("");
    setIsTyping(true);

    if (messages.length === 0) {
      const title = currentInput.slice(0, 25) + "...";
      setChats(prev =>
        prev.map(chat => chat.id === activeChatId ? { ...chat, title } : chat)
      );
    }

    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          message: currentInput,
          repository: repoName,
          installation_id: instId,
          history: newMessages.slice(-5)
        }),
      });

      const data = await response.json();
      if (response.ok) {
        updateMessages([...newMessages, { role: "assistant", content: data.content }]);
      } else {
        throw new Error(data.detail || "Failed to get AI response");
      }
    } catch (err) {
      updateMessages([...newMessages, { role: "assistant", content: `❌ **Error:** ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden selection:bg-cyan-500/30">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`transition-all duration-500 ease-in-out ${isSidebarOpen ? "w-80" : "w-0"} bg-[#05070a] border-r border-white/[0.03] flex flex-col overflow-hidden`}>
          <div className="p-6 space-y-6 h-full flex flex-col">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Layers size={12} className="text-cyan-500" /> Active Session
              </p>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-cyan-500/30 transition-all">
                <p className="text-[10px] font-mono text-gray-500 truncate mb-1">REPOSITORY_VECTORS</p>
                <p className="text-xs font-bold text-white truncate">{repoName}</p>
              </div>
            </div>

            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-between px-4 py-3 bg-cyan-500 text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              Initialize New Chat <Plus size={16} />
            </button>

            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">History</p>
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`group relative flex items-center px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                    chat.id === activeChatId
                      ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-400"
                      : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <MessageSquare size={14} className="mr-3 shrink-0" />
                  <span className="text-xs font-medium truncate pr-6">{chat.title}</span>
                  <Trash2
                    size={14}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <main className="flex-1 flex flex-col relative bg-[#010203]">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          {/* CHAT HEADER */}
          <header className="h-20 border-b border-white/[0.03] flex items-center justify-between px-10 bg-black/40 backdrop-blur-2xl z-20">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <Cpu size={20} className="text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-sm font-black tracking-[0.15em] uppercase text-white leading-none">CodeVerse Core</h1>
                    <p className="text-[9px] text-gray-500 font-mono mt-1 tracking-widest uppercase">Autonomous Knowledge Engine</p>
                </div>
              </div>
            </div>
            
            {/* INTEGRATED ORANGE NAVIGATION BUTTON */}
            <button 
                onClick={() => navigate("/chatbot-selection")} 
                className="flex items-center gap-3 px-4 py-2 bg-orange-500/5 border border-orange-500/20 rounded-full hover:bg-orange-500/10 hover:border-orange-500/40 transition-all group"
            >
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-orange-500/40 animate-ping" />
                    <div className="relative w-1.5 h-1.5 rounded-full bg-orange-500" />
                </div>

                <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                        Linked <Globe size={8} />
                    </span>
                    <span className="text-[10px] font-bold text-white/90 group-hover:text-orange-400 transition-colors">
                        Switch Repository
                    </span>
                </div>
                <ChevronDown size={14} className="text-gray-600 group-hover:text-orange-500 transition-colors" />
            </button>
          </header>

          {/* MESSAGES AREA */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 z-10 scroll-smooth">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto text-center opacity-60">
                 <div className="p-5 bg-white/[0.02] border border-white/5 rounded-full shadow-2xl">
                    <Zap size={40} className="text-cyan-500 animate-pulse" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white tracking-tighter">Ready for Code Insight?</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-light">Ask about function dependencies, architectural flaws, or logic optimizations. I am synchronized with your codebase.</p>
                 </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      msg.role === 'user' 
                        ? 'bg-gray-800 border-white/10 text-gray-400' 
                        : 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    }`}>
                      {msg.role === 'user' ? <MessageSquare size={18} /> : <Cpu size={18} />}
                    </div>

                    <div className={`p-6 rounded-3xl text-[13.5px] leading-relaxed shadow-2xl transition-all border ${
                      msg.role === 'user' 
                        ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-50 rounded-tr-none' 
                        : 'bg-white/[0.03] border-white/5 text-gray-200 rounded-tl-none'
                    }`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={atomDark}
                                language={match}
                                PreTag="div"
                                className="rounded-xl !my-4 !bg-[#05070a] border border-white/5 !p-4 shadow-inner"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-xs" {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center gap-4 px-10 py-4 bg-white/[0.01] border border-white/5 rounded-2xl w-fit animate-pulse">
                <Cpu size={14} className="text-cyan-500 animate-spin" />
                <span className="text-[10px] font-black text-cyan-500/80 uppercase tracking-[0.2em]">Processing Vector Query...</span>
              </div>
            )}
          </div>

          {/* INPUT SECTION */}
          <div className="p-10 bg-gradient-to-t from-[#020405] via-[#020405]/80 to-transparent z-20">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-all" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Query ${repoName.split('/').pop() || 'Repository'}...`}
                className="relative w-full bg-[#05070a] border border-white/10 rounded-2xl py-6 pl-8 pr-20 text-sm text-white placeholder-gray-600 focus:border-cyan-500/40 focus:outline-none transition-all shadow-2xl"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 disabled:opacity-30 disabled:grayscale transition-all shadow-lg active:scale-95"
              >
                <Send size={22} />
              </button>
            </form>
            <p className="text-center text-[9px] text-gray-700 font-mono mt-4 uppercase tracking-widest">
                CodeVerse Intelligence Engine v2.4.0 // Secure Contextual Analysis
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatPage;