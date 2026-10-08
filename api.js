import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";


const host = Constants.expoConfig?.hostUri?.split(":")[0];
export const SERVER_URL = `http://${host ?? "192.168.100.15"}:5000`; // no /api
const BASE_URL = `${SERVER_URL}/api`;

// Turns "/uploads/abc.jpg" into a full URL the phone can load.
export function resolveUrl(path) {
  if (!path) return null;
  if (/^(https?:|file:|data:)/.test(path)) return path;
  return `${SERVER_URL}${path}`;
}

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

export function getMe() {
  return getMyProfile();
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

export function changePassword({ currentPassword, newPassword }) {
  return request("/users/me/password", {
    method: "PATCH",
    auth: true,
    body: { currentPassword, newPassword },
  });
}

// Uploads a picked image to the server and returns its public URL.
export async function uploadPhoto(uri) {
  const blob = await (await fetch(uri)).blob();

  const form = new FormData();
  form.append("photo", blob, "photo.jpg");

  const token = await getToken();
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type here
    body: form,
  });

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    throw new Error(data.message || `Upload failed (${res.status}): ${text.slice(0, 120)}`);
  }
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

// Extra band info (type, secondary genres, event types, songs...) — leader saves it after creating the band
export function saveBandDetails(details) {
  return request("/band-details/me", { method: "PUT", auth: true, body: details });
}

// Full band profile for the View Profile screen
export function getBandProfile(id) {
  return request(`/band-details/${id}`);
}

// --- Band applications ---
// Musician applies to a band
export function applyToBand({ bandId, message }) {
  return request("/applications", { method: "POST", auth: true, body: { bandId, message } });
}

// The logged-in musician's own applications
export function getMyApplications() {
  return request("/applications/mine", { auth: true });
}

// Applications sent to the logged-in user's band (band leader)
export function getReceivedApplications() {
  return request("/applications/received", { auth: true });
}

// Band leader accepts or rejects: status is "accepted" or "rejected"
export function respondToApplication(id, status) {
  return request(`/applications/${id}`, { method: "PATCH", auth: true, body: { status } });
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