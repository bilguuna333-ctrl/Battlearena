// Lightweight fetch helper for endpoints not covered by the auto-generated client.
// Mirrors the behaviour of `customFetch` in `@workspace/api-client-react`.

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getBaseUrl(): string {
  if (typeof window === "undefined") return API_BASE_URL;
  return (
    (window as any).__API_BASE_URL__ ||
    API_BASE_URL
  );
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("codesteppe_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const auth = getAuthHeader();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(typeof msg === "string" ? msg : "Алдаа гарлаа");
  }
  return data as T;
}

// Battle invitation helpers
export type InvitationUser = {
  id: number;
  username: string;
  displayName: string;
  avatarSeed: string | null;
  eloRating: number;
  rank: string;
};

export type Invitation = {
  id: string;
  mode: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  battleId: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  from: InvitationUser | null;
  to: InvitationUser | null;
};

export type InvitationsResponse = {
  incoming: Invitation[];
  outgoing: Invitation[];
};

export const invitationsApi = {
  invite: (username: string, mode: string = "ranked") =>
    apiRequest<Invitation>("/api/battles/invite", {
      method: "POST",
      body: JSON.stringify({ username, mode }),
    }),
  list: () => apiRequest<InvitationsResponse>("/api/battles/invitations"),
  accept: (id: string) =>
    apiRequest<{ battleId: string; invitation: Invitation }>(
      `/api/battles/invitations/${id}/accept`,
      { method: "POST" },
    ),
  decline: (id: string) =>
    apiRequest<Invitation>(`/api/battles/invitations/${id}/decline`, {
      method: "POST",
    }),
  cancel: (id: string) =>
    apiRequest<Invitation>(`/api/battles/invitations/${id}/cancel`, {
      method: "POST",
    }),
};

// Lobby helpers
export type LobbyMember = {
  userId: number;
  username: string;
  displayName: string;
  avatarSeed: string | null;
  eloRating: number;
  rank: string;
  isHost: boolean;
  ready: boolean;
  joinedAt: string;
};

export type Lobby = {
  id: string;
  code: string;
  hostUserId: number;
  mode: string;
  maxPlayers: number;
  state: "open" | "starting" | "started" | "closed";
  battleId: string | null;
  createdAt: string;
  expiresAt: string;
  members: LobbyMember[];
};

export const lobbyApi = {
  create: (mode: string = "normal", maxPlayers: number = 2) =>
    apiRequest<Lobby>("/api/lobbies", {
      method: "POST",
      body: JSON.stringify({ mode, maxPlayers }),
    }),
  mine: () => apiRequest<{ lobby: Lobby | null }>("/api/lobbies/mine"),
  byCode: (code: string) =>
    apiRequest<Lobby>(`/api/lobbies/${encodeURIComponent(code)}`),
  join: (code: string) =>
    apiRequest<Lobby>(`/api/lobbies/${encodeURIComponent(code)}/join`, {
      method: "POST",
    }),
  leave: (id: string) =>
    apiRequest<{ ok: boolean; closed?: boolean } | Lobby>(
      `/api/lobbies/${id}/leave`,
      { method: "POST" },
    ),
  setReady: (id: string, ready: boolean) =>
    apiRequest<Lobby>(`/api/lobbies/${id}/ready`, {
      method: "POST",
      body: JSON.stringify({ ready }),
    }),
  start: (id: string) =>
    apiRequest<{ battleId: string }>(`/api/lobbies/${id}/start`, {
      method: "POST",
    }),
};
