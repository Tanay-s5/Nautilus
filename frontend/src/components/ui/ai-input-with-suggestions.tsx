"use client";

import { LucideIcon, CornerRightDown, GitBranch, FileText, Lightbulb, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

interface ActionItem {
  text: string;
  icon: LucideIcon;
  colors: {
    icon: string;
    border: string;
    bg: string;
  };
}

interface AIInputWithSuggestionsProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  actions?: ActionItem[];
  defaultSelected?: string;
  onSubmit?: (text: string, action?: string) => void;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_ACTIONS: ActionItem[] = [
  {
    text: "Flowchart",
    icon: GitBranch,
    colors: {
      icon: "text-blue-600",
      border: "border-blue-300",
      bg: "bg-blue-50",
    },
  },
  {
    text: "Summary",
    icon: FileText,
    colors: {
      icon: "text-emerald-600",
      border: "border-emerald-300",
      bg: "bg-emerald-50",
    },
  },
  {
    text: "Key Points",
    icon: Lightbulb,
    colors: {
      icon: "text-amber-600",
      border: "border-amber-300",
      bg: "bg-amber-50",
    },
  },
  {
    text: "Proofread",
    icon: CheckCheck,
    colors: {
      icon: "text-purple-600",
      border: "border-purple-300",
      bg: "bg-purple-50",
    },
  },
];

export function AIInputWithSuggestions({
  id = "ai-input-with-actions",
  placeholder = "Ask anything or select an action...",
  minHeight = 56,
  maxHeight = 160,
  actions = DEFAULT_ACTIONS,
  defaultSelected,
  onSubmit,
  className,
  disabled = false,
}: AIInputWithSuggestionsProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(defaultSelected ?? null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  const toggleItem = (itemText: string) => {
    setSelectedItem((prev) => (prev === itemText ? null : itemText));
  };

  const currentItem = selectedItem
    ? actions.find((item) => item.text === selectedItem)
    : null;

  const handleSubmit = () => {
    if (inputValue.trim() && !disabled) {
      onSubmit?.(inputValue, selectedItem ?? undefined);
      setInputValue("");
      setSelectedItem(null);
      adjustHeight(true);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full">
        <div className="relative bg-card border border-border rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-muted-foreground/30">
          <div className="relative">
            <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
              <Textarea
                ref={textareaRef}
                id={id}
                placeholder={placeholder}
                className={cn(
                  "w-full bg-transparent px-4 py-3 pr-10 resize-none",
                  "border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "text-sm placeholder:text-muted-foreground/60"
                )}
                value={inputValue}
                disabled={disabled}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>

            <div className="h-10 bg-transparent">
              {currentItem && (
                <div className="absolute left-3 bottom-2.5 z-10">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      "border shadow-sm rounded-lg px-2.5 py-1 text-xs font-medium",
                      "animate-fadeIn hover:opacity-80 transition-opacity duration-200",
                      currentItem.colors.bg,
                      currentItem.colors.border,
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <currentItem.icon className={cn("w-3.5 h-3.5", currentItem.colors.icon)} />
                    <span className={currentItem.colors.icon}>{selectedItem}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <CornerRightDown
            className={cn(
              "absolute right-3 top-3 w-4 h-4 transition-all duration-200 text-muted-foreground",
              inputValue ? "opacity-100 scale-100" : "opacity-30 scale-95"
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {actions
          .filter((item) => item.text !== selectedItem)
          .map(({ text, icon: Icon, colors }) => (
            <button
              type="button"
              key={text}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg",
                "border transition-all duration-200",
                "border-border bg-card hover:bg-muted/50",
                "flex-shrink-0",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => toggleItem(text)}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
                <span className="text-foreground/70">{text}</span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}