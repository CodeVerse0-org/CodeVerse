import React, {
  useState,
  useEffect
} from "react";

import {
  Code2,
  X,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { useReactFlow } from "@xyflow/react";

import axios from "axios";

import ReactMarkdown from "react-markdown";

// Dynamically uses environment variable when deployed, defaults to local during dev
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const NodeDetailPanel = ({
  activeNode,
  selectedNode,
  setSelectedNode
}) => {

  const {
    getNode,
    setCenter
  } = useReactFlow();

  const [summary, setSummary] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);


  // ======================================================
  // FETCH SUMMARY - Updated to trigger ONLY on selectedNode
  // ======================================================

  useEffect(() => {
    // Only trigger the request if the node is actually selected (clicked)
    if (selectedNode) {
      setSummary("");
      setError(null);
      fetchSummary(false);
    } else {
      // If no node is selected (just hovering), clear the previous summary
      setSummary("");
      setError(null);
    }
  }, [selectedNode?.id]); // Depend on selectedNode.id instead of activeNode.id


  const fetchSummary = async (
    isRegenerate = false
  ) => {

    // Ensure we are fetching for the selectedNode
    if (!selectedNode) return;

    setLoading(true);

    setError(null);

    try {

      const token =
        localStorage.getItem("token");

      if (!token) {

        setError(
          "Please log in to view AI summaries."
        );

        setLoading(false);

        return;
      }


      // ✅ SAFE CONTENT PICK using selectedNode
      const fileContent =
        selectedNode?.data?.content ||
        selectedNode?.data?.code ||
        selectedNode?.data?.codeSnippet ||
        selectedNode?.data?.implementation ||
        selectedNode?.data?.fileContent ||
        "// Source code not available";


      const response = await axios.post(

        `${API_BASE_URL}/api/summaries/process`,

        {
          file_path: selectedNode.id,
          file_content: fileContent,
          node_type: selectedNode.data.category || "file", // ✅ Pass the node type to the backend
          regenerate: isRegenerate
        },

        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }

      );

      setSummary(
        response.data.summary || ""
      );

    }

    catch (error) {

      console.error(
        "Error fetching summary:",
        error
      );

      const msg =

        error.response?.status === 503

          ? "AI is busy. Please try again shortly."

          : "Failed to generate summary.";

      setError(msg);

    }

    finally {

      setLoading(false);

    }

  };


  if (!activeNode) return null;


  // ======================================================
  // CONNECTION CLICK
  // ======================================================

  const handleConnectionClick = (
    targetId
  ) => {

    const targetNode =
      getNode(targetId);

    if (targetNode) {

      const xOffset = 350;

      setCenter(

        targetNode.position.x + xOffset,

        targetNode.position.y,

        {
          zoom: 1.1,
          duration: 800
        }

      );

    }

  };


  // ======================================================
  // UI
  // ======================================================

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

          <div className="flex flex-col max-w-[200px]">

            <span className="text-[9px] font-black text-cyan-500 uppercase tracking-tighter">

              {selectedNode
                ? "Pinned"
                : "Preview"}

            </span>

            <span className="text-xs font-mono text-white truncate">

              {activeNode.data.fullName}

            </span>

          </div>

        </div>


        {selectedNode && (

          <button
            onClick={() =>
              setSelectedNode(null)
            }
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >

            <X size={20} />

          </button>

        )}

      </div>


      {/* BODY */}

      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">


        {/* AI SECTION */}

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">

          <div className="flex items-center justify-between mb-4">

            <div className="flex items-center gap-2">

              <Sparkles
                size={14}
                className="text-cyan-400"
              />

              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">

                AI Analysis:

              </p>

            </div>


            <button
              onClick={() =>
                fetchSummary(true)
              }
              disabled={loading || !selectedNode}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-30"
            >

              <RefreshCw
                size={14}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

            </button>

          </div>


          {/* LOADING */}

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

                {
                  selectedNode 
                    ? (summary || "Processing AI summary...") 
                    : "Select a node to view AI analysis."
                }

              </ReactMarkdown>

            </div>

          )}

        </div>


        {/* SOURCE CODE */}

        <div>

          <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">

            Source Code:

          </p>

          <pre className="bg-[#050505] p-5 rounded-3xl font-mono text-[11px] text-cyan-100/70 overflow-auto max-h-60 border border-white/5 custom-scrollbar">

            {
              activeNode?.data?.content ||
              activeNode?.data?.code ||
              activeNode?.data?.codeSnippet ||
              activeNode?.data?.implementation ||
              activeNode?.data?.fileContent ||
              "// No source code available"
            }

          </pre>

        </div>


        {/* CONNECTIONS */}

        <div className="pb-8">

          <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">

            Connections:

          </p>

          <div className="flex flex-wrap gap-2">

            {(activeNode.data.imports || []).map(
              (imp, i) => {

                const targetId =
                  activeNode.data.imports_full?.[i];

                return (

                  <button
                    key={i}
                    onClick={() =>
                      handleConnectionClick(targetId)
                    }
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-cyan-400 flex items-center gap-1 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-white transition-all cursor-pointer"
                  >

                    <ChevronRight
                      size={10}
                      className="opacity-50"
                    />

                    {imp}

                  </button>

                );

              }
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default NodeDetailPanel;