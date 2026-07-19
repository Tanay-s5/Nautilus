import { memo, useMemo } from "react";
import { EdgeProps, EdgeLabelRenderer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SmoothEdgeData {
  label?: string;
  explanation?: string;
  confidence?: number;
  parallelIndex?: number;
  parallelCount?: number;
}

/**
 * Compute a quadratic bezier control point with perpendicular offset
 * for separating parallel edges between the same node pair.
 */
function computeCurvedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  parallelIndex: number = 0,
  parallelCount: number = 1
): { path: string; labelX: number; labelY: number } {
  // Midpoint
  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;

  // Direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;

  // Normalized perpendicular
  const ux = -dy / len;
  const uy = dx / len;

  // Base curvature offset (makes all edges slightly curved)
  const baseCurvature = Math.min(len * 0.15, 50);

  // Parallel separation gap
  const gap = 25;
  
  // Center parallel edges: index 0 => 0, 1 => +1, 2 => -1, 3 => +2, etc.
  let offsetIndex = 0;
  if (parallelCount > 1) {
    offsetIndex = Math.ceil((parallelIndex + 1) / 2) * (parallelIndex % 2 === 0 ? 1 : -1);
  }
  
  const parallelOffset = gap * offsetIndex;
  const totalOffset = baseCurvature + parallelOffset;

  // Control point
  const cx = mx + ux * totalOffset;
  const cy = my + uy * totalOffset;

  // Quadratic bezier path
  const path = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;

  return { path, labelX: cx, labelY: cy };
}

function SmoothEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as SmoothEdgeData;
  const parallelIndex = edgeData.parallelIndex ?? 0;
  const parallelCount = edgeData.parallelCount ?? 1;

  const { path, labelX, labelY } = useMemo(
    () => computeCurvedPath(sourceX, sourceY, targetX, targetY, parallelIndex, parallelCount),
    [sourceX, sourceY, targetX, targetY, parallelIndex, parallelCount]
  );

  const hasLabel = !!edgeData.label;

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        strokeWidth={selected ? 2.5 : 2}
        stroke={selected ? "hsl(var(--accent))" : "hsl(220 10% 65%)"}
        fill="none"
        markerEnd={markerEnd}
        style={{
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
        }}
      />

      {/* Invisible wider path for easier hover/click */}
      <path
        d={path}
        strokeWidth={16}
        stroke="transparent"
        fill="none"
        className="cursor-pointer"
      />

      {hasLabel && (
        <EdgeLabelRenderer>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-medium transition-all",
                "bg-background/95 border border-border/60 backdrop-blur-sm shadow-sm",
                "hover:bg-muted hover:border-border",
                selected && "ring-1 ring-accent border-accent/50"
              )}
            >
              <span className="text-foreground/80">{edgeData.label}</span>
              {edgeData.confidence && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  {Math.round(edgeData.confidence * 100)}%
                </span>
              )}
            </div>
          </motion.div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const SmoothEdge = memo(SmoothEdgeComponent);
