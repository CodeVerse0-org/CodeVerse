import React from "react";
import { Code2, X, ChevronRight } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

const NodeDetailPanel = ({ activeNode, selectedNode, setSelectedNode }) => {
  const { getNode, setCenter } = useReactFlow();

  if (!activeNode) return null;

  const handleConnectionClick = (targetId) => {
    const targetNode = getNode(targetId);
    if (targetNode) {
      const xOffset = 350; 
      setCenter(targetNode.position.x + xOffset, targetNode.position.y, { 
        zoom: 1.1, 
        duration: 800 
      });
    }
  };

  return (
    <div className={`absolute top-6 right-6 bottom-6 z-50 bg-black/95 border rounded-[2.5rem] shadow-2xl w-[32rem] max-h-[calc(100vh-80px)] backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-300 ${
      selectedNode ? 'border-cyan-500 border-b-8 ring-4 ring-cyan-500/10' : 'border-white/20'
    }`}>
      <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${selectedNode ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
            <Code2 size={18} />
          </div>
          <div className="flex flex-col max-w-[200px]">
            <span className="text-[9px] font-black text-cyan-500 uppercase tracking-tighter">{selectedNode ? 'Pinned' : 'Preview'}</span>
            <span className="text-xs font-mono text-white truncate">{activeNode.data.fullName}</span>
          </div>
        </div>
        {selectedNode && (
          <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Panel Scrollbar */}
      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
        <div>
          <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Source Code:</p>
          {/* Code Block Scrollbar */}
          <pre className="bg-[#050505] p-5 rounded-3xl font-mono text-[11px] text-cyan-100/70 overflow-auto max-h-60 border border-white/5 custom-scrollbar">
            {activeNode.data.codeSnippet}
          </pre>
        </div>

        <div className="pb-8">
          <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Connections:</p>
          <div className="flex flex-wrap gap-2">
            {activeNode.data.imports.map((imp, i) => {
              const targetId = activeNode.data.imports_full?.[i];
              return (
                <button 
                  key={i} 
                  onClick={() => handleConnectionClick(targetId)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-cyan-400 flex items-center gap-1 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <ChevronRight size={10} className="opacity-50" /> {imp}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;