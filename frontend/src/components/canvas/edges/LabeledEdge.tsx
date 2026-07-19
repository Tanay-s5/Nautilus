import React, { memo, useCallback, useState, useMemo } from "react";
import { EdgeProps, EdgeLabelRenderer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { RefreshCw, Edit2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


interface LabeledEdgeData {
  label?: string;
  explanation?: string;
  confidence?: number;
  parallelIndex?: number;
  parallelCount?: number;
  onRecompute?: (sourceId: string, targetId: string) => void;
  onEdit?: (edgeId: string, label: string, explanation: string) => void;
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

  // Label at midpoint of curve (t=0.5) so it stays on the edge
  const t = 0.5;
  const labelX = (1 - t) * (1 - t) * sourceX + 2 * (1 - t) * t * cx + t * t * targetX;
  const labelY = (1 - t) * (1 - t) * sourceY + 2 * (1 - t) * t * cy + t * t * targetY;

  return { path, labelX, labelY };
}

function LabeledEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as LabeledEdgeData;
  const parallelIndex = edgeData.parallelIndex ?? 0;
  const parallelCount = edgeData.parallelCount ?? 1;
  
  const [showPanel, setShowPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(edgeData.label || "");
  const [editExplanation, setEditExplanation] = useState(edgeData.explanation || "");

  const { path, labelX, labelY } = useMemo(
    () => computeCurvedPath(sourceX, sourceY, targetX, targetY, parallelIndex, parallelCount),
    [sourceX, sourceY, targetX, targetY, parallelIndex, parallelCount]
  );

  const handleRecompute = useCallback(() => {
    edgeData.onRecompute?.(source, target);
    setShowPanel(false);
  }, [edgeData, source, target]);

  const handleSaveEdit = useCallback(() => {
    edgeData.onEdit?.(id, editLabel, editExplanation);
    setIsEditing(false);
  }, [edgeData, id, editLabel, editExplanation]);

  const confidencePercent = Math.round((edgeData.confidence || 0.7) * 100);
  const hasLabel = !!edgeData.label;

  // Determine edge style based on confidence (for dashed vs solid)
  const isDashed = edgeData.confidence && edgeData.confidence < 0.3;
  
  return (
    <>
      {/* Main edge path with Bezier curve - bolder and more visible */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        strokeWidth={selected ? 3.5 : 2.5}
        stroke={selected ? "hsl(var(--accent))" : "hsl(220 12% 55% / 0.85)"}
        fill="none"
        markerEnd={markerEnd}
        strokeDasharray={isDashed ? "8 4" : undefined}
        style={{
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
        }}
      />
      
      {/* Invisible wider path for easier hover/click */}
      <path
        d={path}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        className="cursor-pointer"
      />

      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 9999,
            }}
            className="nodrag nopan"
          >
            {/* Label - always visible on the edge line */}
            <div
              onClick={() => setShowPanel(!showPanel)}
              className={cn(
                "px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-semibold",
                "bg-card border-2 border-border shadow-md",
                "hover:bg-muted hover:border-muted-foreground/30 hover:shadow-lg",
                selected && "ring-2 ring-accent border-accent/60",
                isDashed && "border-dashed"
              )}
            >
              <span className="text-foreground font-medium">{edgeData.label}</span>
            </div>

            {/* Full panel on hover/click */}
            <AnimatePresence>
              {showPanel && !isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  onMouseLeave={() => setShowPanel(false)}
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
                    "w-64 p-3 rounded-lg shadow-lg",
                    "bg-card/95 backdrop-blur-xl border border-border"
                  )}
                >
                  {/* Relationship */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {edgeData.label}
                    </span>
                    {edgeData.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {confidencePercent}%
                      </span>
                    )}
                  </div>

                  {/* Explanation */}
                  {edgeData.explanation && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {edgeData.explanation}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={handleRecompute}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recompute
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit mode */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
                    "w-72 p-3 rounded-lg shadow-lg",
                    "bg-card border border-border"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Edit Link</span>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-md mb-2 focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Relationship label"
                  />

                  <textarea
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                    rows={3}
                    placeholder="Explanation..."
                  />

                  <button
                    onClick={handleSaveEdit}
                    className="w-full mt-2 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const LabeledEdge = memo(LabeledEdgeComponent);
