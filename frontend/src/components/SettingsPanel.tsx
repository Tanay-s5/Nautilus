import { useEffect } from "react";
import { X, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CanvasSettings;
  onSettingsChange: (settings: CanvasSettings) => void;
}

export interface CanvasSettings {
  theme: "light" | "dark" | "system";
  canvasBackground: "dots" | "grid" | "none";
}

const themeOptions = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

const backgroundOptions = [
  { value: "none", label: "Clean" },
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
];

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const updateSetting = <K extends keyof CanvasSettings>(key: K, value: CanvasSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-[400px] max-w-[calc(100vw-2rem)] pointer-events-auto rounded-lg bg-background border border-border shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Appearance */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Appearance
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const active = settings.theme === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => updateSetting("theme", option.value as CanvasSettings["theme"])}
                          className={cn(
                            "flex flex-col items-center gap-2 py-3 px-2 rounded-md border text-xs font-medium transition-all",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Canvas Background */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Canvas Background
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {backgroundOptions.map((option) => {
                      const active = settings.canvasBackground === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => updateSetting("canvasBackground", option.value as CanvasSettings["canvasBackground"])}
                          className={cn(
                            "py-2.5 rounded-md border text-xs font-medium transition-all",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
