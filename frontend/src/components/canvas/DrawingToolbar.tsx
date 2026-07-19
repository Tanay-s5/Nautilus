import { useState } from "react";
import { Pen, Brush, Highlighter, Eraser, X, Square, Circle, ArrowRight, Minus, Trash2, Undo2, Redo2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PALETTE_COLORS } from "./nodes/ColorPalettePicker";

export interface DrawingTool {
  type: "pen" | "brush" | "highlighter" | "eraser" | "rectangle" | "circle" | "arrow" | "line" | "text";
  color: string;
  size: number;
}

interface DrawingToolbarProps {
  isActive: boolean;
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClose: () => void;
  onClearDrawings?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const tools = [
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
] as const;

const sizes = [2, 4, 8, 12, 20];

export function DrawingToolbar({
  isActive,
  currentTool,
  onToolChange,
  onClose,
  onClearDrawings,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: DrawingToolbarProps) {
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="glass-panel-solid gap-0.5 md:gap-1 p-1.5 md:p-2 flex flex-row items-center pointer-events-auto overflow-x-auto max-w-[calc(100vw-2rem)]"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "p-2 rounded-lg transition-all",
          canUndo ? "hover:bg-muted/60 text-muted-foreground" : "opacity-30 cursor-not-allowed text-muted-foreground"
        )}
        title="Undo (Cmd+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          "p-2 rounded-lg transition-all",
          canRedo ? "hover:bg-muted/60 text-muted-foreground" : "opacity-30 cursor-not-allowed text-muted-foreground"
        )}
        title="Redo (Cmd+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Tool buttons */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = currentTool.type === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange({ ...currentTool, type: tool.id as DrawingTool["type"] })}
            className={cn(
              "p-2 rounded-lg transition-all",
              isSelected ? "bg-foreground text-background" : "hover:bg-muted/60 text-muted-foreground"
            )}
            title={tool.label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="h-6 w-px bg-border mx-1" />

      {/* Color picker - using same palette as nodes */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-7 h-7 rounded-lg border-2 border-border transition-all hover:scale-105"
          style={{ backgroundColor: currentTool.color }}
          title="Color"
        />
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-panel-solid p-2.5"
            >
              <div className="flex gap-1.5">
                {/* Standard drawing colors */}
                {[
                  { hex: "#000000", label: "Black" },
                  { hex: "#FFFFFF", label: "White" },
                  ...PALETTE_COLORS.map(c => ({ hex: c.hex, label: c.label })),
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      onToolChange({ ...currentTool, color: c.hex });
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all hover:scale-125 border border-border/30",
                      currentTool.color === c.hex && "ring-2 ring-offset-2 ring-foreground/40 ring-offset-background"
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Size picker */}
      <div className="relative">
        <button
          onClick={() => setShowSizePicker(!showSizePicker)}
          className="p-2 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-center"
          title="Size"
        >
          <div
            className="rounded-full bg-foreground"
            style={{
              width: Math.min(currentTool.size + 4, 16),
              height: Math.min(currentTool.size + 4, 16),
            }}
          />
        </button>
        <AnimatePresence>
          {showSizePicker && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-panel-solid p-2 flex flex-row gap-2"
            >
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    onToolChange({ ...currentTool, size });
                    setShowSizePicker(false);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors",
                    currentTool.size === size && "bg-muted"
                  )}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{
                      width: Math.min(size + 4, 16),
                      height: Math.min(size + 4, 16),
                    }}
                  />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Clear drawings */}
      <button
        onClick={onClearDrawings}
        className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
        title="Clear All Drawings"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
        title="Exit Drawing Mode"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
