import React, { useState, useRef, memo, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { ChevronDown, ChevronUp, Edit2, Trash2, Check, X, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NodeHandles } from "./NodeHandles";
import { ColorPalettePicker, NodeColor } from "./ColorPalettePicker";

export interface KnowledgeNodeData {
  title: string;
  summary: string;
  content: string;
  color?: NodeColor;
  onUpdate?: (data: Partial<KnowledgeNodeData>) => void;
  onDelete?: () => void;
}

const colorClasses: Record<string, { bg: string; border: string; accent: string; dot: string; header: string }> = {
  red: { bg: "bg-red-500/5", border: "border-red-500/30", accent: "bg-red-500", dot: "bg-red-500", header: "bg-gradient-to-r from-red-500 to-red-400" },
  blue: { bg: "bg-topic-blue/5", border: "border-topic-blue/30", accent: "bg-topic-blue", dot: "bg-topic-blue", header: "bg-gradient-to-r from-blue-500 to-blue-400" },
  green: { bg: "bg-topic-green/5", border: "border-topic-green/30", accent: "bg-topic-green", dot: "bg-topic-green", header: "bg-gradient-to-r from-green-500 to-green-400" },
  purple: { bg: "bg-topic-purple/5", border: "border-topic-purple/30", accent: "bg-topic-purple", dot: "bg-topic-purple", header: "bg-gradient-to-r from-purple-500 to-purple-400" },
  orange: { bg: "bg-topic-orange/5", border: "border-topic-orange/30", accent: "bg-topic-orange", dot: "bg-topic-orange", header: "bg-gradient-to-r from-orange-500 to-orange-400" },
  pink: { bg: "bg-topic-pink/5", border: "border-topic-pink/30", accent: "bg-topic-pink", dot: "bg-topic-pink", header: "bg-gradient-to-r from-pink-500 to-pink-400" },
  mint: { bg: "bg-topic-mint/5", border: "border-topic-mint/30", accent: "bg-topic-mint", dot: "bg-topic-mint", header: "bg-gradient-to-r from-teal-500 to-teal-400" },
  coral: { bg: "bg-topic-coral/5", border: "border-topic-coral/30", accent: "bg-topic-coral", dot: "bg-topic-coral", header: "bg-gradient-to-r from-rose-500 to-rose-400" },
  yellow: { bg: "bg-topic-yellow/5", border: "border-topic-yellow/30", accent: "bg-topic-yellow", dot: "bg-topic-yellow", header: "bg-gradient-to-r from-yellow-500 to-yellow-400" },
  gray: { bg: "bg-gray-500/5", border: "border-gray-500/30", accent: "bg-gray-500", dot: "bg-gray-500", header: "bg-gradient-to-r from-gray-600 to-gray-500" },
};

function KnowledgeNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as KnowledgeNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editTitle, setEditTitle] = useState(nodeData.title || "");
  const [editSummary, setEditSummary] = useState(nodeData.summary || "");
  const [editContent, setEditContent] = useState(nodeData.content || "");
  const [editColor, setEditColor] = useState<NodeColor>(nodeData.color || "red");
  
  const [size, setSize] = useState({ width: 340, height: "auto" as number | "auto" });
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const color = (nodeData.color || "red") as NodeColor;
  const colors = colorClasses[color] || colorClasses.red;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) setIsExpanded(!isExpanded);
  }, [isExpanded, isEditing]);

  const handleSave = useCallback(() => {
    nodeData.onUpdate?.({ title: editTitle, summary: editSummary, content: editContent, color: editColor });
    setIsEditing(false);
    setShowColorPicker(false);
  }, [editTitle, editSummary, editContent, editColor, nodeData]);

  const handleCancel = useCallback(() => {
    setEditTitle(nodeData.title || "");
    setEditSummary(nodeData.summary || "");
    setEditContent(nodeData.content || "");
    setEditColor(nodeData.color || "red");
    setIsEditing(false);
    setShowColorPicker(false);
  }, [nodeData]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX, startY = e.clientY, startWidth = size.width;
    const startHeight = typeof size.height === 'number' ? size.height : resizeRef.current?.offsetHeight || 200;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      setSize({
        width: Math.max(280, Math.min(600, startWidth + (moveEvent.clientX - startX))),
        height: Math.max(150, startHeight + (moveEvent.clientY - startY)),
      });
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [size]);

  const handleColorChange = useCallback((newColor: NodeColor) => {
    setEditColor(newColor);
    if (!isEditing) nodeData.onUpdate?.({ color: newColor });
    setShowColorPicker(false);
  }, [isEditing, nodeData]);

  return (
    <div
      ref={resizeRef}
      onDoubleClick={handleDoubleClick}
      className={cn("relative overflow-visible transition-all duration-200 group", "bg-card/95 backdrop-blur-xl border border-border/60")}
      style={{
        width: size.width,
        minHeight: typeof size.height === 'number' ? size.height : undefined,
        borderRadius: "var(--node-radius)",
        boxShadow: selected
          ? "0 8px 24px -4px hsl(var(--accent) / 0.12), 0 4px 12px -2px hsl(0 0% 0% / 0.06)"
          : "0 2px 8px -2px hsl(0 0% 0% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.03)",
      }}
    >
      <NodeHandles />

      <div className="overflow-hidden" style={{ borderRadius: "var(--node-radius)" }}>
        <div className={cn("h-12 flex items-center justify-between px-4", colors.header)}>
          {isEditing ? (
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 bg-white/20 border border-white/30 rounded-md px-2 py-1 text-sm font-semibold text-white placeholder-white/60 focus:outline-none"
              placeholder="Title" onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="font-semibold text-white text-sm leading-tight flex-1">{nodeData.title || "Untitled"}</h3>
          )}
          
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
              className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-white/80 hover:text-white ml-2"
            >
              <Palette className="w-4 h-4" />
            </button>
            <ColorPalettePicker
              isOpen={showColorPicker}
              currentColor={isEditing ? editColor : color}
              onSelect={handleColorChange}
              className="right-0 top-10"
            />
          </div>
          
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className={cn("p-4", colors.bg)}>
          {isEditing ? (
            <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none resize-none"
              placeholder="Brief summary..." rows={2} onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.summary || "Double-click to expand"}</p>
          )}
          {!isExpanded && !isEditing && (
            <p className="text-[10px] text-muted-foreground/60 mt-2 text-center italic">Double-click to expand</p>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="border-t border-border/50">
                {isEditing ? (
                  <div className="p-4">
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none resize-none min-h-[200px]"
                      placeholder="Detailed content with **markdown** support..." onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div className="p-4 max-h-[400px] overflow-y-auto">
                    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownRenderer content={nodeData.content || "*No detailed content yet*"} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 px-4 pb-3 border-t border-border/30 pt-3">
                  {isEditing ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleSave(); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
                        <Check className="w-3 h-3" /> Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/50 text-muted-foreground transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      {nodeData.onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); nodeData.onDelete?.(); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="nodrag resize-handle bottom-0 right-0" onMouseDown={handleResizeStart} />
    </div>
  );
}

export const KnowledgeNode = memo(KnowledgeNodeComponent);
