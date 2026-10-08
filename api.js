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
    // Show the start of what the server really sent (e.g. the crash text of a 500)
    const snippet = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    throw new Error(
      `Server returned an unexpected response (${res.status}). ${
        snippet || "Is the server updated and restarted?"
      }`
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

// --- Band members (band leader) ---
export function getBandMembers() {
  return request("/applications/members", { auth: true });
}

// Kick a member out of the band. `applicationId` comes from getBandMembers().
export function removeBandMember(applicationId) {
  return request(`/applications/members/${applicationId}`, { method: "DELETE", auth: true });
}

// --- Gig applications ---
// Musician applies to a gig
export function applyToGig({ gigId, message }) {
  return request("/gig-applications", { method: "POST", auth: true, body: { gigId, message } });
}

// The logged-in musician's own applications (status per gig)
export function getMyGigApplications() {
  return request("/gig-applications/mine", { auth: true });
}

// Applications sent to gigs the logged-in user posted (client review)
export function getReceivedGigApplications() {
  return request("/gig-applications/received", { auth: true });
}

// Gig poster accepts or rejects: status is "accepted" or "rejected"
export function respondToGigApplication(id, status) {
  return request(`/gig-applications/${id}`, { method: "PATCH", auth: true, body: { status } });
}

// --- Ratings ---
// Rate a performer after they played your gig (1-5 stars + optional comment)
export function createRating({ applicationId, stars, comment }) {
  return request("/ratings", {
    method: "POST",
    auth: true,
    body: { applicationId, stars, comment },
  });
}

// Ratings the logged-in user gave (so the review screen can show "Rated ✓")
export function getGivenRatings() {
  return request("/ratings/given", { auth: true });
}

// Ratings the logged-in user received, with { average, count, ratings: [...] }
export function getReceivedRatings() {
  return request("/ratings/received", { auth: true });
}

// Public { average, count } for any user — shown on profile pages
export function getUserRatingSummary(userId) {
  return request(`/ratings/user/${userId}`, { auth: true });
}

// --- Notifications ---
export function getNotifications() {
  return request("/notifications", { auth: true });
}

export function deleteNotification(id) {
  return request(`/notifications/${id}`, { method: "DELETE", auth: true });
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "PATCH", auth: true });
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "PATCH", auth: true });
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