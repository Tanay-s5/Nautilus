import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ReactFlowProvider } from "@xyflow/react";
import { KnowledgeCanvas } from "@/components/canvas/KnowledgeCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { SettingsPanel, CanvasSettings } from "@/components/SettingsPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { useCanvasStore, CanvasStoreProvider } from "@/hooks/useCanvasStore";
import { useChatHistory } from "@/hooks/useChatHistory";
import backgroundImg from "@/assets/background-scenery.png";

const SETTINGS_KEY = "nautilus-settings";

function loadSettings(): CanvasSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    theme: "light",
    canvasBackground: "none",
  };
}

function saveSettings(s: CanvasSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

const IndexContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [settings, setSettings] = useState<CanvasSettings>(loadSettings);

  const handleSettingsChange = useCallback((newSettings: CanvasSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const {
    nodes,
    addNode,
    clearCanvas: clearCanvasStore,
    loadCanvasById,
    canvasId,
    flushSave,
    saveStatus,
  } = useCanvasStore();

  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    updateSessionName,
    deleteSession,
  } = useChatHistory();

  // Load canvas when active session changes
  useEffect(() => {
    if (activeSession?.canvas_id && activeSession.canvas_id !== canvasId) {
      loadCanvasById(activeSession.canvas_id);
    }
  }, [activeSession?.canvas_id, canvasId, loadCanvasById]);

  // Apply theme from settings
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (settings.theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [settings.theme]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNewCanvas = useCallback(async () => {
    // Block creating a new canvas if current one is empty
    if (nodes.length === 0) {
      toast.info("Add some content to the current canvas first");
      return;
    }
    flushSave();
    const session = await createSession();
    if (session) {
      // loadCanvasById will load the new empty canvas
    }
  }, [createSession, flushSave, nodes.length]);

  const handleSelectSession = useCallback((id: string) => {
    flushSave();
    selectSession(id);
  }, [selectSession, flushSave]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
  }, [deleteSession]);

  const handleNewCard = useCallback(() => {
    addNode("content");
    setCommandPaletteOpen(false);
  }, [addNode]);

  const handleNewTopic = useCallback(() => {
    addNode("topic");
    setCommandPaletteOpen(false);
  }, [addNode]);

  const handleClearCanvas = useCallback(() => {
    clearCanvasStore();
    setCommandPaletteOpen(false);
  }, [clearCanvasStore]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Full-screen canvas */}
      <main className="w-full h-full p-1 md:p-3 overflow-hidden">
        <div className="w-full h-full glass-container overflow-hidden py-[2px] px-[2px] relative rounded-lg md:rounded-xl">
          {/* No save indicator - auto-save runs silently */}
          <ReactFlowProvider>
            <KnowledgeCanvas
              settings={settings}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              sidebarOpen={sidebarOpen}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              activeSessionId={activeSessionId}
              onUpdateSessionName={updateSessionName}
            />
          </ReactFlowProvider>

          {/* Sidebar overlaid inside the canvas area */}
          <LeftSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewCanvas={handleNewCanvas}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={(id, name) => updateSessionName(id, name)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
        </div>
      </main>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNewCard={handleNewCard}
        onNewTopic={handleNewTopic}
        onOpenSettings={() => {
          setCommandPaletteOpen(false);
          setSettingsOpen(true);
        }}
        onClearCanvas={handleClearCanvas}
      />
    </div>
  );
};

const Index = () => (
  <CanvasStoreProvider>
    <IndexContent />
  </CanvasStoreProvider>
);

export default Index;
