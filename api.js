import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";


const host = Constants.expoConfig?.hostUri?.split(":")[0];
export const SERVER_URL = `http://${host ?? "192.168.100.15"}:5000`; // no /api
const BASE_URL = `${SERVER_URL}/api`;

// Turns "/uploads/abc.jpg" into a full URL the phone can load.
// Stored photo URLs bake in whatever LAN IP existed at upload time
// (e.g. http://192.168.1.35:5000/uploads/x.jpg), which breaks the moment the
// machine's IP changes — so ANY /uploads/ URL is rebuilt on the CURRENT host.
export function resolveUrl(path) {
  if (!path || typeof path !== "string") return null;
  const upload = path.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/[^?#]+)(\?.*)?$/i);
  if (upload) return `${SERVER_URL}${upload[1]}${upload[2] || ""}`;
  if (/^(https?:|file:|data:|content:)/.test(path)) return path;
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
  // A pre-filled http(s) photo URL (e.g. edit screens where the user didn't
  // change the picture) — nothing to upload, keep it as-is.
  if (/^https?:\/\//.test(uri)) return uri;

  const ext = (uri.split("?")[0].split(".").pop() || "jpg").toLowerCase();
  const name = `photo.${ext === "jpeg" ? "jpg" : ext}`;
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "heic" || ext === "heif"
          ? "image/heic"
          : "image/jpeg";

  const form = new FormData();

  if (Platform.OS === "web") {
    // Web has to read the file into a Blob first. Some devices answer a
    // fetch of a gone file with a tiny "File not found" text body instead
    // of throwing — never upload that.
    let res;
    try {
      res = await fetch(uri);
    } catch {
      throw new Error("Couldn't read the selected photo. Please pick it again.");
    }
    if (res && res.ok === false) {
      throw new Error("Couldn't read the selected photo (it may have been moved). Please pick it again.");
    }
    const blob = await res.blob();
    if (!blob || !blob.size || blob.size < 100) {
      throw new Error("The selected photo came through empty. Please pick it again.");
    }
    form.append("photo", blob, name);
  } else if (typeof form.entries === "function") {
    // Expo SDK 57's fetch (the "winter" fetch) serializes FormData in JS and
    // REJECTS React Native's { uri } file parts with
    // "Unsupported FormDataPart implementation" — that's what used to kill
    // step 3 of the profile setup. Send the file's real bytes instead
    // (the { bytes(), name, type } shape Expo documents for it).
    let bytes;
    try {
      const { File } = await import("expo-file-system");
      bytes = await new File(uri).bytes();
    } catch {
      throw new Error("Couldn't read the selected photo. Please pick it again.");
    }
    if (!bytes || bytes.length < 100) {
      throw new Error("The selected photo came through empty. Please pick it again.");
    }
    form.append("photo", { bytes: async () => bytes, name, type });
  } else {
    // Runtimes still on React Native's own XHR fetch stream the picked
    // file straight from its uri.
    form.append("photo", { uri, name, type });
  }

  const token = await getToken();
  const uploadRes = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type here
    body: form,
  });

  const text = await uploadRes.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!uploadRes.ok) {
    throw new Error(data.message || `Upload failed (${uploadRes.status}): ${text.slice(0, 120)}`);
  }
  if (!data.url) {
    throw new Error("The upload didn't return a photo URL. Please try again.");
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

// Leader edits their own band (photo, name, bio, location, primary genres)
export function updateMyBand(fields) {
  return request("/bands/me", { method: "PUT", auth: true, body: fields });
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

// Band leader hires a solo musician: sends an invitation they can accept/reject
export function inviteMusician({ userId, message }) {
  return request("/applications/invite", { method: "POST", auth: true, body: { userId, message } });
}

// Invitations sent to ME by band leaders (with band + leader info)
export function getMyInvitations() {
  return request("/applications/invites", { auth: true });
}

// Musician leaves the band they're a member of
export function leaveBand() {
  return request("/applications/leave", { method: "POST", auth: true });
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

// Gig poster accepts or rejects: status is "accepted" or "rejected".
// Accepting BOOKS the gig: the gig leaves Discover and every other
// application is auto-closed (server returns 409 if it was already filled).
export function respondToGigApplication(id, status) {
  return request(`/gig-applications/${id}`, { method: "PATCH", auth: true, body: { status } });
}

// Accepted bookings for the band dashboard: mine + (if I'm a member) my band's
export function getBookings() {
  return request("/gig-applications/bookings", { auth: true });
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
// Only open gigs are listed — plus the caller's own gigs in any status
// (booked / cancelled / completed), so "My gigs" stays complete.
// poster = "band" → only OPEN gigs posted by band owners (client Discover).
export function getGigs(poster) {
  return request(`/gigs${poster ? `?poster=${encodeURIComponent(poster)}` : ""}`, {
    auth: true,
  });
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

// Cancel an open gig, or a booking (client cancels / band backs out).
// The booking falls apart → the gig returns to Discover.
export function cancelGig(id, reason) {
  return request(`/gigs/${id}/cancel`, { method: "PATCH", auth: true, body: { reason } });
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