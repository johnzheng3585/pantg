import type { LoginResponse, TokenPair, User } from "@/lib/api/types";

const TOKEN_KEY = "cloudreve.v4.token";
const USER_KEY = "cloudreve.v4.user";

export function isBrowser() {
  return typeof window !== "undefined";
}

function readStorage(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Some embedded browsers can disable localStorage. Keep the app usable in-memory.
  }
}

function removeStorage(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures; event dispatch below still updates the UI.
  }
}

export function getTokenPair(): TokenPair | null {
  const raw = readStorage(TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TokenPair;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getTokenPair()?.access_token ?? null;
}

export function getRefreshToken() {
  return getTokenPair()?.refresh_token ?? null;
}

export function getStoredUser(): User | null {
  const raw = readStorage(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(session: LoginResponse) {
  if (!isBrowser()) {
    return;
  }

  writeStorage(TOKEN_KEY, JSON.stringify(session.token));
  writeStorage(USER_KEY, JSON.stringify(session.user));
  window.dispatchEvent(new CustomEvent("cloudreve:session", { detail: session }));
}

export function setTokenPair(token: TokenPair) {
  if (!isBrowser()) {
    return;
  }

  writeStorage(TOKEN_KEY, JSON.stringify(token));
  window.dispatchEvent(new CustomEvent("cloudreve:token", { detail: token }));
}

export function setStoredUser(user: User) {
  if (!isBrowser()) {
    return;
  }

  writeStorage(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("cloudreve:user", { detail: user }));
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }

  removeStorage(TOKEN_KEY);
  removeStorage(USER_KEY);
  window.dispatchEvent(new CustomEvent("cloudreve:logout"));
}
