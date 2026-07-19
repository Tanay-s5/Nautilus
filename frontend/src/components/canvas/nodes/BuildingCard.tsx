import { memo, useState, useRef, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Edit2, Check, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { NodeHandles } from "./NodeHandles";
import { MarkdownRenderer } from "../MarkdownRenderer";

export interface BuildingCardData {
  title: string;
  summary: string[];
  detailed: string;
  color?: "green" | "blue" | "purple" | "orange" | "pink" | "mint" | "coral" | "yellow" | "red";
  icon?: string;
  linking?: {
    applications: string[];
    analogy: string;
    corePrinciples: string[];
    mechanism: string;
    examples: string[];
    misconceptions: string[];
    formalStructure: string[];
  };
  onUpdate?: (data: Partial<BuildingCardData>) => void;
  onDelete?: () => void;
}

const borderColorClasses: Record<string, string> = {
  green: "border-l-topic-green",
  blue: "border-l-topic-blue",
  purple: "border-l-topic-purple",
  orange: "border-l-topic-orange",
  pink: "border-l-topic-pink",
  mint: "border-l-topic-mint",
  coral: "border-l-topic-coral",
  yellow: "border-l-topic-yellow",
  red: "border-l-red-500",
};

const highlightColorClasses: Record<string, string> = {
  green: "text-topic-green",
  blue: "text-topic-blue",
  purple: "text-topic-purple",
  orange: "text-topic-orange",
  pink: "text-topic-pink",
  mint: "text-topic-mint",
  coral: "text-topic-coral",
  yellow: "text-topic-yellow",
  red: "text-red-500",
};

const markerColorClasses: Record<string, string> = {
  green: "marker:text-topic-green",
  blue: "marker:text-topic-blue",
  purple: "marker:text-topic-purple",
  orange: "marker:text-topic-orange",
  pink: "marker:text-topic-pink",
  mint: "marker:text-topic-mint",
  coral: "marker:text-topic-coral",
  yellow: "marker:text-topic-yellow",
  red: "marker:text-red-500",
};

const pickerColors: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f97316",
  pink: "#ec4899",
  mint: "#2dd4bf",
  coral: "#fb7185",
  yellow: "#facc15",
  red: "#ef4444",
};

const colorOptions = [
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
  { value: "mint", label: "Mint" },
  { value: "coral", label: "Coral" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
];

function BuildingCardComponent({ data, selected }: NodeProps) {
  const cardData = data as unknown as BuildingCardData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editTitle, setEditTitle] = useState(cardData.title);
  const [editSummary, setEditSummary] = useState(cardData.summary.join("\n"));
  const [editDetailed, setEditDetailed] = useState(cardData.detailed);

  // Resize state
  const [width, setWidth] = useState(360);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const color = cardData.color || "blue";
  const icon = cardData.icon || "bx-bulb";

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsExpanded(prev => !prev);
    }
  }, [isEditing]);

  const handleColorChange = useCallback((newColor: string) => {
    cardData.onUpdate?.({ color: newColor as BuildingCardData["color"] });
    setShowColorPicker(false);
  }, [cardData]);

  const handleSave = useCallback(() => {
    cardData.onUpdate?.({
      title: editTitle,
      summary: editSummary.split("\n").filter(k => k.trim()),
      detailed: editDetailed,
    });
    setIsEditing(false);
  }, [cardData, editTitle, editSummary, editDetailed]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      setWidth(Math.max(300, Math.min(600, startWidth + (moveEvent.clientX - startX))));
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);

  return (
    <div
      ref={resizeRef}
      style={{ width, borderRadius: "var(--node-radius)" }}
      className={cn(
        "bg-card border-l-4 shadow-md transition-all duration-200 group relative",
        borderColorClasses[color],
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
        isExpanded && "z-50"
      )}
      onDoubleClick={handleDoubleClick}
    >
      <NodeHandles />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {isEditing ? (
            <textarea
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
              className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-foreground resize-none"
              rows={2}
              autoFocus
            />
          ) : (
            <h3 className="flex-1 text-lg font-bold text-foreground/90 leading-snug flex items-start gap-2">
              <span className={cn("shrink-0", highlightColorClasses[color])}>
                <i className={`bx ${icon} text-xl`}></i>
              </span>
              <span>{cardData.title}</span>
            </h3>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {/* Color picker */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-8 z-50 p-3 bg-card border border-border rounded-xl shadow-xl w-44"
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                  >
                    <p className="text-xs text-muted-foreground mb-2">Colors</p>
                    <div className="grid grid-cols-3 gap-2">
                      {colorOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleColorChange(opt.value)}
                          className="w-8 h-8 rounded-full transition-transform hover:scale-110 border border-border/20"
                          title={opt.label}
                          style={{ backgroundColor: pickerColors[opt.value] }}
                        >
                          {color === opt.value && (
                            <span className="flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isEditing ? (
              <button
                onClick={e => { e.stopPropagation(); handleSave(); }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-topic-green" />
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            {cardData.onDelete && (
              <button
                onClick={e => { e.stopPropagation(); cardData.onDelete?.(); }}
                className="p-1 hover:bg-destructive/20 rounded transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Summary bullets */}
        {isEditing ? (
          <textarea
            value={editSummary}
            onChange={e => setEditSummary(e.target.value)}
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            className="w-full bg-muted/30 rounded-lg p-3 text-sm resize-none border-none outline-none min-h-[80px] mb-2"
            rows={4}
            placeholder="Summary points (one per line)..."
          />
        ) : (
          <ul className={cn("space-y-1.5 list-disc pl-5", markerColorClasses[color])}>
            {cardData.summary.map((point, idx) => (
              <li key={idx} className="text-[14px] text-foreground/80 leading-relaxed">
                <MarkdownRenderer content={point} className="inline text-[14px]" />
              </li>
            ))}
          </ul>
        )}

        {/* Expand/collapse indicator */}
        {!isEditing && cardData.detailed && (
          <div className="flex items-center justify-center pt-3 mt-3 border-t border-border/30">
            <button
              onClick={e => { e.stopPropagation(); setIsExpanded(prev => !prev); }}
              onDoubleClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{isExpanded ? "Collapse" : "Double-click to expand"}</span>
            </button>
          </div>
        )}

        {/* Expanded detailed content */}
        <AnimatePresence>
          {isExpanded && !isEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 border-t border-border/40">
                <MarkdownRenderer content={cardData.detailed} className="text-sm" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit detailed content */}
        {isEditing && (
          <div className="mt-2">
            <label className="text-xs text-muted-foreground mb-1 block">Detailed Explanation</label>
            <textarea
              value={editDetailed}
              onChange={e => setEditDetailed(e.target.value)}
              onClick={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
              className="w-full bg-muted/30 rounded-lg p-3 text-sm resize-none border-none outline-none min-h-[120px]"
              rows={6}
              placeholder="Detailed markdown explanation..."
            />
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="nodrag resize-handle bottom-0 right-0"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

export const BuildingCard = memo(BuildingCardComponent);
