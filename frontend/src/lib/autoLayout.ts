import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

export type AutoLayoutDirection = "TB" | "LR";

export interface AutoLayoutOptions {
  direction?: AutoLayoutDirection;
  nodeSep?: number;
  rankSep?: number;
  edgeSep?: number;
  marginX?: number;
  marginY?: number;
  /** If true, ignores edges with type === "ghost" */
  ignoreGhostEdges?: boolean;
  /** Fallback size when node width/height not measured yet */
  defaultNodeSize?: { width: number; height: number };
}

const DEFAULTS: Required<AutoLayoutOptions> = {
  direction: "TB",
  nodeSep: 500,
  rankSep: 600,
  edgeSep: 250,
  marginX: 200,
  marginY: 200,
  ignoreGhostEdges: true,
  defaultNodeSize: { width: 380, height: 300 },
};

function getNodeSize(node: Node, fallback: { width: number; height: number }) {
  const width = (node.measured?.width ?? fallback.width) as number;
  const height = (node.measured?.height ?? fallback.height) as number;
  return { width, height };
}

/**
 * Deterministic hierarchical layout to prevent overlaps.
 *
 * Notes:
 * - Dagre positions nodes by their center; React Flow expects top-left.
 * - If there are no real edges, we fall back to a simple grid.
 */
export function autoLayoutNodes(
  nodes: Node[],
  edges: Edge[],
  opts: AutoLayoutOptions = {}
): Node[] {
  const o = { ...DEFAULTS, ...opts };

  const layoutEdges = o.ignoreGhostEdges ? edges.filter((e) => e.type !== "ghost") : edges;

  // No edges => simple grid to avoid overlap
  if (layoutEdges.length === 0) {
    const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nodes.length))));
    return nodes.map((n, i) => {
      const { width, height } = getNodeSize(n, o.defaultNodeSize);
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...n,
        position: {
          x: o.marginX + col * (width + o.nodeSep),
          y: o.marginY + row * (height + o.rankSep),
        },
      };
    });
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: o.direction,
    nodesep: o.nodeSep,
    ranksep: o.rankSep,
    edgesep: o.edgeSep,
    marginx: o.marginX,
    marginy: o.marginY,
  });

  nodes.forEach((n) => {
    const { width, height } = getNodeSize(n, o.defaultNodeSize);
    g.setNode(n.id, { width, height });
  });

  layoutEdges.forEach((e) => {
    if (!e.source || !e.target) return;
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const nodeWithPos = g.node(n.id);
    if (!nodeWithPos) return n;

    const { width, height } = getNodeSize(n, o.defaultNodeSize);

    // Dagre gives center; React Flow uses top-left
    const x = nodeWithPos.x - width / 2;
    const y = nodeWithPos.y - height / 2;

    return {
      ...n,
      position: { x, y },
    };
  });
}
