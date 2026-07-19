import { memo, useState, useRef, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Edit2, Check, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { NodeHandles } from "./NodeHandles";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { ColorPalettePicker, NodeColor } from "./ColorPalettePicker";

export interface TopicCardData {
  title: string;
  keypoints: string[];
  color?: NodeColor;
  icon?: string;
  expanded?: boolean;
  canExpand?: boolean;
  onToggleExpand?: () => void;
  onUpdate?: (data: Partial<TopicCardData>) => void;
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
  gray: "border-l-gray-500",
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
  gray: "text-gray-500",
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
  gray: "marker:text-gray-500",
};

const defaultIcons = [
  "bx-bulb",
  "bx-book",
  "bx-code",
  "bx-data",
  "bx-globe",
  "bx-rocket",
  "bx-star",
  "bx-target-lock",
  "bx-brain",
  "bx-chip",
  "bx-cog",
  "bx-calendar",
  "bx-check-shield",
  "bx-trending-up",
  "bx-pie-chart-alt-2",
];

function TopicCardComponent({ data, selected }: NodeProps) {
  const cardData = data as unknown as TopicCardData;
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editTitle, setEditTitle] = useState(cardData.title);
  const [editKeypoints, setEditKeypoints] = useState(cardData.keypoints.join("\n"));
  const [size, setSize] = useState({ width: 340, height: "auto" as number | "auto" });
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const color = (cardData.color || "green") as NodeColor;
  const icon = cardData.icon || "bx-bulb";
  const isExpanded = Boolean(cardData.expanded);
  const canExpand =
    cardData.canExpand ??
    (cardData.keypoints.length > 4 ||
      cardData.keypoints.some((point) => point.length > 100));
  const visibleKeypoints = canExpand && !isExpanded ? cardData.keypoints.slice(0, 4) : cardData.keypoints;

  const handleColorChange = useCallback(
    (newColor: NodeColor) => {
      cardData.onUpdate?.({ color: newColor });
      setShowColorPicker(false);
    },
    [cardData]
  );

  const handleIconChange = useCallback(
    (newIcon: string) => {
      cardData.onUpdate?.({ icon: newIcon });
      setShowIconPicker(false);
    },
    [cardData]
  );

  const handleSave = () => {
    cardData.onUpdate?.({
      title: editTitle,
      keypoints: editKeypoints.split("\n").filter((keypoint) => keypoint.trim()),
    });
    setIsEditing(false);
  };

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
          width: Math.max(280, Math.min(550, startWidth + (moveEvent.clientX - startX))),
          height: Math.max(120, startHeight + (moveEvent.clientY - startY)),
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
      style={{
        width: size.width,
        minHeight: typeof size.height === "number" ? size.height : undefined,
        borderRadius: "var(--node-radius)",
      }}
      className={cn(
        "bg-card border-l-4 shadow-md transition-all duration-200 group relative",
        borderColorClasses[color],
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
    >
      <NodeHandles />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          {isEditing ? (
            <textarea
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-foreground resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <h3 className="flex-1 text-xl font-bold text-foreground/90 leading-snug cursor-text flex items-start gap-2" onDoubleClick={() => setIsEditing(true)}>
              <span className={cn("shrink-0", highlightColorClasses[color])}>
                <i className={`bx ${icon} text-2xl`}></i>
              </span>
              <span>{cardData.title}</span>
            </h3>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {canExpand && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cardData.onToggleExpand?.();
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                title={isExpanded ? "Collapse card" : "Expand card"}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIconPicker(!showIconPicker);
                  setShowColorPicker(false);
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                title="Change icon"
              >
                <i className="bx bx-customize w-3.5 h-3.5"></i>
              </button>
              <AnimatePresence>
                {showIconPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-8 z-50 p-3 bg-card border border-border rounded-xl shadow-xl w-56"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-muted-foreground mb-2">Select Icon</p>
                    <div className="grid grid-cols-5 gap-2">
                      {defaultIcons.map((iconName) => (
                        <button
                          key={iconName}
                          onClick={() => handleIconChange(iconName)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-muted",
                            icon === iconName && "bg-accent text-accent-foreground ring-2 ring-accent"
                          )}
                          title={iconName}
                        >
                          <i className={`bx ${iconName} text-lg`}></i>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                  setShowIconPicker(false);
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                title="Change color"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <ColorPalettePicker
                isOpen={showColorPicker}
                currentColor={color}
                onSelect={handleColorChange}
                className="right-0 top-8"
              />
            </div>

            {isEditing ? (
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-1 hover:bg-muted rounded transition-colors">
                <Check className="w-3.5 h-3.5 text-topic-green" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            {cardData.onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cardData.onDelete?.();
                }}
                className="p-1 hover:bg-destructive/20 rounded transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editKeypoints}
            onChange={(e) => setEditKeypoints(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-muted/30 rounded-lg p-3 text-sm resize-none border-none outline-none min-h-[120px]"
            rows={5}
            placeholder="Enter keypoints (one per line)..."
          />
        ) : (
          <>
            <ul className={cn("space-y-2.5 list-disc pl-5", markerColorClasses[color])}>
              {visibleKeypoints.map((point, idx) => (
                <li key={`${idx}-${point.slice(0, 20)}`} className="text-[15px] text-foreground/85 leading-relaxed">
                  <MarkdownRenderer content={point} className="inline text-[15px]" />
                </li>
              ))}
            </ul>

            {canExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cardData.onToggleExpand?.();
                }}
                className="mt-3 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
              >
                {isExpanded ? "Collapse" : `Expand card${cardData.keypoints.length > visibleKeypoints.length ? ` (+${cardData.keypoints.length - visibleKeypoints.length} more)` : ""}`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="nodrag resize-handle bottom-0 right-0" onMouseDown={handleResizeStart} />
    </div>
  );
}

export const TopicCard = memo(TopicCardComponent);
