import { Maximize2, Save, Plus, Minus } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useState, useEffect } from "react";

export function ZoomControlsInner() {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    // Update zoom on mount
    setZoom(Math.round(getZoom() * 100));
  }, [getZoom]);

  const handleZoomIn = () => {
    zoomIn();
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 50);
  };

  const handleZoomOut = () => {
    zoomOut();
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 50);
  };

  const handleFitView = () => {
    fitView({ padding: 0.2 });
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 100);
  };

  return (
    <div className="glass-toolbar px-2 py-1.5 flex items-center gap-1 mb-2">
      <button
        onClick={handleFitView}
        className="p-1.5 hover:bg-muted/60 rounded-md transition-colors"
        title="Fit view"
      >
        <Maximize2 className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <button className="p-1.5 hover:bg-muted/60 rounded-md transition-colors" title="Save">
        <Save className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="h-4 w-px bg-border/50 mx-1" />
      
      <span className="text-xs text-muted-foreground font-medium min-w-[40px] text-center">
        {zoom}%
      </span>
      
      <button
        onClick={handleZoomIn}
        className="p-1.5 hover:bg-muted/60 rounded-md transition-colors"
        title="Zoom in"
      >
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <button
        onClick={handleZoomOut}
        className="p-1.5 hover:bg-muted/60 rounded-md transition-colors"
        title="Zoom out"
      >
        <Minus className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
