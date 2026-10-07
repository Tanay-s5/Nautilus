// Client for the Nautilus Converge backend (FastAPI + PostgreSQL + Groq + sentence-transformers).
// See backend/main.py — one endpoint generates a card, embeds it, and links it
// against every previously stored card via weighted cosine similarity.

export interface Card {
  title: string;

  // FRONT (collapsed card)
  previewSummary: string;
  previewBullets: string[];

  // BACK (expanded card)
  details: string;

  // LINKING DATA
  applications: string[];
  analogy: string;
  corePrinciples: string[];
  mechanism: string[];
  examples: string[];
  misconceptions: string[];
  constraints: string[];
  problemPatterns: string;
  formalStructure: string[];
}

export interface StoredCard {
  id: number;
  data: Card;
}

export interface LinkRecord {
  lid: string;
  card_a_id: number;
  card_b_id: number;
  similarity: number;
  field_scores: Record<string, number>;
  // True when `similarity` fell within embedding.BOUNDARY_BAND of the link
  // threshold - i.e. a pair the default weights were least confident
  // about, and so the most useful to get a human rating on.
  is_boundary: boolean;
  top3_fields: string[];
  short_label: string;
  reason: string;
  // Only present on responses from GET /links: `similarity` recomputed
  // against the requesting user's personalized weights (or just equal to
  // `similarity` if that user hasn't been calibrated yet).
  user_similarity?: number;
}

export interface GenerateCardResponse {
  card: StoredCard;
  links: LinkRecord[];
}

export interface RatingResponse {
  message: string;
  refit_triggered: boolean;
  ratings_until_next_refit: number;
}

export interface UserWeightsResponse {
  user: string;
  weights: Record<string, number>;
  is_personalized: boolean;
  total_ratings: number;
  ratings_until_next_refit: number;
  batch_size: number;
}

export interface NautilusSettings {
  // Ratings the visitor needs (since their last refit) before their
  // personalized weights get recalculated. Adjustable from Settings, stored per visitor.
  batch_size: number;
}

// Each browser is one anonymous "visitor": a random UUID created on first load and kept in
// localStorage. It is sent as the X-Visitor-Id header on every request, and the backend scopes
// all cards, links, ratings, weights and settings to it. This identifies a browser; it does not
// authenticate it.
const VISITOR_ID_KEY = "nautilus-visitor-id";
let memoryVisitorId: string | null = null;

function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // crypto.randomUUID only exists in secure contexts (https / localhost); build a v4 UUID by hand otherwise.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getVisitorId(): string {
  if (memoryVisitorId) return memoryVisitorId;
  try {
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored) {
      memoryVisitorId = stored;
      return stored;
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall through to a per-tab id.
  }
  memoryVisitorId = newUuid();
  try {
    localStorage.setItem(VISITOR_ID_KEY, memoryVisitorId);
  } catch {
    // Not persisted: this visitor's data is only reachable until the tab closes.
  }
  return memoryVisitorId;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

const WEIGHTS_CACHE_KEY = "nautilus-weights-cache";

/** Last personalized weights.json fetched from the backend, cached
 * client-side so Settings/the rating panel have something to show
 * immediately on load instead of a blank state while the network request
 * is in flight. This is the only thing Nautilus persists in the browser
 * for personalization - no username, no auth, just the weights. */
export function getCachedWeights(): UserWeightsResponse | null {
  try {
    const raw = localStorage.getItem(WEIGHTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheWeights(weights: UserWeightsResponse) {
  try {
    localStorage.setItem(WEIGHTS_CACHE_KEY, JSON.stringify(weights));
  } catch {
    // localStorage unavailable (private browsing, etc.) - cache is
    // best-effort, not worth surfacing to the user.
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // response wasn't JSON - fall through to generic message
  }
  return `Request failed with status ${res.status}`;
}

/** fetch() that always identifies the visitor. */
function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Visitor-Id", getVisitorId());
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

/** Generate a new knowledge card from a prompt, and auto-link it against every existing card. */
export async function generateCard(prompt: string): Promise<GenerateCardResponse> {
  const res = await apiFetch("/generate-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Delete a card server-side (cascades to its links). Safe to call even if the card no longer exists. */
export async function deleteCard(cardId: number): Promise<void> {
  const res = await apiFetch(`/card/${cardId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(await parseErrorDetail(res), res.status);
  }
}

/** Wipes cards, links, and ratings server-side. Personalized weights and settings are preserved. */
export async function clearCanvasData(): Promise<void> {
  const res = await apiFetch("/canvas", { method: "DELETE" });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
}

export async function getAllCards(): Promise<StoredCard[]> {
  const res = await apiFetch("/cards");
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** All links, with `user_similarity` scored against the visitor's personalized weights (falls back to the global score if they don't have any yet). */
export async function getAllLinks(): Promise<LinkRecord[]> {
  const res = await apiFetch("/links");
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Links the visitor hasn't rated yet, closest to the link threshold first - the most useful ones for them to rate next. */
export async function getRatingCandidates(limit = 8): Promise<LinkRecord[]> {
  const res = await apiFetch(`/links/candidates?limit=${limit}`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Record how related the visitor found a link, 0-100. May trigger a background weight refit once enough ratings have accumulated. */
export async function submitRating(lid: string, rating: number): Promise<RatingResponse> {
  const res = await apiFetch("/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lid, rating }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

export async function getUserWeights(): Promise<UserWeightsResponse> {
  const res = await apiFetch("/weights");
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  const data = await res.json();
  cacheWeights(data);
  return data;
}

export async function getSettings(): Promise<NautilusSettings> {
  const res = await apiFetch("/settings");
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

export async function updateSettings(patch: Partial<NautilusSettings>): Promise<NautilusSettings> {
  const res = await apiFetch("/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Quick reachability check - used to surface a friendly error if the backend isn't running. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/ping`);
    return res.ok;
  } catch {
    return false;
  }
}

export { ApiError, API_BASE_URL };
