import React, { useState, useEffect } from "react";
import {
  Code2,
  X,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Globe,
  Server,
  Link2
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const NodeDetailPanel = ({
  activeNode,
  selectedNode,
  setSelectedNode
}) => {
  const { getNode, getEdges, setCenter } = useReactFlow();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active or clicked node target selection
  const currentNode = selectedNode || activeNode;

  // ======================================================
  // FETCH AI SUMMARY
  // ======================================================
  useEffect(() => {
    if (selectedNode) {
      setSummary("");
      setError(null);
      fetchSummary(false);
    } else {
      setSummary("");
      setError(null);
    }
  }, [selectedNode?.id]);

  const fetchSummary = async (isRegenerate = false) => {
    if (!selectedNode) return;

    setLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt");

      if (!token) {
        setError("Please log in to view AI summaries.");
        setLoading(false);
        return;
      }

      // Safe code extraction logic for AI summary generation
      const fileContent =
        selectedNode?.data?.content ||
        selectedNode?.data?.code ||
        selectedNode?.data?.fileContent ||
        selectedNode?.data?.implementation ||
        selectedNode?.data?.backendSnippet ||
        selectedNode?.data?.frontendSnippet ||
        `// Node: ${selectedNode?.data?.label || selectedNode?.id}`;

      const response = await axios.post(
        `${API_BASE_URL}/api/summaries/process`,
        {
          file_path: selectedNode.id,
          file_content: fileContent,
          node_type: selectedNode.data?.category || selectedNode.type || "file",
          regenerate: isRegenerate
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSummary(response.data.summary || "No summary returned.");
    } catch (err) {
      console.error("Error fetching summary:", err);
      let msg = "Failed to generate summary.";

      if (err.response?.status === 401) {
        msg = "Session expired or invalid token. Please log in again.";
      } else if (err.response?.status === 503) {
        msg = "AI service busy. Please try again shortly.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!currentNode) return null;

  // ======================================================
  // STRICT API vs FILE NODE DETECTOR
  // ======================================================
  const nodeCategory = (currentNode.data?.category || currentNode.type || "").toLowerCase();
  
  // Explicitly check for API category types
  const isExplicitApiCategory = [
    "api_endpoint",
    "api",
    "api_call",
    "endpoint",
    "http_request"
  ].includes(nodeCategory);

  // Checks if specific snippet fields were provided by backend
  const hasApiSnippets = Boolean(
    currentNode.data?.frontendSnippet ||
    currentNode.data?.frontend_code ||
    currentNode.data?.backendSnippet ||
    currentNode.data?.backend_code
  );

  // A node is only an API node if explicitly flagged or possessing API snippet data
  const isApiNode = isExplicitApiCategory || hasApiSnippets;

  // Extract Frontend Code Snippet (No false mock fallbacks)
  const frontendCode =
    currentNode.data?.frontendSnippet ||
    currentNode.data?.frontend_code ||
    currentNode.data?.frontendCode ||
    currentNode.data?.callerCode ||
    currentNode.data?.clientCode ||
    currentNode.data?.apiCall ||
    currentNode.data?.invocation ||
    null;

  // Extract Backend Code Snippet (No false mock fallbacks)
  const backendCode =
    currentNode.data?.backendSnippet ||
    currentNode.data?.backend_code ||
    currentNode.data?.backendCode ||
    currentNode.data?.handlerCode ||
    currentNode.data?.serverCode ||
    null;

  // Standard Source Code fallback (Checks all possible code properties)
  const standardSourceCode =
    currentNode.data?.content ||
    currentNode.data?.code ||
    currentNode.data?.fileContent ||
    currentNode.data?.codeSnippet ||
    currentNode.data?.implementation ||
    "// No source code content available for this node.";

  // ======================================================
  // CONNECTIONS AGGREGATOR (React Flow Edges + Data Attributes)
  // ======================================================
  const rawConnections = [];

  // 1. Direct React Flow Graph Edges Query
  try {
    const activeEdges = getEdges() || [];
    activeEdges.forEach((edge) => {
      let otherId = null;
      if (edge.source === currentNode.id) otherId = edge.target;
      if (edge.target === currentNode.id) otherId = edge.source;

      if (otherId && otherId !== currentNode.id) {
        const otherNodeObj = getNode(otherId);
        const label =
          otherNodeObj?.data?.label ||
          otherNodeObj?.data?.fileName ||
          otherNodeObj?.data?.fullName ||
          otherNodeObj?.data?.endpointRoute ||
          otherId.split("/").pop() ||
          otherId;

        rawConnections.push({ label, targetId: otherId });
      }
    });
  } catch (err) {
    console.warn("Could not query React Flow edges:", err);
  }

  // 2. Data Attributes Fallback
  (currentNode.data?.imports || []).forEach((imp, idx) => {
    const targetId = currentNode.data?.imports_full?.[idx] || imp;
    rawConnections.push({ label: imp, targetId });
  });

  (currentNode.data?.calls || []).forEach((call) => {
    const label = typeof call === "string" ? call : call.name || call.id;
    const targetId = typeof call === "object" ? call.id : call;
    rawConnections.push({ label, targetId });
  });

  (currentNode.data?.connectedNodes || []).forEach((conn) => {
    const label = conn.label || conn.fileName || conn.id;
    rawConnections.push({ label, targetId: conn.id });
  });

  (currentNode.data?.dependencies || []).forEach((dep) => {
    const label = typeof dep === "string" ? dep : dep.label || dep.id;
    const targetId = typeof dep === "object" ? dep.id : dep;
    rawConnections.push({ label, targetId });
  });

  // De-duplicate connections by targetId
  const uniqueConnections = Array.from(
    new Map(
      rawConnections
        .filter((item) => item.targetId && item.targetId !== currentNode.id)
        .map((item) => [item.targetId, item])
    ).values()
  );

  // Connection Click Handler (Pans graph and pins target node)
  const handleConnectionClick = (targetId) => {
    if (!targetId) return;
    const targetNodeObj = getNode(targetId);

    if (targetNodeObj) {
      const xOffset = 350;
      setCenter(
        targetNodeObj.position.x + xOffset,
        targetNodeObj.position.y,
        { zoom: 1.1, duration: 800 }
      );
      if (setSelectedNode) {
        setSelectedNode(targetNodeObj);
      }
    }
  };

  return (
    <div
      className={`
        absolute top-6 right-6 bottom-6 z-50
        bg-black/95 border rounded-[2.5rem]
        shadow-2xl w-[32rem]
        max-h-[calc(100vh-80px)]
        backdrop-blur-2xl flex flex-col
        overflow-hidden transition-all duration-300
        ${
          selectedNode
            ? "border-cyan-500 border-b-8 ring-4 ring-cyan-500/10"
            : "border-white/20"
        }
      `}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`
              p-2 rounded-lg
              ${
                selectedNode
                  ? "bg-cyan-500 text-black"
                  : "bg-white/10 text-white"
              }
            `}
          >
            <Code2 size={18} />
          </div>

          <div className="flex flex-col max-w-[220px]">
            <span className="text-[9px] font-black text-cyan-500 uppercase tracking-tighter">
              {selectedNode ? "Pinned Node" : "Hover Preview"}
            </span>

            <span className="text-xs font-mono text-white truncate">
              {currentNode.data?.fullName ||
                currentNode.data?.fileName ||
                currentNode.data?.label ||
                currentNode.id}
            </span>
          </div>
        </div>

        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* BODY */}
      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
        {/* AI SUMMARY ANALYSIS */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                AI Structural Analysis
              </p>
            </div>

            <button
              onClick={() => fetchSummary(true)}
              disabled={loading || !selectedNode}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-30"
              title="Regenerate Summary"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-2 bg-white/10 rounded w-3/4"></div>
              <div className="h-2 bg-white/10 rounded w-1/2"></div>
              <div className="h-2 bg-white/10 rounded w-5/6"></div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-400/80 text-[11px] font-medium py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          ) : (
            <div className="text-[12px] leading-relaxed text-cyan-50/90 font-sans">
              <ReactMarkdown>
                {selectedNode
                  ? summary || "Processing AI summary..."
                  : "Click on a node in the graph to pin it and generate an AI code analysis."}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* CODE INSPECTOR SECTION */}
        {isApiNode ? (
          <div className="space-y-4">
            {/* FRONTEND API CALL SNIPPET */}
            {frontendCode && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={13} className="text-cyan-400" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Frontend Invocation:
                  </p>
                </div>
                <pre className="bg-[#050505] p-4 rounded-2xl font-mono text-[11px] text-cyan-100/80 overflow-auto max-h-48 border border-cyan-500/20 custom-scrollbar">
                  {frontendCode}
                </pre>
              </div>
            )}

            {/* BACKEND ROUTE HANDLER SNIPPET */}
            {backendCode && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Server size={13} className="text-rose-400" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Backend Route Handler:
                  </p>
                </div>
                <pre className="bg-[#050505] p-4 rounded-2xl font-mono text-[11px] text-rose-100/80 overflow-auto max-h-48 border border-rose-500/20 custom-scrollbar">
                  {backendCode}
                </pre>
              </div>
            )}

            {/* FALLBACK IF API NODE HAS NO DETAILED SNIPPETS */}
            {!frontendCode && !backendCode && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code2 size={13} className="text-cyan-400" />
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    Endpoint Details:
                  </p>
                </div>
                <pre className="bg-[#050505] p-5 rounded-3xl font-mono text-[11px] text-cyan-100/70 overflow-auto max-h-60 border border-white/5 custom-scrollbar">
                  {standardSourceCode}
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* STANDARD FILE SOURCE CODE SNIPPET (e.g. AllPosts.jsx) */
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 size={13} className="text-cyan-400" />
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                Source Code:
              </p>
            </div>
            <pre className="bg-[#050505] p-5 rounded-3xl font-mono text-[11px] text-cyan-100/70 overflow-auto max-h-60 border border-white/5 custom-scrollbar">
              {standardSourceCode}
            </pre>
          </div>
        )}

        {/* GRAPH CONNECTIONS SECTION */}
        <div className="pb-8">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={13} className="text-gray-400" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Connections ({uniqueConnections.length}):
            </p>
          </div>

          {uniqueConnections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {uniqueConnections.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleConnectionClick(item.targetId)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronRight size={10} className="opacity-50" />
                  <span className="truncate max-w-[200px]">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-gray-600 italic bg-white/5 p-3 rounded-2xl border border-white/5">
              No direct incoming or outgoing graph connections found for this node.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;