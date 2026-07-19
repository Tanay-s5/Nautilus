import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, Command, X, PanelLeft, Pencil, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useChatHistory";
import { useIsMobile } from "@/hooks/use-mobile";
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

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewCanvas: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onRenameSession?: (id: string, name: string) => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

export function LeftSidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onNewCanvas,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onOpenSettings,
  onOpenCommandPalette,
}: LeftSidebarProps) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const startRename = (session: ChatSession) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameSession?.(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteSessionName = deleteConfirmId
    ? sessions.find((session) => session.id === deleteConfirmId)?.name || "this canvas"
    : "";

  const handleSelectAndClose = (id: string) => {
    onSelectSession(id);
    if (isMobile) onToggle();
  };

  const sidebarContent = (
    <>
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bx bx-shell text-lg text-accent"></i>
            <span className="brand-nautilus leading-none">Nautilus</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewCanvas}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors"
              title="New Canvas"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {isMobile && (
              <button
                onClick={onToggle}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2.5 py-2 md:py-1.5 rounded-lg bg-muted/40 border border-border/30">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search canvases…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="space-y-1">
          {filteredSessions.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-6">
              {searchQuery ? "No matches" : "No canvases yet"}
            </p>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id;

              return (
                <div key={session.id} className="relative group">
                  {renamingId === session.id ? (
                    <div className="flex items-center gap-1 p-1.5">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") {
                            setRenamingId(null);
                            setRenameValue("");
                          }
                        }}
                        onBlur={commitRename}
                        className="flex-1 px-2 py-1 text-xs bg-muted/60 rounded-lg border border-border/50 outline-none focus:ring-1 focus:ring-accent/40"
                      />
                      <button onClick={commitRename} className="p-1 rounded hover:bg-muted">
                        <Check className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectAndClose(session.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg text-left transition-all pr-14 border-l-2 pl-3 py-2.5 md:py-2",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted/35"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <i
                        className={cn(
                          "bx text-base flex-shrink-0",
                          session.icon,
                          isActive ? "text-foreground" : "text-muted-foreground/55"
                        )}
                      ></i>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs truncate transition-colors",
                            isActive ? "text-foreground font-semibold" : "text-muted-foreground/70"
                          )}
                        >
                          {session.name}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] truncate transition-colors",
                            isActive ? "text-foreground/60" : "text-muted-foreground/45"
                          )}
                        >
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                    </button>
                  )}

                  {renamingId !== session.id && (
                    <div
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity",
                        isMobile || isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                        className="p-1.5 md:p-1 rounded hover:bg-muted transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(session.id);
                        }}
                        className="p-1.5 md:p-1 rounded hover:bg-destructive/20 transition-colors"
                        title="Delete"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border/30 px-3 py-2 flex items-center gap-1">
        <button
          onClick={() => {
            onOpenSettings();
            if (isMobile) onToggle();
          }}
          className="flex items-center gap-1.5 px-2.5 h-9 md:h-8 rounded-lg hover:bg-muted/60 transition-colors flex-1"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground font-medium">Settings</span>
        </button>
        {!isMobile && (
          <button
            onClick={onOpenCommandPalette}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors flex-shrink-0"
            title="Command (Ctrl+K)"
          >
            <Command className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors flex-shrink-0"
            title="Collapse Sidebar"
          >
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen &&
          (isMobile ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onToggle}
                className="absolute inset-0 z-40 bg-black/40"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute left-0 top-0 bottom-0 z-50 w-[85%] max-w-[320px] flex flex-col bg-background border-r border-border/30 overflow-hidden"
              >
                {sidebarContent}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-3 top-3 bottom-3 z-50 flex flex-col glass-panel-solid overflow-hidden px-[2px] py-[2px]"
              style={{ borderRadius: 16 }}
            >
              {sidebarContent}
            </motion.div>
          ))}
      </AnimatePresence>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<span className="font-medium">{deleteSessionName}</span>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) onDeleteSession?.(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
