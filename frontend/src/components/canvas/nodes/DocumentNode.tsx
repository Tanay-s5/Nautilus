import { memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { FileText, PlayCircle, X, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeHandles } from "./NodeHandles";

export interface DocumentNodeData {
  title: string;
  type: "pdf" | "video" | "article" | "book";
  thumbnail?: string;
  author?: string;
  pages?: number;
  onUpdate?: (data: Partial<DocumentNodeData>) => void;
  onDelete?: () => void;
}

const typeIcons = {
  pdf: FileText,
  video: PlayCircle,
  article: FileText,
  book: FileText,
};

const typeColors = {
  pdf: "bg-topic-coral/10 border-topic-coral/20",
  video: "bg-topic-blue/10 border-topic-blue/20",
  article: "bg-topic-green/10 border-topic-green/20",
  book: "bg-topic-yellow/10 border-topic-yellow/20",
};

function DocumentNodeComponent({ data, selected }: NodeProps) {
  const docData = data as unknown as DocumentNodeData;
  const Icon = typeIcons[docData.type];
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(docData.title);
  const [editAuthor, setEditAuthor] = useState(docData.author || "");

  const handleSave = () => {
    docData.onUpdate?.({ title: editTitle, author: editAuthor });
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "w-[160px] rounded-md border bg-card/95 backdrop-blur-sm shadow-sm transition-all duration-200 overflow-visible group",
        typeColors[docData.type],
        selected && "ring-2 ring-primary/30 shadow-glass-hover"
      )}
    >
      {/* 4-sided handles - visible on hover */}
      <NodeHandles />
      <div className="overflow-hidden rounded-md">
        {/* Thumbnail */}
        <div className="h-24 bg-muted/30 flex items-center justify-center border-b border-border/30 relative">
          {docData.thumbnail ? (
            <img src={docData.thumbnail} alt={docData.title} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-10 h-10 text-muted-foreground/40" />
          )}
          
          {/* Controls overlay */}
          <div className="absolute top-1 right-1 flex gap-0.5">
            {isEditing ? (
              <button onClick={handleSave} className="p-1 bg-card/80 hover:bg-card rounded transition-colors">
                <Check className="w-3 h-3 text-topic-green" />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1 bg-card/80 hover:bg-card rounded transition-colors text-muted-foreground">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {docData.onDelete && (
              <button onClick={docData.onDelete} className="p-1 bg-card/80 hover:bg-destructive/20 rounded transition-colors text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        {/* Info */}
        <div className="p-2.5 space-y-1">
          {isEditing ? (
            <>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-muted/30 rounded p-1 text-xs font-medium border-none outline-none"
                placeholder="Title"
                autoFocus
              />
              <input
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                className="w-full bg-muted/30 rounded p-1 text-xs border-none outline-none"
                placeholder="Author"
              />
            </>
          ) : (
            <>
              <h4 
                className="text-xs font-medium text-foreground line-clamp-2 cursor-text"
                onDoubleClick={() => setIsEditing(true)}
              >
                {docData.title}
              </h4>
              {docData.author && (
                <p className="text-xs text-muted-foreground truncate">{docData.author}</p>
              )}
              {docData.pages && (
                <p className="text-xs text-muted-foreground/70">{docData.pages} pages</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const DocumentNode = memo(DocumentNodeComponent);
