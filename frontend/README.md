# Nautilus (frontend)

Nautilus is a canvas-based knowledge graph tool. Type a prompt, and Nautilus
generates a structured "knowledge card" and auto-links it to related cards
already on the canvas, based on semantic similarity computed by the backend.

This is **Converge mode only** — the earlier Topic/Card/Flowchart/Mindmap
generation modes (and the Supabase backend they used) have been removed. See
the root `README.md` for the full project (this frontend + the Python backend).

## Tech stack
- React 18 + TypeScript, Vite 5, Tailwind CSS 3.4, shadcn/ui
- @xyflow/react (React Flow) for the canvas, Framer Motion for animation
- perfect-freehand + roughjs for the sketch/drawing layer
- react-markdown + remark-gfm for card content
- Talks to the FastAPI backend in `../backend` over plain fetch (`src/lib/api.ts`)

## Getting started
```bash
npm install
npm run dev
```
Runs on http://localhost:8080 (see `vite.config.ts`).

Set `VITE_API_URL` in `.env` if the backend isn't on `http://localhost:8000`
(the default already checked into `.env`).

**The backend must be running** for card generation to work — see
`../backend/README.md`. Everything else (canvas, drawing, sessions, manual
node creation, journal) works without it.

## Architecture
- **`useCanvasStore`** (`src/hooks/useCanvasStore.ts`) — central state: nodes,
  edges, per-canvas persistence (localStorage), and `generateKnowledgeCard`,
  which calls the backend and turns the response into a node + edges.
- **`BuildingCard`** (`src/components/canvas/nodes/BuildingCard.tsx`) — the
  Converge card node. Shows title + summary bullets by default;
  double-click expands in place to show the full explanation.
- **`BezierLabeledEdge`** (`src/components/canvas/edges/BezierLabeledEdge.tsx`)
  — the link between two cards. Shows a short label (top matching fields) by
  default; double-click opens a panel with the similarity % and the
  LLM-generated reason for the link.
- **`src/lib/api.ts`** — typed client for the backend's `/generate-card`,
  `/card/{id}`, etc.

## Known limitation
The backend keeps one global graph (`cards.json`/`links.json`), not one per
canvas/session. If you generate cards in two different canvases, they're
still compared against each other server-side — but an edge is only drawn on
a canvas if the *other* card is actually a node on that canvas. See the
backend README for more on this.
