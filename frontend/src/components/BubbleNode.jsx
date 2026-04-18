import React from "react";
import { Handle, Position } from "@xyflow/react";

const BubbleNode = ({ data }) => {

  const isBackend = data.category === "backend";
  const isFunction = data.category === "function";

  const mainColor = isFunction
    ? "#22d3ee"
    : isBackend
    ? "#fb7185"
    : "#22d3ee";

  return (
    <div className="bubble-node-container">

      {/* TARGET HANDLE (incoming edge) */}
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle"
        style={{
          background: mainColor,
          boxShadow: `0 0 10px ${mainColor}`
        }}
      />

      {/* MAIN NODE */}
      <div
        className="bouncy-sphere"
        style={{
          borderColor: `${mainColor}aa`,
          background: `radial-gradient(circle at 30% 30%, ${mainColor}44, ${mainColor}05 80%)`,
          boxShadow: `0 0 35px ${mainColor}33, inset 0 0 20px ${mainColor}44`,
        }}
      >

        {/* SHINE EFFECT */}
        <div className="sphere-shine" />

        <div className="bubble-content">

          <span
            className="category-tag"
            style={{
              color: mainColor,
              textShadow: `0 0 8px ${mainColor}`
            }}
          >
            {data.category}
          </span>

          <span className="file-name">
            {data.label}
          </span>

        </div>
      </div>

      {/* SOURCE HANDLE (outgoing edge) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle"
        style={{
          background: mainColor,
          boxShadow: `0 0 10px ${mainColor}`
        }}
      />

    </div>
  );
};

export default BubbleNode;