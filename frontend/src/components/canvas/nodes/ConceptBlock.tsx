import { memo, useState, useRef, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Edit2, Check, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { NodeHandles } from "./NodeHandles";
import { ColorPalettePicker, NodeColor } from "./ColorPalettePicker";

export interface ConceptBlockData {
  title: string;
  content: string;
  summary?: string;
  color?: NodeColor;
  expanded?: boolean;
  canExpand?: boolean;
  onToggleExpand?: () => void;
  onUpdate?: (data: Partial<ConceptBlockData>) => void;
  onDelete?: () => void;
}

const colorClasses: Record<string, string> = {
  green: "bg-topic-green/10 border-topic-green/30 hover:border-topic-green/50",
  blue: "bg-topic-blue/10 border-topic-blue/30 hover:border-topic-blue/50",
  purple: "bg-topic-purple/10 border-topic-purple/30 hover:border-topic-purple/50",
  orange: "bg-topic-orange/10 border-topic-orange/30 hover:border-topic-orange/50",
  pink: "bg-topic-pink/10 border-topic-pink/30 hover:border-topic-pink/50",
  mint: "bg-topic-mint/10 border-topic-mint/30 hover:border-topic-mint/50",
  coral: "bg-topic-coral/10 border-topic-coral/30 hover:border-topic-coral/50",
  yellow: "bg-topic-yellow/10 border-topic-yellow/30 hover:border-topic-yellow/50",
  red: "bg-red-500/10 border-red-500/30 hover:border-red-500/50",
  gray: "bg-gray-500/10 border-gray-500/30 hover:border-gray-500/50",
};

const dotClasses: Record<string, string> = {
  green: "bg-topic-green",
  blue: "bg-topic-blue",
  purple: "bg-topic-purple",
  orange: "bg-topic-orange",
  pink: "bg-topic-pink",
  mint: "bg-topic-mint",
  coral: "bg-topic-coral",
  yellow: "bg-topic-yellow",
  red: "bg-red-500",
  gray: "bg-gray-500",
};

function ConceptBlockComponent({ data, selected }: NodeProps) {
  const blockData = data as unknown as ConceptBlockData;
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editTitle, setEditTitle] = useState(blockData.title);
  const [editContent, setEditContent] = useState(blockData.content);
  const [editColor, setEditColor] = useState<NodeColor>(blockData.color || "blue");
  const [size, setSize] = useState({ width: 340, height: "auto" as number | "auto" });
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const color = blockData.color || "blue";
  const isExpanded = Boolean(blockData.expanded);
  const canExpand =
    blockData.canExpand ??
    (blockData.content.length > 220 ||
      blockData.content.split("\n").filter((line) => line.trim()).length > 5);

  const handleSave = () => {
    blockData.onUpdate?.({ title: editTitle, content: editContent, color: editColor });
    setIsEditing(false);
    setShowColorPicker(false);
  };

  const handleColorChange = useCallback(
    (newColor: NodeColor) => {
      setEditColor(newColor);
      if (!isEditing) blockData.onUpdate?.({ color: newColor });
      setShowColorPicker(false);
    },
    [isEditing, blockData]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = size.width;
      const startHeight = typeof size.height === "number" ? size.height : resizeRef.current?.offsetHeight || 200;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        setSize({
          width: Math.max(240, Math.min(800, startWidth + (moveEvent.clientX - startX))),
          height: Math.max(100, startHeight + (moveEvent.clientY - startY)),
        });
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [size]
  );

  return (
    <div
      ref={resizeRef}
      className={cn(
        "border-2 transition-all duration-200 group relative overflow-visible",
        colorClasses[color],
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      style={{
        width: size.width,
        minHeight: typeof size.height === "number" ? size.height : undefined,
        borderRadius: "var(--node-radius)",
      }}
    >
      <NodeHandles />

      <div className="overflow-hidden" style={{ borderRadius: "var(--node-radius)" }}>
        <div className="flex items-center gap-2 p-3 cursor-pointer" onDoubleClick={() => setIsEditing(true)}>
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotClasses[color])} />
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-foreground"
              autoFocus
            />
          ) : (
            <h4 className="flex-1 text-sm font-semibold text-foreground leading-snug">{blockData.title}</h4>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {canExpand && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  blockData.onToggleExpand?.();
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                title={isExpanded ? "Collapse card" : "Expand card"}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <Palette className="w-3 h-3" />
              </button>
              <ColorPalettePicker
                isOpen={showColorPicker}
                currentColor={isEditing ? editColor : color}
                onSelect={handleColorChange}
                className="right-0 top-8"
              />
            </div>

            {isEditing ? (
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-1 hover:bg-white/20 rounded transition-colors">
                <Check className="w-3.5 h-3.5 text-topic-green" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            {blockData.onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  blockData.onDelete?.();
                }}
                className="p-1 hover:bg-destructive/20 rounded transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 pb-3 pt-0 border-t border-border/30">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white/10 rounded-md p-2 text-sm resize-none border-none outline-none min-h-[80px] mt-2"
              rows={4}
              placeholder="Add content (supports Markdown)..."
            />
          ) : (
            <>
              <div
                className={cn(
                  "cursor-text text-foreground/80 mt-2 relative",
                  canExpand && !isExpanded && "max-h-[150px] overflow-hidden"
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <MarkdownRenderer content={blockData.content} className="text-sm" />
                {canExpand && !isExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/90 to-transparent" />
                )}
              </div>

              {canExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    blockData.onToggleExpand?.();
                  }}
                  className="mt-2 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
                >
                  {isExpanded ? "Collapse" : "Expand card"}
                </button>
              )}
            </>
          )}

          {blockData.summary && !isEditing && (
            <p className="text-[10px] text-muted-foreground/60 italic mt-2 pt-2 border-t border-border/20">
              {blockData.summary}
            </p>
          )}
        </div>
      </div>

      <div className="nodrag resize-handle bottom-0 right-0" onMouseDown={handleResizeStart} />
    </div>
  );
}

export const ConceptBlock = memo(ConceptBlockComponent);
