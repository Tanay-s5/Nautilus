import { memo, useState, useRef, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeHandles } from "./NodeHandles";

export interface ImageNodeData {
  src: string;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  onUpdate?: (data: Partial<ImageNodeData>) => void;
  onDelete?: () => void;
}

function ImageNodeComponent({ data, selected }: NodeProps) {
  const imgData = data as unknown as ImageNodeData;
  const [size, setSize] = useState({
    width: imgData.naturalWidth ? Math.min(imgData.naturalWidth, 500) : 300,
    height: imgData.naturalHeight
      ? Math.min(imgData.naturalHeight, 500) *
        (Math.min(imgData.naturalWidth || 300, 500) / (imgData.naturalWidth || 300))
      : 200,
  });
  const isResizing = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = size.width;
      const aspectRatio =
        (imgData.naturalWidth || size.width) / (imgData.naturalHeight || size.height);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(100, Math.min(1200, startWidth + (moveEvent.clientX - startX)));
        setSize({ width: newWidth, height: newWidth / aspectRatio });
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [size, imgData.naturalWidth, imgData.naturalHeight]
  );

  return (
    <div
      className={cn(
        "relative group border-2 border-border/40 rounded-xl overflow-visible bg-card/50 backdrop-blur-sm transition-all",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      style={{ width: size.width }}
    >
      <NodeHandles />

      <div className="overflow-hidden rounded-xl">
        <img
          src={imgData.src}
          alt={imgData.alt || "Pasted image"}
          className="w-full h-auto block"
          style={{ width: size.width, height: size.height }}
          draggable={false}
        />
      </div>

      {/* Delete button */}
      {imgData.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            imgData.onDelete?.();
          }}
          className="absolute -top-2 -right-2 z-10 p-1 bg-card border border-border rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Resize handle */}
      <div
        className="nodrag resize-handle bottom-0 right-0"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

export const ImageNode = memo(ImageNodeComponent);
