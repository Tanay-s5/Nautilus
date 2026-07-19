import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

interface HistoryState {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
}

const MAX_HISTORY_SIZE = 50;

export function useCanvasUndoRedo(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: { nodes: initialNodes, edges: initialEdges },
    future: [],
  });

  const isUndoingRef = useRef(false);
  const lastSnapshotRef = useRef<string>("");

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Take a snapshot of current state (debounced by content comparison)
  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    const snapshot = JSON.stringify({ nodes, edges });
    
    // Skip if identical to last snapshot
    if (snapshot === lastSnapshotRef.current) return;
    
    // Skip if we're in the middle of undo/redo
    if (isUndoingRef.current) return;

    lastSnapshotRef.current = snapshot;

    setHistory((prev) => {
      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE);
      return {
        past: newPast,
        present: { nodes, edges },
        future: [], // Clear future on new action
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      isUndoingRef.current = true;
      setTimeout(() => { isUndoingRef.current = false; }, 100);

      const newPast = prev.past.slice(0, -1);
      const previous = prev.past[prev.past.length - 1];
      
      lastSnapshotRef.current = JSON.stringify(previous);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      isUndoingRef.current = true;
      setTimeout(() => { isUndoingRef.current = false; }, 100);

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      lastSnapshotRef.current = JSON.stringify(next);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((nodes: Node[], edges: Edge[]) => {
    const snapshot = JSON.stringify({ nodes, edges });
    lastSnapshotRef.current = snapshot;
    setHistory({
      past: [],
      present: { nodes, edges },
      future: [],
    });
  }, []);

  return {
    state: history.present,
    takeSnapshot,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
