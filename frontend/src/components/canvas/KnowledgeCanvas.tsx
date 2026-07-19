import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReactFlow, useReactFlow, Background, BackgroundVariant, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TopicNode } from "./nodes/TopicNode";
import { ContentCard } from "./nodes/ContentCard";
import { DocumentNode } from "./nodes/DocumentNode";
import { DocumentCard } from "./nodes/DocumentCard";
import { TextNode } from "./nodes/TextNode";
import { ConceptBlock } from "./nodes/ConceptBlock";
import { TopicCard } from "./nodes/TopicCard";
import { KnowledgeNode } from "./nodes/KnowledgeNode";
import { BuildingCard } from "./nodes/BuildingCard";
import { ImageNode } from "./nodes/ImageNode";
import { BezierLabeledEdge } from "./edges/BezierLabeledEdge";
import { Toolbar } from "./Toolbar";
import { FloatingChatInput } from "./FloatingChatInput";
import { DrawingToolbar, DrawingTool } from "./DrawingToolbar";
import { DrawingCanvas, DrawingCanvasHandle } from "./DrawingCanvas";
import { CanvasControls } from "./CanvasControls";
import { useCanvasStore } from "@/hooks/useCanvasStore";
import { useEdgeParallelism } from "@/hooks/useEdgeParallelism";
import { RadialPulseLoader } from "@/components/ui/loading-animation";
import { CanvasSettings } from "@/components/SettingsPanel";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const nodeTypes = {
  topic: TopicNode,
  content: ContentCard,
  document: DocumentNode,
  documentCard: DocumentCard,
  text: TextNode,
  concept: ConceptBlock,
  topicCard: TopicCard,
  knowledge: KnowledgeNode,
  building: BuildingCard,
  image: ImageNode,
};

const edgeTypes = {
  bezierLabeled: BezierLabeledEdge
};

interface KnowledgeCanvasProps {
  settings: CanvasSettings;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  activeSessionId?: string | null;
  onUpdateSessionName?: (sessionId: string, name: string, icon?: string) => Promise<void>;
}

