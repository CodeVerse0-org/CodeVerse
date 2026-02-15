
import React from "react";
import { Handle, Position } from "@xyflow/react";

const BubbleNode = ({ data }) => {
  const isBackend = data.category === 'backend';
  const mainColor = isBackend ? '#fb7185' : '#22d3ee';

  return (
    <div className="bubble-node-container">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="custom-handle"
        style={{ background: mainColor, boxShadow: `0 0 10px ${mainColor}` }} 
      />
      
      <div 
        className="bouncy-sphere"
        style={{ 
          borderColor: `${mainColor}aa`,
          background: `radial-gradient(circle at 30% 30%, ${mainColor}44, ${mainColor}05 80%)`,
          boxShadow: `0 0 30px ${mainColor}22, inset 0 0 20px ${mainColor}33`,
        }}
      >
        <div className="sphere-shine" />

        {/* RESTORED ORIGINAL TEXT STRUCTURE */}
        <div className="bubble-content">
          <span className="category-tag" style={{ color: mainColor }}>{data.category}</span>
          <span className="file-name">{data.label}</span>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="custom-handle"
        style={{ background: mainColor, boxShadow: `0 0 10px ${mainColor}` }} 
      />
    </div>
  );
};

export default BubbleNode;
