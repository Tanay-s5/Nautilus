import { useState } from "react";
import { ChevronLeft, ChevronRight, Link2, Calendar, BookOpen, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface JournalEntry {
  id: string;
  date: Date;
  content: string;
  linkedNodes: string[];
}

interface JournalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, "id">) => void;
  onUpdateEntry: (id: string, content: string) => void;
  onLinkNode: (entryId: string, nodeId: string) => void;
  canvasNodes: Array<{ id: string; label: string }>;
}

export function Journal({
  isOpen,
  onClose,
  entries,
  onAddEntry,
  onUpdateEntry,
  onLinkNode,
  canvasNodes,
}: JournalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingContent, setEditingContent] = useState("");
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const todayEntry = entries.find((e) => isSameDay(new Date(e.date), selectedDate));

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const handleContentChange = (value: string) => {
    setEditingContent(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!editingContent.trim()) return;

    if (todayEntry) {
      onUpdateEntry(todayEntry.id, editingContent);
    } else {
      onAddEntry({
        date: selectedDate,
        content: editingContent,
        linkedNodes: [],
      });
    }
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-[600px] max-h-[80vh] glass-panel-solid overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Daily Journal</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/20">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-muted/60 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              {!isToday(selectedDate) && (
                <button
                  onClick={goToToday}
                  className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
                >
                  Go to Today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-muted/60 rounded-xl transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <textarea
              value={editingContent || todayEntry?.content || ""}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="What's on your mind today? Write your thoughts, ideas, or reflections..."
              className="w-full h-48 p-4 bg-muted/30 rounded-xl border border-border/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted-foreground/60"
            />

            {/* Linked Nodes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Linked Canvas Nodes</span>
                <button
                  onClick={() => setShowNodePicker(!showNodePicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                  Link Node
                </button>
              </div>

              {todayEntry?.linkedNodes && todayEntry.linkedNodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {todayEntry.linkedNodes.map((nodeId) => {
                    const node = canvasNodes.find((n) => n.id === nodeId);
                    return node ? (
                      <span
                        key={nodeId}
                        className="px-3 py-1.5 bg-muted/50 rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <Link2 className="w-3 h-3 text-accent" />
                        {node.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {showNodePicker && canvasNodes.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-xl border border-border/30 space-y-1 max-h-32 overflow-y-auto">
                  {canvasNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => {
                        if (todayEntry) {
                          onLinkNode(todayEntry.id, node.id);
                        }
                        setShowNodePicker(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 rounded-lg transition-colors"
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges && !editingContent}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                  hasChanges || editingContent
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                Save Entry
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
