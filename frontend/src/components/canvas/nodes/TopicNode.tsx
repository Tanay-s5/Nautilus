import { memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { MoreHorizontal, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { NodeHandles } from "./NodeHandles";
export interface TopicNodeData {
  label: string;
  content?: string;
  color: "green" | "orange" | "coral" | "blue" | "pink" | "yellow" | "mint" | "purple";
  items?: string[];
  onUpdate?: (data: Partial<TopicNodeData>) => void;
  onDelete?: () => void;
}
const colorClasses = {
  green: "border-l-[3px] border-l-topic-green",
  orange: "border-l-[3px] border-l-topic-orange",
  coral: "border-l-[3px] border-l-topic-coral",
  blue: "border-l-[3px] border-l-topic-blue",
  pink: "border-l-[3px] border-l-topic-pink",
  yellow: "border-l-[3px] border-l-topic-yellow",
  mint: "border-l-[3px] border-l-topic-mint",
  purple: "border-l-[3px] border-l-topic-purple"
};
const headerBgClasses = {
  green: "bg-topic-green/10",
  orange: "bg-topic-orange/10",
  coral: "bg-topic-coral/10",
  blue: "bg-topic-blue/10",
  pink: "bg-topic-pink/10",
  yellow: "bg-topic-yellow/10",
  mint: "bg-topic-mint/10",
  purple: "bg-topic-purple/10"
};
const headerTextClasses = {
  green: "text-topic-green",
  orange: "text-topic-orange",
  coral: "text-topic-coral",
  blue: "text-topic-blue",
  pink: "text-topic-pink",
  yellow: "text-topic-yellow",
  mint: "text-topic-mint",
  purple: "text-topic-purple"
};
const colorOptions: Array<TopicNodeData["color"]> = ["green", "orange", "coral", "blue", "pink", "yellow", "mint", "purple"];
function TopicNodeComponent({
  data,
  selected
}: NodeProps) {
  const nodeData = data as unknown as TopicNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(nodeData.label);
  const [editContent, setEditContent] = useState(nodeData.content || "");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const handleSave = () => {
    nodeData.onUpdate?.({
      label: editLabel,
      content: editContent
    });
    setIsEditing(false);
  };
  const handleColorChange = (color: TopicNodeData["color"]) => {
    nodeData.onUpdate?.({
      color
    });
    setShowColorPicker(false);
  };
  return (
    <div
      className={cn(
        "min-w-[260px] max-w-[380px] transition-all duration-150 group relative overflow-visible",
        colorClasses[nodeData.color],
        selected ? "heptacard selected" : "heptacard"
      )}
      style={{
        borderRadius: "var(--radius-card)"
      }}
    >
      {/* 4-sided handles - visible on hover */}
      <NodeHandles />
      <div className="bg-card overflow-hidden rounded-[var(--radius-card)]">
        {/* Header */}
        <div className={cn("flex flex-col gap-2 px-4 py-3 border-b border-border/30", headerBgClasses[nodeData.color])}>
          <div className="flex items-start gap-2">
            {isEditing ? (
              <textarea
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                className={cn(
                  "w-full bg-transparent border-none outline-none text-sm font-semibold resize-none leading-snug",
                  headerTextClasses[nodeData.color]
                )}
                rows={2}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className={cn(
                  "text-sm font-semibold cursor-pointer whitespace-normal break-words leading-snug",
                  headerTextClasses[nodeData.color]
                )}
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                {nodeData.label}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-1">
            {isEditing ? (
              <button onClick={handleSave} className="p-1 hover:bg-white/50 rounded transition-colors">
                <Check className="w-3.5 h-3.5 text-topic-green" />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/50 rounded transition-colors opacity-50 hover:opacity-100">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            {nodeData.onDelete && (
              <button onClick={nodeData.onDelete} className="p-1 hover:bg-white/50 rounded transition-colors opacity-50 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Color picker */}
        {showColorPicker && <div className="flex gap-1.5 px-3 py-2 border-b border-border/30 bg-muted/20">
            {colorOptions.map(color => <button key={color} onClick={() => handleColorChange(color)} className={cn("w-5 h-5 rounded-full border-2 transition-transform hover:scale-110", nodeData.color === color ? "border-foreground scale-110" : "border-transparent")} style={{
          backgroundColor: `hsl(var(--topic-${color}))`
        }} />)}
          </div>}
        
        {/* Content */}
        <div className="p-3 space-y-2">
          {isEditing ? <textarea value={editContent} onChange={e => setEditContent(e.target.value)} onClick={e => e.stopPropagation()} className="w-full bg-muted/30 rounded-md p-2 text-sm resize-none border-none outline-none min-h-[60px]" rows={3} placeholder="Add content (supports Markdown)..." /> : <>
              {nodeData.content && <div className="cursor-text" onDoubleClick={() => setIsEditing(true)}>
                  <MarkdownRenderer content={nodeData.content} />
                </div>}
              {nodeData.items && nodeData.items.length > 0 && <ul className="space-y-1 mt-2">
                  {nodeData.items.map((item, index) => <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>)}
                </ul>}
              {!nodeData.content && (!nodeData.items || nodeData.items.length === 0) && <p className="text-xs text-muted-foreground/50 italic cursor-text" onDoubleClick={() => setIsEditing(true)}>
                  Double-click to add content...
                </p>}
            </>}
        </div>
      </div>
    </div>
  );
}
export const TopicNode = memo(TopicNodeComponent);
