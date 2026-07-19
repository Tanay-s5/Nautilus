import { MousePointer2, Layers, Pencil, Type, Trash2, BoxSelect, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAddTopic: () => void;
  onClear: () => void;
}

const tools = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "region", icon: BoxSelect, label: "Region Select (R)" },
  { id: "topic", icon: Layers, label: "Add Topic (T)" },
  { id: "draw", icon: Pencil, label: "Draw (D)" },
  { id: "text", icon: Type, label: "Add Text" },
];

const mobileMainTools = ["select", "draw"];
const mobileExtraTools = ["region", "topic", "text"];

export function Toolbar({ 
  activeTool, 
  onToolChange, 
  onAddTopic, 
  onClear 
}: ToolbarProps) {
  const isMobile = useIsMobile();
  const [showMore, setShowMore] = useState(false);

  const handleToolClick = (toolId: string) => {
    if (toolId === "topic") {
      onAddTopic();
    } else {
      onToolChange(toolId);
    }
    setShowMore(false);
  };

  if (isMobile) {
    const mainTools = tools.filter(t => mobileMainTools.includes(t.id));
    const extraTools = tools.filter(t => mobileExtraTools.includes(t.id));

    return (
      <div className="relative">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-toolbar p-1 flex flex-row gap-0.5 items-center"
        >
          {mainTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <motion.button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150",
                  "hover:bg-muted/60",
                  isActive && "bg-foreground/8 text-foreground shadow-sm"
                )}
                title={tool.label}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </motion.button>
            );
          })}

          <div className="w-px h-5 bg-border/50" />

          <motion.button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150",
              "hover:bg-muted/60",
              showMore && "bg-foreground/8 text-foreground"
            )}
            title="More tools"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
          </motion.button>

          <div className="w-px h-5 bg-border/50" />

          <motion.button
            onClick={onClear}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 glass-toolbar p-1 flex flex-row gap-0.5"
            >
              {extraTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <motion.button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150",
                      "hover:bg-muted/60",
                      isActive && "bg-foreground/8 text-foreground shadow-sm"
                    )}
                    title={tool.label}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-toolbar p-1.5 flex flex-col gap-0.5"
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <motion.button
            key={tool.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150",
              "hover:bg-muted/60",
              isActive && "bg-foreground/8 text-foreground shadow-sm"
            )}
            title={tool.label}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </motion.button>
        );
      })}
      
      <div className="h-px bg-border/50 my-1.5" />
      
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={onClear}
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
        title="Clear Canvas"
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
      </motion.button>
    </motion.div>
  );
}
