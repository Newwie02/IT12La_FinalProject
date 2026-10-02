import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000/api"
    : "http://192.168.254.108:5000/api";

    
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// --- Auth ---
export function signup({ name, email, password, role }) {
  return request("/auth/signup", { method: "POST", body: { name, email, password, role } });
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