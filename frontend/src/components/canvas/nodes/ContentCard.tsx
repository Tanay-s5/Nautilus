import { memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { NodeHandles } from "./NodeHandles";

export interface ContentCardData {
  title: string;
  content: string;
  highlights?: Array<{
    text: string;
    color: "green" | "orange" | "blue" | "yellow";
  }>;
  source?: string;
  onUpdate?: (data: Partial<ContentCardData>) => void;
  onDelete?: () => void;
}

function ContentCardComponent({
  data,
  selected
}: NodeProps) {
  const cardData = data as unknown as ContentCardData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(cardData.title);
  const [editContent, setEditContent] = useState(cardData.content);

  const handleSave = () => {
    cardData.onUpdate?.({
      title: editTitle,
      content: editContent
    });
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "relative w-[260px] bg-card transition-all duration-150 overflow-visible group",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      style={{ borderRadius: "var(--node-radius)" }}
    >
      {/* 4-sided handles - visible on hover */}
      <NodeHandles />

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold"
                autoFocus
              />
            ) : (
              <h4
                className="text-sm font-semibold text-foreground cursor-text leading-snug"
                onDoubleClick={() => setIsEditing(true)}
              >
                {cardData.title}
              </h4>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {isEditing ? (
              <button
                onClick={handleSave}
                className="p-1 hover:bg-muted/60 rounded transition-colors"
              >
                <Check className="w-3 h-3 text-topic-green" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-muted/60 rounded transition-colors text-muted-foreground opacity-50 hover:opacity-100"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            {cardData.onDelete && (
              <button
                onClick={cardData.onDelete}
                className="p-1 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-muted/30 rounded-md p-2 text-sm resize-none border-none outline-none min-h-[80px]"
            rows={4}
            placeholder="Add content (supports Markdown)..."
          />
        ) : (
          <div className="cursor-text text-foreground/80" onDoubleClick={() => setIsEditing(true)}>
            <MarkdownRenderer content={cardData.content} className="text-sm" />
          </div>
        )}

        {cardData.source && (
          <p className="text-[10px] text-muted-foreground/50 italic pt-1">— {cardData.source}</p>
        )}
      </div>
    </div>
  );
}

export const ContentCard = memo(ContentCardComponent);
