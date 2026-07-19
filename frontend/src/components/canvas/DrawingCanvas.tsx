import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { DrawingTool } from "./DrawingToolbar";
import getStroke from "perfect-freehand";

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  points: Point[];
  tool: DrawingTool;
  worldPoints: Point[];
}

interface Shape {
  type: "rectangle" | "circle" | "arrow" | "line";
  start: Point;
  end: Point;
  tool: DrawingTool;
  worldStart: Point;
  worldEnd: Point;
}

interface TextElement {
  worldPosition: Point;
  text: string;
  color: string;
  fontSize: number;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface DrawingCanvasProps {
  isActive: boolean;
  tool: DrawingTool;
  width: number;
  height: number;
  viewport?: Viewport;
}

export interface DrawingCanvasHandle {
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryState {
  strokes: Stroke[];
  shapes: Shape[];
  texts: TextElement[];
}

const STORAGE_KEY = "turtle-canvas-drawings";
const SHAPES_STORAGE_KEY = "turtle-canvas-shapes";
const TEXTS_STORAGE_KEY = "turtle-canvas-texts";

const loadStrokes = (): Stroke[] => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const loadShapes = (): Shape[] => { try { const s = localStorage.getItem(SHAPES_STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const loadTexts = (): TextElement[] => { try { const s = localStorage.getItem(TEXTS_STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const saveStrokes = (d: Stroke[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };
const saveShapes = (d: Shape[]) => { try { localStorage.setItem(SHAPES_STORAGE_KEY, JSON.stringify(d)); } catch {} };
const saveTexts = (d: TextElement[]) => { try { localStorage.setItem(TEXTS_STORAGE_KEY, JSON.stringify(d)); } catch {} };

function getSvgPathFromStroke(points: number[][]) {
  if (!points.length) return "";
  const d: string[] = [];
  let p0 = points[0];
  d.push(`M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`);
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i];
    const midX = (p0[0] + p1[0]) / 2;
    const midY = (p0[1] + p1[1]) / 2;
    d.push(`Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`);
    p0 = p1;
  }
  d.push("Z");
  return d.join(" ");
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ isActive, tool, width, height, viewport = { x: 0, y: 0, zoom: 1 } }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>(loadStrokes);
    const [shapes, setShapes] = useState<Shape[]>(loadShapes);
    const [texts, setTexts] = useState<TextElement[]>(loadTexts);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [currentWorldStroke, setCurrentWorldStroke] = useState<Point[]>([]);
    const [shapeStart, setShapeStart] = useState<Point | null>(null);
    const [worldShapeStart, setWorldShapeStart] = useState<Point | null>(null);
    const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
    const [worldCurrentEnd, setWorldCurrentEnd] = useState<Point | null>(null);

    // Text input state
    const [textInputPos, setTextInputPos] = useState<Point | null>(null);
    const [textInputWorldPos, setTextInputWorldPos] = useState<Point | null>(null);
    const [textInputValue, setTextInputValue] = useState("");
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const isShapeTool = ["rectangle", "circle", "arrow", "line"].includes(tool.type);
    const isTextTool = tool.type === "text";

    useEffect(() => {
      if (history.length === 0) {
        const initialState = { strokes: loadStrokes(), shapes: loadShapes(), texts: loadTexts() };
        setHistory([initialState]);
        setHistoryIndex(0);
      }
    }, []);

    const saveToHistory = useCallback((newStrokes: Stroke[], newShapes: Shape[], newTexts: TextElement[]) => {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ strokes: newStrokes, shapes: newShapes, texts: newTexts });
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    useEffect(() => { saveStrokes(strokes); }, [strokes]);
    useEffect(() => { saveShapes(shapes); }, [shapes]);
    useEffect(() => { saveTexts(texts); }, [texts]);

    useImperativeHandle(ref, () => ({
      clearAll: () => {
        setStrokes([]);
        setShapes([]);
        setTexts([]);
        saveToHistory([], [], []);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SHAPES_STORAGE_KEY);
        localStorage.removeItem(TEXTS_STORAGE_KEY);
      },
      undo: () => {
        if (historyIndex > 0) {
          const state = history[historyIndex - 1];
          setStrokes(state.strokes);
          setShapes(state.shapes);
          setTexts(state.texts);
          setHistoryIndex(historyIndex - 1);
        }
      },
      redo: () => {
        if (historyIndex < history.length - 1) {
          const state = history[historyIndex + 1];
          setStrokes(state.strokes);
          setShapes(state.shapes);
          setTexts(state.texts);
          setHistoryIndex(historyIndex + 1);
        }
      },
      canUndo,
      canRedo,
    }), [historyIndex, history, canUndo, canRedo, saveToHistory]);

    const screenToWorld = useCallback((point: Point): Point => ({
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom,
    }), [viewport]);

    const worldToScreen = useCallback((point: Point): Point => ({
      x: point.x * viewport.zoom + viewport.x,
      y: point.y * viewport.zoom + viewport.y,
    }), [viewport]);

    const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: (e as any).pressure || 0.5 };
    }, []);

    // Commit text input
    const commitTextInput = useCallback(() => {
      if (textInputValue.trim() && textInputWorldPos) {
        const newTexts = [...texts, {
          worldPosition: textInputWorldPos,
          text: textInputValue.trim(),
          color: tool.color,
          fontSize: Math.max(tool.size * 2, 16),
        }];
        setTexts(newTexts);
        saveToHistory(strokes, shapes, newTexts);
      }
      setTextInputPos(null);
      setTextInputWorldPos(null);
      setTextInputValue("");
    }, [textInputValue, textInputWorldPos, texts, tool, strokes, shapes, saveToHistory]);

    // Selective eraser: find and remove element under click
    const eraseAtPoint = useCallback((screenPoint: Point) => {
      const worldPoint = screenToWorld(screenPoint);

      // Check texts (reverse order, top-most first)
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        const fontSize = t.fontSize * viewport.zoom;
        const screen = worldToScreen(t.worldPosition);
        const lines = t.text.split("\n");
        const textWidth = t.text.length * fontSize * 0.6;
        const textHeight = lines.length * fontSize * 1.2;
        if (screenPoint.x >= screen.x - 5 && screenPoint.x <= screen.x + textWidth + 5 &&
            screenPoint.y >= screen.y - 5 && screenPoint.y <= screen.y + textHeight + 5) {
          const newTexts = texts.filter((_, idx) => idx !== i);
          setTexts(newTexts);
          saveToHistory(strokes, shapes, newTexts);
          return true;
        }
      }

      // Check shapes (reverse order)
      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        const s = worldToScreen(shape.worldStart);
        const en = worldToScreen(shape.worldEnd);
        const minX = Math.min(s.x, en.x) - 10;
        const maxX = Math.max(s.x, en.x) + 10;
        const minY = Math.min(s.y, en.y) - 10;
        const maxY = Math.max(s.y, en.y) + 10;
        if (screenPoint.x >= minX && screenPoint.x <= maxX && screenPoint.y >= minY && screenPoint.y <= maxY) {
          const newShapes = shapes.filter((_, idx) => idx !== i);
          setShapes(newShapes);
          saveToHistory(strokes, newShapes, texts);
          return true;
        }
      }

      // Check strokes (reverse order) - check proximity to any point
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        const wp = stroke.worldPoints || stroke.points;
        for (const p of wp) {
          const sp = stroke.worldPoints ? worldToScreen(p) : p;
          const dx = screenPoint.x - sp.x;
          const dy = screenPoint.y - sp.y;
          if (Math.sqrt(dx * dx + dy * dy) < 15) {
            const newStrokes = strokes.filter((_, idx) => idx !== i);
            setStrokes(newStrokes);
            saveToHistory(newStrokes, shapes, texts);
            return true;
          }
        }
      }
      return false;
    }, [strokes, shapes, texts, screenToWorld, worldToScreen, viewport.zoom, saveToHistory]);

    const isEraserTool = tool.type === "eraser";

    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive) return;

      if (isEraserTool) {
        const screenPoint = getCanvasPoint(e);
        eraseAtPoint(screenPoint);
        return;
      }

      if (isTextTool) {
        if (textInputPos) commitTextInput();
        const screenPoint = getCanvasPoint(e);
        const worldPoint = screenToWorld(screenPoint);
        setTextInputPos(screenPoint);
        setTextInputWorldPos(worldPoint);
        setTextInputValue("");
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }

      setIsDrawing(true);
      const screenPoint = getCanvasPoint(e);
      const worldPoint = screenToWorld(screenPoint);
      if (isShapeTool) {
        setShapeStart(screenPoint);
        setWorldShapeStart(worldPoint);
        setCurrentEnd(screenPoint);
        setWorldCurrentEnd(worldPoint);
      } else {
        setCurrentStroke([screenPoint]);
        setCurrentWorldStroke([worldPoint]);
      }
    }, [isActive, getCanvasPoint, isShapeTool, isTextTool, isEraserTool, screenToWorld, textInputPos, commitTextInput, eraseAtPoint]);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isActive) return;
      const screenPoint = getCanvasPoint(e);
      const worldPoint = screenToWorld(screenPoint);
      if (isShapeTool) {
        setCurrentEnd(screenPoint);
        setWorldCurrentEnd(worldPoint);
      } else {
        setCurrentStroke(prev => [...prev, screenPoint]);
        setCurrentWorldStroke(prev => [...prev, worldPoint]);
      }
    }, [isDrawing, isActive, getCanvasPoint, isShapeTool, screenToWorld]);

    const stopDrawing = useCallback(() => {
      if (!isDrawing) return;
      if (isShapeTool && worldShapeStart && worldCurrentEnd) {
        const newShapes = [...shapes, {
          type: tool.type as Shape["type"],
          start: shapeStart!, end: currentEnd!,
          worldStart: worldShapeStart, worldEnd: worldCurrentEnd,
          tool: { ...tool },
        }];
        setShapes(newShapes);
        saveToHistory(strokes, newShapes, texts);
        setShapeStart(null); setWorldShapeStart(null);
        setCurrentEnd(null); setWorldCurrentEnd(null);
      } else if (currentWorldStroke.length > 0) {
        const newStrokes = [...strokes, { points: currentStroke, worldPoints: currentWorldStroke, tool: { ...tool } }];
        setStrokes(newStrokes);
        saveToHistory(newStrokes, shapes, texts);
        setCurrentStroke([]); setCurrentWorldStroke([]);
      }
      setIsDrawing(false);
    }, [isDrawing, currentStroke, currentWorldStroke, tool, isShapeTool, shapeStart, worldShapeStart, currentEnd, worldCurrentEnd, strokes, shapes, texts, saveToHistory]);

    const drawSmoothStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[], strokeTool: DrawingTool, zoom: number) => {
      if (points.length < 2) return;
      const isPen = strokeTool.type === "pen";
      const isBrush = strokeTool.type === "brush";
      const isHighlighter = strokeTool.type === "highlighter";
      const isEraser = strokeTool.type === "eraser";

      if (isEraser) return; // Eraser is now click-to-remove, no painting

      const size = (isPen ? strokeTool.size : isBrush ? strokeTool.size * 1.5 : strokeTool.size * 3) * zoom;
      const outlinePoints = getStroke(
        points.map(p => [p.x, p.y, p.pressure || 0.5]),
        { size, thinning: isPen ? 0.5 : isBrush ? 0.3 : 0, smoothing: 0.5, streamline: 0.5, simulatePressure: true }
      );
      const pathStr = getSvgPathFromStroke(outlinePoints);
      if (!pathStr) return;
      const path = new Path2D(pathStr);
      ctx.globalAlpha = isHighlighter ? 0.3 : isBrush ? 0.8 : 1;
      ctx.fillStyle = strokeTool.color;
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }, []);

    const drawShape = useCallback((ctx: CanvasRenderingContext2D, start: Point, end: Point, shapeTool: DrawingTool, shapeType: Shape["type"], isPreview = false) => {
      ctx.beginPath();
      ctx.strokeStyle = shapeTool.color;
      ctx.lineWidth = shapeTool.size * viewport.zoom;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = isPreview ? 0.5 : 1;
      switch (shapeType) {
        case "rectangle": ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y); break;
        case "circle": {
          const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
          ctx.ellipse(start.x + (end.x - start.x) / 2, start.y + (end.y - start.y) / 2, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke(); break;
        }
        case "arrow": {
          ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const hl = 15 * viewport.zoom;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y); ctx.lineTo(end.x - hl * Math.cos(angle - Math.PI / 6), end.y - hl * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(end.x, end.y); ctx.lineTo(end.x - hl * Math.cos(angle + Math.PI / 6), end.y - hl * Math.sin(angle + Math.PI / 6));
          ctx.stroke(); break;
        }
        case "line": ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); break;
      }
      ctx.globalAlpha = 1;
    }, [viewport.zoom]);

    // Render
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      strokes.forEach((stroke) => {
        const wp = stroke.worldPoints || stroke.points;
        if (!wp || wp.length < 2) return;
        const sp = stroke.worldPoints ? wp.map(worldToScreen) : wp;
        drawSmoothStroke(ctx, sp, stroke.tool, viewport.zoom);
      });

      shapes.forEach((shape) => {
        const ws = shape.worldStart || shape.start;
        const we = shape.worldEnd || shape.end;
        if (!ws || !we) return;
        drawShape(ctx, shape.worldStart ? worldToScreen(ws) : ws, shape.worldEnd ? worldToScreen(we) : we, shape.tool, shape.type);
      });

      // Draw text elements
      texts.forEach((t) => {
        const screen = worldToScreen(t.worldPosition);
        ctx.font = `${t.fontSize * viewport.zoom}px 'Caveat', cursive`;
        ctx.fillStyle = t.color;
        ctx.textBaseline = "top";
        const lines = t.text.split("\n");
        lines.forEach((line, i) => {
          ctx.fillText(line, screen.x, screen.y + i * t.fontSize * viewport.zoom * 1.2);
        });
      });

      if (currentStroke.length > 1) drawSmoothStroke(ctx, currentStroke, tool, 1);
      if (isShapeTool && shapeStart && currentEnd && isDrawing) drawShape(ctx, shapeStart, currentEnd, tool, tool.type as Shape["type"], true);
    }, [strokes, shapes, texts, currentStroke, tool, width, height, shapeStart, currentEnd, isDrawing, isShapeTool, drawShape, drawSmoothStroke, viewport, worldToScreen]);

    // Focus text input when shown
    useEffect(() => {
      if (textInputPos && textInputRef.current) textInputRef.current.focus();
    }, [textInputPos]);

    if (width === 0 || height === 0) return null;

    return (
      <>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={isActive ? "drawing-canvas active" : "drawing-canvas"}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{
            position: "absolute",
            top: 0, left: 0,
            pointerEvents: isActive ? "auto" : "none",
            zIndex: isActive ? 20 : 1,
            cursor: isActive ? (isEraserTool ? "crosshair" : isTextTool ? "text" : undefined) : undefined,
          }}
        />
        {/* Floating text input */}
        {textInputPos && isActive && (
          <div
            style={{
              position: "absolute",
              left: textInputPos.x,
              top: textInputPos.y,
              zIndex: 25,
              pointerEvents: "auto",
            }}
          >
            <textarea
              ref={textInputRef}
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextInput();
                }
                if (e.key === "Escape") {
                  setTextInputPos(null);
                  setTextInputWorldPos(null);
                  setTextInputValue("");
                }
              }}
              onBlur={commitTextInput}
              className="bg-transparent border-none outline-none resize-none p-0 m-0"
              style={{
                color: tool.color,
                fontSize: Math.max(tool.size * 2, 16),
                fontFamily: "'Caveat', cursive",
                minWidth: 100,
                minHeight: 30,
                caretColor: tool.color,
              }}
              placeholder="Type here..."
              rows={1}
            />
          </div>
        )}
      </>
    );
  }
);
