import { useSyncExternalStore } from "react";

export interface FavCompound {
  cid: number;
  title: string;
  formula: string;
  smiles: string;
}
export interface ReactionRecord {
  id: string;
  at: number;
  reactants: string[];
  equation: string;
  type: string;
}
export interface HistoryItem {
  cid: number;
  title: string;
  at: number;
}

interface State {
  favorites: FavCompound[];
  reactions: ReactionRecord[];
  history: HistoryItem[];
}

const KEY = "scv-store-v1";
const empty: State = { favorites: [], reactions: [], history: [] };
let state: State = empty;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    state = empty;
  }
}
function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}

export function useStore(): State {
  return useSyncExternalStore(
    (cb) => {
      load();
      subs.add(cb);
      cb();
      return () => subs.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

export const actions = {
  toggleFavorite(c: FavCompound) {
    load();
    const has = state.favorites.some((f) => f.cid === c.cid);
    set({ ...state, favorites: has ? state.favorites.filter((f) => f.cid !== c.cid) : [c, ...state.favorites] });
  },
  addHistory(h: Omit<HistoryItem, "at">) {
    load();
    set({ ...state, history: [{ ...h, at: Date.now() }, ...state.history.filter((x) => x.cid !== h.cid)].slice(0, 40) });
  },
  addReaction(r: Omit<ReactionRecord, "id" | "at">) {
    load();
    set({ ...state, reactions: [{ ...r, id: crypto.randomUUID(), at: Date.now() }, ...state.reactions].slice(0, 50) });
  },
  clear(key: keyof State) {
    load();
    set({ ...state, [key]: [] });
  },
};

/** Small localStorage JSON cache for expensive AI answers. */
export const cache = {
  get<T>(k: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const v = localStorage.getItem(`scv-cache:${k}`);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(`scv-cache:${k}`, JSON.stringify(v));
    } catch {
      /* quota */
    }
  },
};
