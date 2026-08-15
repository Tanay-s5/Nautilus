// Client for the Nautilus Converge backend (FastAPI + Groq + sentence-transformers).
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
  // Ratings a user needs (since their last refit) before their
  // personalized weights get recalculated. Adjustable from Settings.
  batch_size: number;
}

// Single-operator demo - no login, no user switcher. Every request is
// scoped to this one implicit user; the only personalization state kept
// client-side is the fitted weight vector itself (see getCachedWeights
// below), not an identity.
export const DEFAULT_USER = "default";

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

/** Generate a new knowledge card from a prompt, and auto-link it against every existing card. */
export async function generateCard(prompt: string): Promise<GenerateCardResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Delete a card server-side (cascades to its links). Safe to call even if the card no longer exists. */
export async function deleteCard(cardId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/card/${cardId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(await parseErrorDetail(res), res.status);
  }
}

/** Wipes cards, links, and ratings server-side. Personalized weights and settings are preserved. */
export async function clearCanvasData(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/canvas`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
}

export async function getAllCards(): Promise<StoredCard[]> {
  const res = await fetch(`${API_BASE_URL}/cards`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** All links, with `user_similarity` scored against `user`'s personalized weights (falls back to the global score if they don't have any yet). */
export async function getAllLinks(user: string = DEFAULT_USER): Promise<LinkRecord[]> {
  const res = await fetch(`${API_BASE_URL}/links?user=${encodeURIComponent(user)}`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Links `user` hasn't rated yet, closest to the link threshold first - the most useful ones for them to rate next. */
export async function getRatingCandidates(user: string, limit = 8): Promise<LinkRecord[]> {
  const res = await fetch(`${API_BASE_URL}/links/candidates?user=${encodeURIComponent(user)}&limit=${limit}`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

/** Record how related `user` found a link, 0-100. May trigger a background weight refit once enough ratings have accumulated. */
export async function submitRating(user: string, lid: string, rating: number): Promise<RatingResponse> {
  const res = await fetch(`${API_BASE_URL}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, lid, rating }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

export async function getUserWeights(user: string): Promise<UserWeightsResponse> {
  const res = await fetch(`${API_BASE_URL}/weights/${encodeURIComponent(user)}`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  const data = await res.json();
  cacheWeights(data);
  return data;
}

export async function getSettings(): Promise<NautilusSettings> {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

export async function updateSettings(patch: Partial<NautilusSettings>): Promise<NautilusSettings> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
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
