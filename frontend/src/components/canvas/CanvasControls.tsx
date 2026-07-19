import { Undo2, Redo2, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface CanvasControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const SIDEBAR_WIDTH = 260 + 16;

export function CanvasControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  sidebarOpen,
  onToggleSidebar,
}: CanvasControlsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar: hamburger + undo/redo */}
        <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between">
          <button
            onClick={onToggleSidebar}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
              "bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
              "hover:bg-muted/60 text-foreground"
            )}
            title="Menu"
          >
            <Menu className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-sm">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                canUndo ? "hover:bg-muted/60 text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <div className="w-px h-5 bg-border/50" />
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                canRedo ? "hover:bg-muted/60 text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Undo/Redo - Top Left, shifts with sidebar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0, left: sidebarOpen ? SIDEBAR_WIDTH : 12 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="absolute top-3 z-30 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-sm"
      >
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150",
            canUndo ? "hover:bg-muted/60 text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <div className="w-px h-5 bg-border/50" />
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150",
            canRedo ? "hover:bg-muted/60 text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
          )}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </motion.div>

      {/* Expand sidebar button - desktop only */}
      {!sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, left: 12 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="absolute bottom-3 z-30"
        >
          <button
            onClick={onToggleSidebar}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150",
              "bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
              "hover:bg-muted/60 text-foreground"
            )}
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </motion.div>
      )}
    </>
  );
}
