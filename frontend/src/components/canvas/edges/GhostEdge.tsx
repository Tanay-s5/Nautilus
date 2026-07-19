import React, { memo, useCallback } from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface GhostEdgeData {
  suggestionId: string;
  label: string;
  explanation: string;
  confidence: number;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

function GhostEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as GhostEdgeData;
  const [showInspector, setShowInspector] = React.useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    edgeData.onAccept?.(edgeData.suggestionId);
  }, [edgeData]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    edgeData.onDismiss?.(edgeData.suggestionId);
  }, [edgeData]);

  const confidencePercent = Math.round((edgeData.confidence || 0.5) * 100);

  return (
    <>
      {/* Dashed ghost edge line */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeDasharray="6 4"
        strokeWidth={2}
        stroke="hsl(220 80% 60% / 0.5)"
        fill="none"
        style={{
          animation: "dash 1s linear infinite",
        }}
      />
      
      {/* Glow effect on hover */}
      <path
        d={edgePath}
        strokeDasharray="6 4"
        strokeWidth={6}
        stroke="hsl(220 80% 60% / 0.1)"
        fill="none"
        className="transition-opacity hover:opacity-100 opacity-0"
      />

      <EdgeLabelRenderer>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          {/* Label badge */}
          <div
            onClick={() => setShowInspector(!showInspector)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer transition-all",
              "bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm",
              "hover:bg-blue-500/20 hover:border-blue-500/50",
              selected && "ring-2 ring-blue-500/50"
            )}
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {edgeData.label || "suggested"}
            </span>
            <span className="text-[10px] text-blue-500/60">
              {confidencePercent}%
            </span>
          </div>

          {/* Inspector popup */}
          {showInspector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
                "w-72 p-3 rounded-lg shadow-xl",
                "bg-card/95 backdrop-blur-xl border border-border"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">
                    Suggested Link
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  confidencePercent >= 80 ? "bg-green-500/20 text-green-600" :
                  confidencePercent >= 60 ? "bg-yellow-500/20 text-yellow-600" :
                  "bg-orange-500/20 text-orange-600"
                )}>
                  {confidencePercent}% confident
                </span>
              </div>

              {/* Relationship label */}
              <div className="mb-2">
                <span className="text-xs text-muted-foreground">Relationship:</span>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  "{edgeData.label}"
                </p>
              </div>

              {/* Explanation */}
              <div className="mb-3">
                <span className="text-xs text-muted-foreground">Explanation:</span>
                <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                  {edgeData.explanation || "These concepts appear to be related."}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAccept}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
                    "bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors"
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept
                </button>
                <button
                  onClick={handleDismiss}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
                    "bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </EdgeLabelRenderer>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  );
}

export const GhostEdge = memo(GhostEdgeComponent);
