import { memo, useState, useRef, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Edit2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { NodeHandles } from "./NodeHandles";
import { MarkdownRenderer } from "../MarkdownRenderer";

export interface DocumentCardData {
  title: string;
  subtitle?: string;
  content: string;
  bulletPoints?: string[];
  color?: "green" | "blue" | "purple" | "orange" | "pink" | "mint" | "coral" | "yellow" | "gray";
  onUpdate?: (data: Partial<DocumentCardData>) => void;
  onDelete?: () => void;
}

function DocumentCardComponent({ data, selected }: NodeProps) {
  const cardData = data as unknown as DocumentCardData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(cardData.title || "");
  const [editContent, setEditContent] = useState(cardData.content || "");

  // Resize state
  const [size, setSize] = useState({ width: 340, height: "auto" as number | "auto" });
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const handleSave = useCallback(() => {
    cardData.onUpdate?.({
      title: editTitle,
      content: editContent,
    });
    setIsEditing(false);
  }, [editTitle, editContent, cardData]);

  const handleCancel = useCallback(() => {
    setEditTitle(cardData.title || "");
    setEditContent(cardData.content || "");
    setIsEditing(false);
  }, [cardData]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = typeof size.height === "number" ? size.height : resizeRef.current?.offsetHeight || 200;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(260, Math.min(550, startWidth + deltaX));
      const newHeight = Math.max(120, startHeight + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [size]);

  return (
    <div
      ref={resizeRef}
      className={cn(
        "relative overflow-visible transition-all duration-200 group",
        "bg-card border border-border/60",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      style={{
        width: size.width,
        minHeight: typeof size.height === "number" ? size.height : undefined,
        borderRadius: "var(--node-radius)",
      }}
    >
      {/* 4-sided handles - visible on hover */}
      <NodeHandles />

      <div className="p-4">
        {/* Header with title and actions - title expands fully */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 bg-transparent border-b border-border focus:border-accent outline-none text-base font-semibold"
              placeholder="Title"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="flex-1 font-semibold text-foreground text-base leading-snug">
              {cardData.title || "Untitled"}
            </h3>
          )}

          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-topic-green"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {cardData.onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cardData.onDelete?.();
                    }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content with inline highlights */}
        <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/15 scrollbar-track-transparent">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-muted/30 rounded-md p-2 text-sm resize-none border-none outline-none min-h-[120px]"
              placeholder="Write Markdown with headings, lists, images, and more..."
              rows={6}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <MarkdownRenderer content={cardData.content || ""} className="text-sm" />
          )}
        </div>
      </div>

      {/* Resize handle - nodrag to prevent card movement */}
      <div
        className="nodrag resize-handle bottom-0 right-0"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

export const DocumentCard = memo(DocumentCardComponent);