export function KnowledgeCanvas({
  settings,
  onToggleSidebar,
  sidebarOpen,
  onOpenSettings,
  onOpenCommandPalette,
  activeSessionId,
  onUpdateSessionName
}: KnowledgeCanvasProps) {
  const isMobile = useIsMobile();
  const {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, updateNodeData, deleteNode,
    generateKnowledgeCard, isGenerating, isLoading, clearCanvas,
    flushSave, addImageNode,
  } = useCanvasStore();

  // Undo/redo history
  const [history, setHistory] = useState<{nodes: Node[];edges: Edge[];}[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoingRef = useRef(false);
  const lastSnapshotRef = useRef<string>("");

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    if (isUndoingRef.current || isLoading) return;
    const snapshot = JSON.stringify({ nodes, edges });
    if (snapshot === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snapshot;
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [nodes, edges, historyIndex, isLoading]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoingRef.current = true;
      const prevState = history[historyIndex - 1];
      setNodes(JSON.parse(JSON.stringify(prevState.nodes)));
      setEdges(JSON.parse(JSON.stringify(prevState.edges)));
      lastSnapshotRef.current = JSON.stringify(prevState);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => {isUndoingRef.current = false;}, 50);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoingRef.current = true;
      const nextState = history[historyIndex + 1];
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
      lastSnapshotRef.current = JSON.stringify(nextState);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => {isUndoingRef.current = false;}, 50);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const [activeTool, setActiveTool] = useState("select");
  const [drawingTool, setDrawingTool] = useState<DrawingTool>({ type: "pen", color: "#1a1a1a", size: 4 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
  const [drawingCanUndo, setDrawingCanUndo] = useState(false);
  const [drawingCanRedo, setDrawingCanRedo] = useState(false);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteInfo, setPendingDeleteInfo] = useState<{ nodeIds: string[]; edgeIds: string[] }>({ nodeIds: [], edgeIds: [] });

  const isDrawing = activeTool === "draw";
  const isRegionSelect = activeTool === "region";

  const reactFlowInstance = useReactFlow();
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const handleMove = useCallback(() => {
    const vp = reactFlowInstance.getViewport();
    setViewport(vp);
  }, [reactFlowInstance]);

  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    changes.forEach((change) => {
      if (change.type === "remove") {
        setSelectedNodeIds((prev) => prev.filter((id) => id !== change.id));
        setExpandedNodeId((prev) => (prev === change.id ? null : prev));
      }
    });
  }, [onNodesChange]);

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodeIds(selectedNodes.map((node) => node.id));
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setNodes((currentNodes) => currentNodes.map((currentNode) => ({
      ...currentNode,
      selected: currentNode.id === node.id,
    })));
    setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: false })));
    setSelectedNodeIds([node.id]);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (isDrawing && drawingCanvasRef.current) {
      const interval = setInterval(() => {
        if (drawingCanvasRef.current) {
          setDrawingCanUndo(drawingCanvasRef.current.canUndo);
          setDrawingCanRedo(drawingCanvasRef.current.canRedo);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isDrawing]);

  // Paste handler for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      // Check for plain text paste (outside input/textarea)
      let hasImage = false;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) { hasImage = true; break; }
      }

      if (!hasImage) {
        const text = e.clipboardData?.getData("text/plain");
        if (text && text.trim()) {
          e.preventDefault();
          const canvasCenter = reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          const id = `text-${Date.now()}`;
          const newNode: Node = {
            id,
            type: "text",
            position: canvasCenter,
            data: { text: text.trim(), fontSize: 16 },
          };
          setNodes((nds) => [...nds, newNode]);
          return;
        }
      }

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;

            // Get image natural dimensions
            const img = new Image();
            img.onload = () => {
              const vp = reactFlowInstance.getViewport();
              const canvasCenter = reactFlowInstance.screenToFlowPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              });
              const nodeId = addImageNode(dataUrl, img.naturalWidth, img.naturalHeight, canvasCenter);
              // Auto-pan to the new image
              setTimeout(() => {
                reactFlowInstance.setCenter(canvasCenter.x, canvasCenter.y, { zoom: vp.zoom, duration: 400 });
              }, 50);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          break; // Only handle first image
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [reactFlowInstance, addImageNode, setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        isDrawing ? drawingCanvasRef.current?.undo() : handleUndo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        isDrawing ? drawingCanvasRef.current?.redo() : handleRedo();
        return;
      }
      if (e.key === "t" && !e.metaKey && !e.ctrlKey) {e.preventDefault();addNode("topic");}
      if (e.key === "v" && !e.metaKey && !e.ctrlKey) {setActiveTool("select");}
      if (e.key === "d" && !e.metaKey && !e.ctrlKey) {setActiveTool("draw");}
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {setActiveTool("region");}
      if (e.key === "Escape") {setSelectedNodeIds([]);}
      // Delete/Backspace: delete selected nodes and edges
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((ed) => ed.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          if (selectedNodes.length > 0) {
            setPendingDeleteInfo({
              nodeIds: selectedNodes.map((n) => n.id),
              edgeIds: selectedEdges.map((ed) => ed.id),
            });
            setShowDeleteConfirm(true);
          } else {
            // Delete edges immediately without confirmation
            setEdges((eds) => eds.filter((ed) => !selectedEdges.some((s) => s.id === ed.id)));
          }
        }
      }
      // Ctrl+S: manual save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        flushSave();
        toast.success("Canvas saved");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addNode, isDrawing, handleUndo, handleRedo, flushSave, nodes, edges, setEdges]);

  const handleConfirmDelete = useCallback(() => {
    pendingDeleteInfo.nodeIds.forEach((id) => deleteNode(id));
    if (pendingDeleteInfo.edgeIds.length > 0) {
      setEdges((eds) => eds.filter((ed) => !pendingDeleteInfo.edgeIds.includes(ed.id)));
    }
    setSelectedNodeIds((prev) => prev.filter((id) => !pendingDeleteInfo.nodeIds.includes(id)));
    setShowDeleteConfirm(false);
    setPendingDeleteInfo({ nodeIds: [], edgeIds: [] });
  }, [pendingDeleteInfo, deleteNode, setEdges]);

  const handleToolChange = useCallback((toolId: string) => {
    if (toolId === "text") {addNode("text");setActiveTool("select");} else
    {setActiveTool(toolId);}
  }, [addNode]);

  const handleClearDrawings = useCallback(() => {
    drawingCanvasRef.current?.clearAll();
    toast.success("Drawings cleared");
  }, []);

  const handleClearAll = useCallback(() => {
    clearCanvas();
    drawingCanvasRef.current?.clearAll();
    setSelectedNodeIds([]);
  }, [clearCanvas]);

  const handlePromptSubmit = useCallback(async (prompt: string) => {
    setExpandedNodeId(null);
    const result = await generateKnowledgeCard(prompt);
    if (result && activeSessionId && onUpdateSessionName) {
      const name = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      onUpdateSessionName(activeSessionId, name, "bx-bulb");
    }
    if (result) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
      }, 100);
    }
  }, [generateKnowledgeCard, activeSessionId, onUpdateSessionName, reactFlowInstance]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        expanded: expandedNodeId === node.id,
        canExpand: node.type === "concept" || node.type === "topicCard",
        onToggleExpand: () => setExpandedNodeId((prev) => (prev === node.id ? null : node.id)),
        onUpdate: (newData: any) => updateNodeData(node.id, newData),
        onDelete: () => deleteNode(node.id)
      }
    }));
  }, [nodes, updateNodeData, deleteNode, expandedNodeId]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  const handleEditEdge = useCallback((edgeId: string, label: string, explanation: string) => {
    setEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, data: { ...e.data, label, explanation } } : e));
  }, [setEdges]);

  const edgesWithParallelism = useEdgeParallelism(edges);

  const edgesWithCallbacks = useMemo(() => {
    return edgesWithParallelism.map((edge) => ({
      ...edge,
      data: { ...edge.data, onDelete: handleDeleteEdge, onEdit: handleEditEdge }
    }));
  }, [edgesWithParallelism, handleDeleteEdge, handleEditEdge]);

  const getBackgroundVariant = (): BackgroundVariant | undefined => {
    switch (settings.canvasBackground) {
      case "dots":return BackgroundVariant.Dots;
      case "grid":return BackgroundVariant.Lines;
      default:return undefined;
    }
  };

  const backgroundVariant = getBackgroundVariant();

  // Determine panOnDrag based on active tool
  // Drawing mode: no pan (drawing canvas handles it)
  // Region select: no pan (ReactFlow selection handles it)
  // Select mode: pan normally
  const panOnDrag = activeTool === "select";

  const GeneratingLoader = () => (
    <RadialPulseLoader size={120} text="Generating" />
  );

  // Drag-and-drop image handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const dropPos = reactFlowInstance.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        addImageNode(dataUrl, img.naturalWidth, img.naturalHeight, dropPos);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [reactFlowInstance, addImageNode]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 loader-ring" />
            <div className="absolute inset-2 loader-ring-reverse" />
            <div className="w-2 h-2 rounded-full bg-foreground/30 loader-dot" />
          </div>
          <span className="text-sm text-foreground/40 font-medium tracking-wide">Loading canvas</span>
        </div>
      </div>);
  }

  return (
    <div ref={canvasRef} className="w-full h-full flex relative overflow-hidden" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div ref={containerRef} className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edgesWithCallbacks}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMove={handleMove}
          onNodeClick={handleNodeClick}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
          panOnDrag={panOnDrag}
          selectionOnDrag={isRegionSelect}
          selectNodesOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={!isDrawing}
          zoomOnPinch={!isDrawing}
          zoomOnDoubleClick={false}
          nodesDraggable={!isDrawing}
          nodesConnectable={!isDrawing}
          elementsSelectable={!isDrawing}
          multiSelectionKeyCode="Shift"
          defaultEdgeOptions={{
            type: "bezierLabeled",
            style: { stroke: "hsl(220 10% 25%)", strokeWidth: 2 },
            animated: false
          }}
          connectionLineStyle={{ stroke: "hsl(220 10% 30%)", strokeWidth: 2 }}>
          
          {backgroundVariant &&
          <Background
            variant={backgroundVariant}
            gap={backgroundVariant === BackgroundVariant.Dots ? 28 : 32}
            size={backgroundVariant === BackgroundVariant.Dots ? 3 : 1}
            color={backgroundVariant === BackgroundVariant.Dots ? "hsl(220 12% 50% / 0.6)" : "hsl(220 10% 70% / 0.2)"}
            className="pointer-events-none" />

          }
        </ReactFlow>

        {/* Generating overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none"
            >
              <GeneratingLoader />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drawing Canvas Overlay */}
        <DrawingCanvas
          ref={drawingCanvasRef}
          isActive={isDrawing}
          tool={drawingTool}
          width={canvasSize.width}
          height={canvasSize.height}
          viewport={viewport} />
        

        {/* Toolbar: left side on desktop, bottom-left on mobile */}
        {isMobile ? (
          <div className="absolute left-2 bottom-[140px] z-30">
            <Toolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              onAddTopic={() => addNode("topicCard")}
              onClear={handleClearAll} />
          </div>
        ) : (
          <motion.div
            animate={{ left: sidebarOpen ? 276 : 16 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-1/2 -translate-y-1/2 z-30"
          >
            <Toolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              onAddTopic={() => addNode("topicCard")}
              onClear={handleClearAll} />
          </motion.div>
        )}

        {/* Undo/Redo and Expand/Collapse controls */}
        <CanvasControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar} />
        

        {/* Bottom center toolbars */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 z-[60]",
          isMobile ? "bottom-3 w-[calc(100%-1rem)] px-1" : "bottom-6"
        )}>
          <AnimatePresence mode="wait">
            {isDrawing ?
            <motion.div
              key="drawing-toolbar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={isMobile ? "overflow-x-auto" : ""}>
              
                <DrawingToolbar
                isActive={isDrawing}
                currentTool={drawingTool}
                onToolChange={setDrawingTool}
                onClose={() => setActiveTool("select")}
                onClearDrawings={handleClearDrawings}
                onUndo={() => drawingCanvasRef.current?.undo()}
                onRedo={() => drawingCanvasRef.current?.redo()}
                canUndo={drawingCanUndo}
                canRedo={drawingCanRedo} />
              
              </motion.div> :

            <motion.div
              key="chat-input"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}>
              
                <FloatingChatInput
                placeholder={isMobile ? "Ask anything..." : "Ask anything to create a knowledge card..."}
                onSubmit={handlePromptSubmit}
                isLoading={isGenerating} />
              
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {pendingDeleteInfo.nodeIds.length} card{pendingDeleteInfo.nodeIds.length !== 1 ? "s" : ""}
              {pendingDeleteInfo.edgeIds.length > 0 && ` and ${pendingDeleteInfo.edgeIds.length} link${pendingDeleteInfo.edgeIds.length !== 1 ? "s" : ""}`}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
