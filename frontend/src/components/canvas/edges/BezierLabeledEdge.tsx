import { memo, useCallback, useState, useMemo } from "react";
import { EdgeProps, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { RefreshCw, Edit2, X, Trash2, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BezierLabeledEdgeData {
  label?: string;
  explanation?: string;
  confidence?: number;
  parallelIndex?: number;
  parallelCount?: number;
  onRecompute?: (sourceId: string, targetId: string) => void;
  onEdit?: (edgeId: string, label: string, explanation: string) => void;
  onDelete?: (edgeId: string) => void;
}

function BezierLabeledEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as BezierLabeledEdgeData;

  const parallelIndex = edgeData.parallelIndex ?? 0;
  const parallelCount = edgeData.parallelCount ?? 1;

  const [showPanel, setShowPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(edgeData.label || "");
  const [editExplanation, setEditExplanation] = useState(edgeData.explanation || "");
  const [showEdgeMenu, setShowEdgeMenu] = useState(false);

  // Parallel edge offset
  const curvatureOffset = useMemo(() => {
    if (parallelCount <= 1) return 0;
    const gap = 30;
    return (parallelIndex - (parallelCount - 1) / 2) * gap;
  }, [parallelIndex, parallelCount]);

  // Bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25 + Math.abs(curvatureOffset) * 0.005,
  });

  // Offset label for parallel edges
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  const adjustedLabelX = labelX + perpX * curvatureOffset;
  const adjustedLabelY = labelY + perpY * curvatureOffset;

  const handleRecompute = useCallback(() => {
    edgeData.onRecompute?.(source, target);
    setShowPanel(false);
  }, [edgeData, source, target]);

  const handleSaveEdit = useCallback(() => {
    edgeData.onEdit?.(id, editLabel, editExplanation);
    setIsEditing(false);
    setShowEdgeMenu(false);
  }, [edgeData, id, editLabel, editExplanation]);

  const handleDelete = useCallback(() => {
    edgeData.onDelete?.(id);
    setShowEdgeMenu(false);
  }, [edgeData, id]);

  const handleEdgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEdgeMenu(!showEdgeMenu);
  }, [showEdgeMenu]);

  const hasLabel = !!edgeData.label;
  const confidencePercent = Math.round((edgeData.confidence || 0.7) * 100);
  const isDashed = edgeData.confidence && edgeData.confidence < 0.3;

  return (
    <>
      {/* Main edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 4 : 3}
        stroke={selected ? "hsl(var(--accent))" : "hsl(220 10% 25% / 0.85)"}
        strokeOpacity={selected ? 1 : 0.85}
        strokeLinecap="round"
        fill="none"
        markerEnd={markerEnd}
        strokeDasharray={isDashed ? "8 4" : undefined}
      />

      {/* Interaction path - clickable (unlabeled edges only; labeled edges expand via the chip itself) */}
      <path
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        className="cursor-pointer nodrag nopan"
        onDoubleClick={hasLabel ? undefined : handleEdgeClick}
      />

      {/* Edge menu (no label) - shows at midpoint */}
      {!hasLabel && (
        <EdgeLabelRenderer>
          <AnimatePresence>
            {(showEdgeMenu || selected) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="nodrag nopan"
                style={{
                  position: "absolute",
                  left: `${labelX}px`,
                  top: `${labelY}px`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "all",
                  zIndex: 9999,
                }}
              >
                <div className="flex gap-1 bg-card/95 border border-border rounded-lg shadow-lg p-1 backdrop-blur-sm">
                  <button
                    onClick={() => { setIsEditing(true); setShowEdgeMenu(false); }}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Add Label"
                  >
                    <Tag className="w-3 h-3" />
                    Label
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete Edge"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit mode for unlabeled edge */}
          <AnimatePresence>
            {isEditing && !hasLabel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="nodrag nopan"
                style={{
                  position: "absolute",
                  left: `${labelX}px`,
                  top: `${labelY}px`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "all",
                  zIndex: 9999,
                }}
              >
                <div className="w-64 p-3 rounded-lg shadow-lg bg-card border border-border">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold">Add Label</span>
                    <button onClick={() => setIsEditing(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full mb-2 px-2 py-1.5 text-sm border rounded bg-background"
                    placeholder="Label..."
                    autoFocus
                  />
                  <textarea
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs border rounded resize-none bg-background"
                    placeholder="Explanation (optional)..."
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-accent text-accent-foreground rounded"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </EdgeLabelRenderer>
      )}

      {/* LABEL */}
      {hasLabel &&
        Number.isFinite(adjustedLabelX) &&
        Number.isFinite(adjustedLabelY) && (
          <EdgeLabelRenderer>
            <div
              className="nodrag nopan"
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: `${adjustedLabelX}px`,
                top: `${adjustedLabelY}px`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "all",
                zIndex: 9999,
              }}
            >
              {/* Label chip */}
              <div
                onDoubleClick={(e) => { e.stopPropagation(); setShowPanel(!showPanel); }}
                title="Double-click for explanation"
                className={cn(
                  "nodrag nopan",
                  "px-2.5 py-1 rounded-md cursor-pointer transition-all text-xs font-medium",
                  "bg-card/95 border border-border shadow-sm backdrop-blur-sm",
                  "hover:bg-muted hover:border-muted-foreground/30 hover:shadow-md",
                  selected && "ring-2 ring-accent border-accent/60",
                  isDashed && "border-dashed"
                )}
              >
                <span className="text-foreground/90">
                  {edgeData.label}
                </span>
              </div>

              {/* Info panel */}
              <AnimatePresence>
                {showPanel && !isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    onMouseLeave={() => setShowPanel(false)}
                    className={cn(
                      "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
                      "w-80 p-3 rounded-lg shadow-lg",
                      "bg-card/95 backdrop-blur-xl border border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {edgeData.label}
                      </span>
                      {edgeData.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {confidencePercent}%
                        </span>
                      )}
                    </div>

                    {edgeData.explanation && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {edgeData.explanation}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={handleRecompute}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Recompute
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
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
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold">Edit Link</span>
                      <button onClick={() => setIsEditing(false)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full mb-2 px-2 py-1.5 text-sm border rounded bg-background"
                    />

                    <textarea
                      value={editExplanation}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      rows={3}
                      className="w-full px-2 py-1.5 text-xs border rounded resize-none bg-background"
                    />

                    <button
                      onClick={handleSaveEdit}
                      className="w-full mt-2 px-3 py-1.5 text-xs bg-accent text-accent-foreground rounded"
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

export const BezierLabeledEdge = memo(BezierLabeledEdgeComponent);
