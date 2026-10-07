import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const BASE_URL = `http://${host ?? "192.168.100.15"}:5000/api`;

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
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned an unexpected response (${res.status}). Is the server updated and restarted?`
    );
  }

  if (!res.ok) {
    // Keep the server's "field" so the screen can show the error under the right input.
    const e = new Error(data.message || "Something went wrong");
    e.field = data.field;
    throw e;
  }

  return data;
}

// --- Auth ---
export function signup({ name, email, phone, password, role }) {
  return request("/auth/signup", {
    method: "POST",
    body: { name, email, phone, password, role },
  });
}

export function login({ email, password }) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

export function updateMyRole(role) {
  return request("/users/me/role", { method: "PATCH", auth: true, body: { role } });
}

// --- Users / profiles ---
export function getMyProfile() {
  return request("/users/me", { auth: true });
}

export function updateMyProfile(profile) {
  return request("/users/me", { method: "PATCH", auth: true, body: profile });
}

export function getMusicianById(id) {
  return request(`/users/${id}`, { auth: true });
}

export function getMusicians() {
  return request("/users/musicians", { auth: true });
}

// Uploads a picked image to the server and returns its public URL.
export async function uploadPhoto(uri) {
  const form = new FormData();

  if (Platform.OS === "web") {
    // On web the picker gives a blob: URL, so fetch it and send the real file
    const blob = await (await fetch(uri)).blob();
    form.append("photo", blob, "photo.jpg");
  } else {
    const name = uri.split("/").pop() || "photo.jpg";
    const ext = (/\.(\w+)$/.exec(name)?.[1] || "jpg").toLowerCase();
    form.append("photo", {
      uri,
      name,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
    });
  }

  const token = await getToken();
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type here
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.url;
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

export function getConversation(otherUserId) {
  return request(`/messages/${otherUserId}`, { auth: true });
}

export function sendMessage({ receiverId, content }) {
  return request("/messages", { method: "POST", auth: true, body: { receiverId, content } });
}