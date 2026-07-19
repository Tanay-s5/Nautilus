import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode, createElement } from "react";
import { Node, Edge, NodeChange, EdgeChange, addEdge, applyNodeChanges, applyEdgeChanges, Connection } from "@xyflow/react";
import { toast } from "sonner";
import { generateCard, deleteCard as deleteBackendCard } from "@/lib/api";

const nodeColors = ["red", "orange", "yellow", "green", "mint", "blue", "purple", "pink", "coral"] as const;

function loadCanvasNodesFromStorage(canvasId: string): Node[] {
  try {
    const raw = localStorage.getItem(`caveat-canvas-nodes-${canvasId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadCanvasEdgesFromStorage(canvasId: string): Edge[] {
  try {
    const raw = localStorage.getItem(`caveat-canvas-edges-${canvasId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCanvasNodesToStorage(canvasId: string, nodes: Node[]) {
  try { localStorage.setItem(`caveat-canvas-nodes-${canvasId}`, JSON.stringify(nodes)); } catch {}
}

function saveCanvasEdgesToStorage(canvasId: string, edges: Edge[]) {
  try { localStorage.setItem(`caveat-canvas-edges-${canvasId}`, JSON.stringify(edges)); } catch {}
}

function useCanvasStoreInternal() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(false);
  // Keep refs for immediate save access
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const canvasIdRef = useRef<string | null>(canvasId);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { canvasIdRef.current = canvasId; }, [canvasId]);

  // Flush save immediately (used before switching canvases)
  const flushSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const cid = canvasIdRef.current;
    if (cid) {
      saveCanvasNodesToStorage(cid, nodesRef.current);
      saveCanvasEdgesToStorage(cid, edgesRef.current);
    }
  }, []);

  // Auto-save to localStorage when nodes or edges change (debounced)
  useEffect(() => {
    if (isInitialLoadRef.current || !canvasId) return;
    
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      saveCanvasNodesToStorage(canvasId, nodes);
      saveCanvasEdgesToStorage(canvasId, edges);
      setSaveStatus("saved");
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
    
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges, canvasId]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const cid = canvasIdRef.current;
      if (cid) {
        saveCanvasNodesToStorage(cid, nodesRef.current);
        saveCanvasEdgesToStorage(cid, edgesRef.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Load canvas by specific ID (from localStorage)
  const loadCanvasById = useCallback(async (targetCanvasId: string) => {
    // Flush current canvas data before switching
    flushSave();

    isInitialLoadRef.current = true;
    setIsLoading(true);
    setCanvasId(targetCanvasId);

    const loadedNodes = loadCanvasNodesFromStorage(targetCanvasId);
    const loadedEdges = loadCanvasEdgesFromStorage(targetCanvasId);
    
    setNodes(loadedNodes);
    setEdges(loadedEdges);
    
    setIsLoading(false);
    setTimeout(() => { isInitialLoadRef.current = false; }, 300);
  }, [flushSave]);

  const loadCanvas = useCallback(async () => {}, []);
  const saveCanvas = useCallback(async () => {
    if (canvasId) {
      saveCanvasNodesToStorage(canvasId, nodes);
      saveCanvasEdgesToStorage(canvasId, edges);
    }
  }, [canvasId, nodes, edges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const edge: Edge = {
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source || "",
      target: connection.target || "",
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
      type: "bezierLabeled",
      animated: false,
      style: { stroke: "hsl(220 10% 25%)", strokeWidth: 2 },
      data: {},
    };
    setEdges((eds) => addEdge(edge, eds));
  }, []);

  const addNode = useCallback((type: "topic" | "content" | "document" | "documentCard" | "text" | "concept" | "topicCard" | "knowledge", position?: { x: number; y: number }) => {
    const id = `${type}-${Date.now()}`;
    const existingNodeCount = nodes.length;
    const pos = position || { x: 150 + (existingNodeCount % 3) * 300, y: 100 + Math.floor(existingNodeCount / 3) * 250 };
    const randomColor = nodeColors[Math.floor(Math.random() * nodeColors.length)];

    const nodeData: Record<string, any> = {
      topic: { label: "New Topic", content: "", color: "blue" as const, items: [] },
      topicCard: { title: "New Topic", keypoints: ["Add your first keypoint here"], color: "green" as const },
      content: { title: "New Card", content: "Double-click to edit", highlights: [] },
      document: { title: "New Document", type: "article" as const, author: "" },
      documentCard: { title: "New Document", subtitle: "", content: "Write here... Supports **Markdown**.", bulletPoints: [], color: "green" as const },
      text: { text: "Text", fontSize: 16 },
      concept: { title: "New Concept", content: "Double-click to edit this concept block", color: randomColor },
      knowledge: { title: "New Knowledge Node", summary: "A brief summary", content: "**Detailed explanation** goes here.", color: "red" as const },
    };

    const newNode: Node = { id, type, position: pos, data: nodeData[type] };
    setNodes((nds) => [...nds, newNode]);
    return id;
  }, [nodes.length]);

  const addImageNode = useCallback((src: string, naturalWidth: number, naturalHeight: number, position?: { x: number; y: number }) => {
    const id = `image-${Date.now()}`;
    const pos = position || { x: 150 + (nodes.length % 3) * 300, y: 100 + Math.floor(nodes.length / 3) * 250 };
    const newNode: Node = {
      id,
      type: "image",
      position: pos,
      data: { src, alt: "Pasted image", naturalWidth, naturalHeight },
    };
    setNodes((nds) => [...nds, newNode]);
    return id;
  }, [nodes.length]);

  const generateKnowledgeCard = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    try {
      const { card, links } = await generateCard(prompt);
      const cardData = card.data;

      const timestamp = Date.now();
      const colorIndex = Math.abs(prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % nodeColors.length;
      const position = { x: 150 + (nodes.length % 3) * 320, y: 100 + Math.floor(nodes.length / 3) * 280 };

      const newNode: Node = {
        id: `building-${timestamp}`,
        type: "building",
        position,
        data: {
          title: cardData.title,
          summary: cardData.previewBullets,
          detailed: cardData.details,
          color: nodeColors[colorIndex],
          linking: {
            applications: cardData.applications,
            analogy: cardData.analogy,
            corePrinciples: cardData.corePrinciples,
            mechanism: cardData.mechanism.join(" → "),
            examples: cardData.examples,
            misconceptions: cardData.misconceptions,
            formalStructure: cardData.formalStructure,
          },
          // Links this card back to its record in the backend's cards.json,
          // so we can (a) draw edges to other cards already on this canvas
          // and (b) cascade-delete it server-side if the node is removed.
          backendId: card.id,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success("Created knowledge card");

      // The backend computes links against every card it has ever seen (one
      // global graph), not just this canvas. We can only draw an edge if the
      // other side of the link is a node actually rendered here.
      if (links.length > 0) {
        const nodeIdByBackendId = new Map<number, string>();
        nodes.forEach((n) => {
          const bId = (n.data as any)?.backendId;
          if (typeof bId === "number") nodeIdByBackendId.set(bId, n.id);
        });

        const newEdges: Edge[] = [];
        links.forEach((link, idx) => {
          const otherCardId = link.card_a_id === card.id ? link.card_b_id : link.card_a_id;
          const targetNodeId = nodeIdByBackendId.get(otherCardId);
          if (!targetNodeId) return;
          newEdges.push({
            id: `e-building-${timestamp}-${idx}`,
            source: newNode.id,
            target: targetNodeId,
            type: "bezierLabeled",
            animated: false,
            data: {
              label: link.short_label,
              explanation: link.reason,
              confidence: link.similarity,
            },
            style: { stroke: "hsl(220 10% 25%)", strokeWidth: 2 },
          });
        });

        if (newEdges.length > 0) {
          setEdges((eds) => [...eds, ...newEdges]);
          toast.success(`Found ${newEdges.length} connection${newEdges.length > 1 ? "s" : ""}`);
        }
      }

      return { card, links };
    } catch (err) {
      console.error("Generate card error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate card. Is the backend running?";
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [nodes]);

  const updateNodeData = useCallback((nodeId: string, newData: Partial<any>) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const target = nds.find((n) => n.id === nodeId);
      const backendId = (target?.data as any)?.backendId;
      if (typeof backendId === "number") {
        // Best-effort: don't block the UI on this, and don't surface a toast
        // if it fails - the node is gone from the canvas either way.
        deleteBackendCard(backendId).catch((err) => console.warn("Failed to delete card on backend:", err));
      }
      return nds.filter((n) => n.id !== nodeId);
    });
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    if (canvasId) {
      saveCanvasNodesToStorage(canvasId, []);
      saveCanvasEdgesToStorage(canvasId, []);
    }
    toast.success("Canvas cleared");
  }, [canvasId]);

  return {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, addImageNode, updateNodeData, deleteNode,
    generateKnowledgeCard,
    isGenerating, isLoading, clearCanvas, saveStatus,
    saveCanvas, loadCanvas, loadCanvasById, canvasId, flushSave,
  };
}

type CanvasStoreReturn = ReturnType<typeof useCanvasStoreInternal>;

const CanvasStoreContext = createContext<CanvasStoreReturn | null>(null);

export function CanvasStoreProvider({ children }: { children: ReactNode }) {
  const store = useCanvasStoreInternal();
  return createElement(CanvasStoreContext.Provider, { value: store }, children);
}

export function useCanvasStore(): CanvasStoreReturn {
  const ctx = useContext(CanvasStoreContext);
  if (!ctx) throw new Error("useCanvasStore must be used within CanvasStoreProvider");
  return ctx;
}
