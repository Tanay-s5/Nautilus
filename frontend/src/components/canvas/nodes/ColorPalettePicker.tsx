import { memo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

export type NodeColor = "green" | "blue" | "purple" | "orange" | "pink" | "mint" | "coral" | "yellow" | "red" | "gray";

export const PALETTE_COLORS: { value: NodeColor; hex: string; label: string }[] = [
  { value: "green", hex: "#22c55e", label: "Green" },
  { value: "blue", hex: "#3b82f6", label: "Blue" },
  { value: "purple", hex: "#8b5cf6", label: "Purple" },
  { value: "mint", hex: "#2dd4bf", label: "Mint" },
  { value: "yellow", hex: "#facc15", label: "Yellow" },
  { value: "pink", hex: "#ec4899", label: "Pink" },
  { value: "coral", hex: "#fb7185", label: "Coral" },
  { value: "orange", hex: "#f97316", label: "Orange" },
  { value: "gray", hex: "#6b7280", label: "Gray" },
];

interface ColorPalettePickerProps {
  isOpen: boolean;
  currentColor: NodeColor;
  onSelect: (color: NodeColor) => void;
  className?: string;
}

function ColorPalettePickerComponent({ isOpen, currentColor, onSelect, className }: ColorPalettePickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute z-50 p-2.5 bg-card border border-border rounded-xl shadow-xl",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5">
            {PALETTE_COLORS.map((c) => {
              const isSelected = currentColor === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => onSelect(c.value)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all hover:scale-125 relative flex items-center justify-center",
                    isSelected && "ring-2 ring-offset-2 ring-foreground/40 ring-offset-background"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {isSelected && <Check className="w-3 h-3 text-white drop-shadow-sm" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const ColorPalettePicker = memo(ColorPalettePickerComponent);
