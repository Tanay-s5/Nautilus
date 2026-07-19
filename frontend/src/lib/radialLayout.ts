import type { Node, Edge } from "@xyflow/react";

export interface RadialLayoutOptions {
  centerX?: number;
  centerY?: number;
  radius?: number;
  defaultNodeSize?: { width: number; height: number };
}

const DEFAULTS: Required<RadialLayoutOptions> = {
  centerX: 600,
  centerY: 400,
  radius: 450,
  defaultNodeSize: { width: 300, height: 180 },
};

/**
 * Radial/Mindmap layout - positions nodes in a circle around a central node
 * First node is the center, remaining nodes spread around it
 * Only repositions NEW nodes (those matching the newNodeIds set)
 */
export function radialLayoutNodes(
  nodes: Node[],
  edges: Edge[],
  newNodeIds?: Set<string>,
  opts: RadialLayoutOptions = {}
): Node[] {
  const o = { ...DEFAULTS, ...opts };

  if (nodes.length === 0) return nodes;
  
  // If no newNodeIds, layout ALL nodes (backward compat)
  if (!newNodeIds) {
    return layoutAll(nodes, o);
  }

  // Only layout new nodes, keep existing ones in place
  const newNodes = nodes.filter(n => newNodeIds.has(n.id));
  const existingNodes = nodes.filter(n => !newNodeIds.has(n.id));
  
  if (newNodes.length === 0) return nodes;
  
  // Find center position based on existing nodes or default
  const centerX = existingNodes.length > 0 
    ? Math.max(...existingNodes.map(n => n.position.x + (o.defaultNodeSize.width / 2))) + 400
    : o.centerX;
  const centerY = existingNodes.length > 0
    ? existingNodes.reduce((sum, n) => sum + n.position.y, 0) / existingNodes.length + o.defaultNodeSize.height / 2
    : o.centerY;

  const laid = layoutAll(newNodes, { ...o, centerX, centerY });
  return [...existingNodes, ...laid];
}

function layoutAll(nodes: Node[], o: Required<RadialLayoutOptions>): Node[] {
  if (nodes.length === 1) {
    return [{
      ...nodes[0],
      position: { x: o.centerX - o.defaultNodeSize.width / 2, y: o.centerY - o.defaultNodeSize.height / 2 }
    }];
  }

  // First node goes to center
  const centerNode = {
    ...nodes[0],
    position: { x: o.centerX - o.defaultNodeSize.width / 2, y: o.centerY - o.defaultNodeSize.height / 2 }
  };

  // Remaining nodes spread in a circle
  const remainingNodes = nodes.slice(1);
  // Dynamically increase radius based on node count
  const effectiveRadius = Math.max(o.radius, remainingNodes.length * 60);
  const angleStep = (2 * Math.PI) / remainingNodes.length;

  const positionedNodes = remainingNodes.map((node, index) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const x = o.centerX + effectiveRadius * Math.cos(angle) - o.defaultNodeSize.width / 2;
    const y = o.centerY + effectiveRadius * Math.sin(angle) - o.defaultNodeSize.height / 2;
    
    return {
      ...node,
      position: { x, y }
    };
  });

  return [centerNode, ...positionedNodes];
}

/**
 * Create radial edges from center to all outer nodes
 */
export function createRadialEdges(
  centerNodeId: string,
  outerNodeIds: string[],
  labels: string[] = []
): Edge[] {
  return outerNodeIds.map((targetId, index) => ({
    id: `e-radial-${centerNodeId}-${targetId}`,
    source: centerNodeId,
    target: targetId,
    type: "bezierLabeled",
    data: {
      label: labels[index] || "relates to"
    },
    style: { 
      stroke: "hsl(220 10% 25%)", 
      strokeWidth: 2,
    },
  }));
}
