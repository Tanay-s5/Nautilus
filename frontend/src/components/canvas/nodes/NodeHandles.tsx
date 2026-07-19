import { Handle, Position } from "@xyflow/react";

interface NodeHandlesProps {
  showOnHover?: boolean;
}

export function NodeHandles({ showOnHover = true }: NodeHandlesProps) {
  return (
    <>
      {/* Top */}
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      {/* Bottom */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      {/* Left */}
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      {/* Right */}
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </>
  );
}
