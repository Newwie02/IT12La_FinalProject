import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Where the API lives. Resolution order:
//   1. EXPO_PUBLIC_API_URL            (explicit override, e.g. in a .env file)
//   2. Metro's host for this session   (your machine's CURRENT LAN IP on a
//                                       real device running Expo Go)
//   3. localhost                       (web / simulator)
// The API port defaults to 8080 and can be changed with EXPO_PUBLIC_API_PORT.
// 8080 (not 5000) because that's the port this machine's firewall already lets through.
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "8080";

function isLoopback(host) {
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  );
}

function resolveBaseUrl() {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return String(override).replace(/\/+$/, "");

  if (Platform.OS === "web") {
    const webHost =
      typeof window !== "undefined" && window.location?.hostname
        ? window.location.hostname
        : "localhost";
    return `http://${webHost}:${API_PORT}/api`;
  }

  // hostUri is what Metro hands the device, e.g. "192.168.1.14:8081" —
  // i.e. the machine's LAN IP right now, whatever it happens to be.
  const hostUri = Constants.expoConfig?.hostUri || "";
  const host = String(hostUri).split("/")[0].split(":")[0];

  if (isLoopback(host)) {
    // `expo start --localhost`, or no Metro info (production build).
    return `http://localhost:${API_PORT}/api`;
  }

  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    // Tunnel/domain host (ngrok etc.) — only Metro's port is tunneled,
    // so the API's port won't be reachable through it.
    console.warn(
      `[api] Metro host "${host}" is not a LAN IP. Start Expo on your LAN ` +
        `network, or set EXPO_PUBLIC_API_URL=http://<machine-ip>:${API_PORT}/api`
    );
  }

  return `http://${host}:${API_PORT}/api`;
}

export const BASE_URL = resolveBaseUrl();

if (__DEV__) {
  console.log(`[api] Using ${BASE_URL}`);
}

<<<<<<< HEAD
const BASE_URL = "http://192.168.100.15:5000/api";
=======
>>>>>>> 5ca3bac166a17c9463faa8ab77275958a91c4fe5

// SecureStore doesn't work on web, so fall back to localStorage there.
export async function saveToken(token) {
  if (Platform.OS === "web") {
    localStorage.setItem("token", token);
  } else {
    await SecureStore.setItemAsync("token", token);
  }
}

export async function getToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  }
  return await SecureStore.getItemAsync("token");
}

export async function clearToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem("token");
  } else {
    await SecureStore.deleteItemAsync("token");
  }
}

// --- Core request helper ---
const REQUEST_TIMEOUT_MS = 10000;

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    });
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw new Error(`The API at ${BASE_URL} timed out. Is it still running? (pnpm server)`);
    }
    throw new Error(
      `Can't reach the API at ${BASE_URL} (${err && err.message ? err.message : "network error"}). ` +
        `Is the server running? Start it with: pnpm server`
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  // Read as text first so a non-JSON response (proxy error page, crash
  // dump, HTML 404) doesn't explode inside res.json().
  const text = await res.text().catch(() => "");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      (text ? text.slice(0, 160) : "") ||
      `Request failed (HTTP ${res.status}).`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (data === null) {
    throw new Error(`The API returned an unexpected (non-JSON) response for ${path}.`);
  }

  return data;
}

// --- Session ---
// Used instead of decoding the JWT in-app: Hermes has no `atob`, so the old
// base64 decode silently failed and messages.jsx never knew the local user.
export function getMe() {
  return request("/auth/me", { auth: true });
}

// Persists the choice made on the role-select screen.
export function updateMyRole(role) {
  return request("/users/me/role", { method: "PUT", auth: true, body: { role } });
}

// --- Auth ---
export function signup({ name, email, password, role, phone }) {
  return request("/auth/signup", {
    method: "POST",
    body: { name, email, password, role, phone },
  });
}

export function login({ email, password }) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

// --- Bands ---
export function getBands() {
  return request("/bands");
}

export function getBandById(id) {
  return request(`/bands/${id}`);
}

export function createBand({ name, genre, location, bio, photoUrl }) {
  return request("/bands", {
    method: "POST",
    auth: true,
    body: { name, genre, location, bio, photoUrl },
  });
}
export async function getMyBand() {
  try {
    return await request("/bands/me", { auth: true });
  } catch (err) {
    if (err.message === "No band yet") return null;
    throw err;
  }
}

// --- Gigs ---
export function getGigs() {
  return request("/gigs");
}

export function getGigById(id) {
  return request(`/gigs/${id}`);
}

export function createGig({ title, description, location, date, pay }) {
  return request("/gigs", {
    method: "POST",
    auth: true,
    body: { title, description, location, date, pay },
  });
}

// --- Messages ---
export function getConversations() {
  return request("/messages", { auth: true });
}

// --- Users ---
export function getMusicians() {
  return request("/users/musicians", { auth: true });
}

export function getConversation(otherUserId) {
  return request(`/messages/${otherUserId}`, { auth: true });
}

export function sendMessage({ receiverId, content }) {
  return request("/messages", { method: "POST", auth: true, body: { receiverId, content } });
}