import { useMemo } from "react";
import { Edge } from "@xyflow/react";

/**
 * Hook to compute parallel edge indices for proper visual separation.
 * Groups edges by their source-target pair (direction-independent)
 * and assigns each edge an index for offset calculation.
 */
export function useEdgeParallelism(edges: Edge[]): Edge[] {
  return useMemo(() => {
    // Group edges by normalized pair key (smaller id first)
    const groups = new Map<string, Edge[]>();

    edges.forEach((edge) => {
      const a = edge.source;
      const b = edge.target;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(edge);
    });

    // Assign parallelIndex and parallelCount to each edge
    const result: Edge[] = [];
    
    groups.forEach((group) => {
      const count = group.length;
      group.forEach((edge, index) => {
        result.push({
          ...edge,
          data: {
            ...edge.data,
            parallelIndex: index,
            parallelCount: count,
          },
        });
      });
    });

    return result;
  }, [edges]);
}
