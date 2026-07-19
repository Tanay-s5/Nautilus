import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface ChatSession {
  id: string;
  name: string;
  icon: string;
  canvas_id: string | null;
  created_at: string;
  updated_at: string;
}

const SESSIONS_KEY = "caveat-chat-sessions";
const SESSION_ID_KEY = "caveat-active-session";

function generateUUID(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function normalizeSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;

  const session = raw as Partial<ChatSession>;
  if (!session.id) return null;

  const now = new Date().toISOString();

  return {
    id: session.id,
    name: typeof session.name === "string" && session.name.trim() ? session.name.trim() : "New Canvas",
    icon: typeof session.icon === "string" && session.icon.trim() ? session.icon : "bx-bulb",
    canvas_id: typeof session.canvas_id === "string" && session.canvas_id.trim() ? session.canvas_id : generateUUID(),
    created_at: isValidIsoDate(session.created_at) ? session.created_at : now,
    updated_at: isValidIsoDate(session.updated_at) ? session.updated_at : now,
  };
}

function sortSessions(sessions: ChatSession[]) {
  return [...sessions].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

function normalizeSessions(rawSessions: unknown): ChatSession[] {
  if (!Array.isArray(rawSessions)) return [];

  const seen = new Set<string>();
  const normalized: ChatSession[] = [];

  rawSessions.forEach((entry) => {
    const session = normalizeSession(entry);
    if (!session || seen.has(session.id)) return;
    seen.add(session.id);
    normalized.push(session);
  });

  return sortSessions(normalized);
}

function loadSessionsFromStorage(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return normalizeSessions(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sortSessions(sessions)));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

function saveActiveSessionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(SESSION_ID_KEY, id);
    } else {
      localStorage.removeItem(SESSION_ID_KEY);
    }
  } catch {}
}

function createSessionSync(): ChatSession {
  const id = generateUUID();
  const canvasId = generateUUID();
  const now = new Date().toISOString();

  return {
    id,
    name: "New Canvas",
    icon: "bx-bulb",
    canvas_id: canvasId,
    created_at: now,
    updated_at: now,
  };
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessionsFromStorage());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveSessionId());
  const [isLoading] = useState(false);
  const lastCreatedRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const sessionsRef = useRef(sessions);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    saveSessionsToStorage(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setSessions((prev) => {
      const normalized = normalizeSessions(prev);
      if (normalized.length === 0) {
        const newSession = createSessionSync();
        setActiveSessionId(newSession.id);
        return [newSession];
      }

      const storedActiveId = loadActiveSessionId();
      if (!storedActiveId || !normalized.find((session) => session.id === storedActiveId)) {
        setActiveSessionId(normalized[0].id);
      }

      return normalized;
    });
  }, []);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    const now = Date.now();
    if (now - lastCreatedRef.current < 2000) {
      toast.info("Please wait before creating another canvas");
      return null;
    }

    lastCreatedRef.current = now;
    const newSession = createSessionSync();

    setSessions((prev) => sortSessions([newSession, ...prev]));
    setActiveSessionId(newSession.id);

    return newSession;
  }, []);

  const updateSessionName = useCallback(async (sessionId: string, name: string, icon?: string) => {
    const nextUpdatedAt = new Date().toISOString();

    setSessions((prev) =>
      sortSessions(
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                name: name.trim() || session.name,
                ...(icon ? { icon } : {}),
                updated_at: nextUpdatedAt,
              }
            : session
        )
      )
    );
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    const session = sessionsRef.current.find((item) => item.id === sessionId);

    if (session?.canvas_id) {
      localStorage.removeItem(`caveat-canvas-nodes-${session.canvas_id}`);
      localStorage.removeItem(`caveat-canvas-edges-${session.canvas_id}`);
    }

    setSessions((prev) => {
      const remaining = prev.filter((item) => item.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createSessionSync();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      return sortSessions(remaining);
    });

    setActiveSessionId((prevActiveId) => {
      if (prevActiveId !== sessionId) return prevActiveId;
      const remaining = sortSessions(sessionsRef.current.filter((item) => item.id !== sessionId));
      return remaining[0]?.id ?? null;
    });
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    if (!sessionsRef.current.some((session) => session.id === sessionId)) return;
    setActiveSessionId(sessionId);
  }, []);

  const activeSession = sessions.find((session) => session.id === activeSessionId) || null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    createSession,
    selectSession,
    updateSessionName,
    deleteSession,
    setActiveSessionId,
  };
}
