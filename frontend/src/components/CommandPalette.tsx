import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Plus, 
  Layers, 
  Settings, 
  Trash2,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewCard: () => void;
  onNewTopic: () => void;
  onOpenSettings: () => void;
  onClearCanvas: () => void;
}

const commands = [
  { id: "new-card", label: "New Card", icon: Plus, shortcut: "N", category: "Create" },
  { id: "new-topic", label: "New Topic", icon: Layers, shortcut: "T", category: "Create" },
  { id: "settings", label: "Open Settings", icon: Settings, shortcut: "", category: "Navigate" },
  { id: "clear", label: "Clear Canvas", icon: Trash2, shortcut: "", category: "Actions" },
];

export function CommandPalette({
  isOpen,
  onClose,
  onNewCard,
  onNewTopic,
  onOpenSettings,
  onClearCanvas,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeCommand = (commandId: string) => {
    switch (commandId) {
      case "new-card": onNewCard(); break;
      case "new-topic": onNewTopic(); break;
      case "settings": onOpenSettings(); break;
      case "clear": onClearCanvas(); break;
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex].id);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="w-[520px] glass-panel-solid overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
            />
            <kbd className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground">ESC</kbd>
          </div>

          {/* Commands */}
          <div className="max-h-[320px] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No commands found
              </div>
            ) : (
              filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors text-left",
                      index === selectedIndex 
                        ? "bg-muted text-foreground" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] bg-muted-foreground/10 px-2 py-0.5 rounded text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="bg-muted px-1.5 py-0.5 rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-muted px-1.5 py-0.5 rounded">↵</kbd> Select
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="w-3 h-3" />
              <span>+ K to open</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
