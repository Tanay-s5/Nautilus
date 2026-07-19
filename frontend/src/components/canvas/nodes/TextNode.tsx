import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TextNodeData {
  text: string;
  fontSize?: number;
  color?: string;
  onUpdate?: (data: Partial<TextNodeData>) => void;
  onDelete?: () => void;
}

function TextNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TextNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(nodeData.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    nodeData.onUpdate?.({ text: editText });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditText(nodeData.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "min-w-[80px] relative group",
        selected && "ring-2 ring-accent/40 rounded"
      )}
    >
      {selected && (
        <NodeResizer 
          minWidth={80} 
          minHeight={24}
          lineClassName="!border-accent/40"
          handleClassName="!w-2 !h-2 !bg-accent !border-none"
        />
      )}
      
      {/* Delete button */}
      {selected && nodeData.onDelete && (
        <button 
          onClick={nodeData.onDelete}
          className="absolute -top-3 -right-3 p-1 bg-card border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Drag handle */}
      {selected && (
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-3 h-3 text-muted-foreground/60" />
        </div>
      )}
      
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent border-none outline-none resize-none text-foreground leading-snug w-full"
          style={{ 
            fontSize: nodeData.fontSize || 16,
            color: nodeData.color || "inherit"
          }}
          rows={1}
        />
      ) : (
        <p 
          className="cursor-text whitespace-pre-wrap leading-snug select-none"
          style={{ 
            fontSize: nodeData.fontSize || 16,
            color: nodeData.color || "inherit"
          }}
          onDoubleClick={() => setIsEditing(true)}
        >
          {nodeData.text || "Double-click to edit"}
        </p>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}

export const TextNode = memo(TextNodeComponent);
