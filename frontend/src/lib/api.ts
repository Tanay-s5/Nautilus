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
  top3_fields: string[];
  short_label: string;
  reason: string;
}

export interface GenerateCardResponse {
  card: StoredCard;
  links: LinkRecord[];
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

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

export async function getAllCards(): Promise<StoredCard[]> {
  const res = await fetch(`${API_BASE_URL}/cards`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res), res.status);
  return res.json();
}

export async function getAllLinks(): Promise<LinkRecord[]> {
  const res = await fetch(`${API_BASE_URL}/links`);
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
